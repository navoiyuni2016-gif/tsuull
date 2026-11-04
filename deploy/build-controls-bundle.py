#!/usr/bin/env python3
"""Build a preserving v7 plan comparison and schedule-control update over v6."""
import difflib,hashlib,json,re,subprocess,zipfile
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('installer',root/'deploy/install-management.py');installer=module_from_spec(spec);spec.loader.exec_module(installer)
front=installer.FRONTEND|{'public/modules.mjs','public/academic-controls.mjs','public/academic-controls.css'}
patches={'server/app.mjs','server/extensions.mjs'}
existing={'server/planning.mjs','server/plan-studio.mjs','server/academic-service.mjs','server/print-document.mjs','server/calculation-history.mjs','server/report-export.mjs'}
new={'server/academic-controls.mjs','server/plan-comparison.mjs','server/schedule-calculation.mjs'}
files=sorted(front|patches|existing|new)
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda name:subprocess.check_output(['git','show','bc047f8:'+name],cwd=root)
version=sha(b''.join((root/n).read_bytes() for n in files))[:12]
base={}
with zipfile.ZipFile(root/'updates/tsuull-export-v6.zip') as z:
    manifest=json.loads(z.read('manifest.json'))
    for name in files:
        if name in manifest['files']:
            data=z.read('payload/'+name)
            if sha(data)!=manifest['files'][name]['sha256']:raise ValueError('v6 checksum mismatch: '+name)
            base[name]=data
for name in ['public/modules.mjs',*patches,*existing]:
    if name not in base:base[name]=git(name)
source=(root/'deploy/install-management.py').read_text()
start=source.index('FRONTEND=');end=source.index('\ndef digest',start)
source=source[:start]+'FRONTEND=set('+repr(sorted(front))+')\nPATCHES=set('+repr(sorted(patches))+')\nNEW=set('+repr(sorted(existing|new))+')\nALLOWED=FRONTEND|PATCHES|NEW'+source[end:]
source=source.replace('management-upgrade-','controls-upgrade-').replace('preserving management bundle','preserving academic controls bundle')
manifest={'format':1,'version':version,'files':{}};payload={}
for name in files:
    data=(root/name).read_bytes()
    if name in patches:
        old=base[name].decode();current=data.decode();a=old.splitlines(keepends=True);b=current.splitlines(keepends=True);ops=[]
        for tag,i,j,k,l in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes():
            if tag=='equal':continue
            before=''.join(a[i:j]);after=''.join(b[k:l])
            if not before:
                if i<len(a):before=a[i];after+=a[i]
                else:before=''.join(a[max(0,i-3):i]);after=before+after
            end=j if j>i else i+1
            while old.count(before)>1 and end<len(a):
                before+=a[end];after+=a[end];end+=1
            if old.count(before)!=1:raise ValueError('Nonunique anchor: '+name)
            ops.append({'old':before,'new':after})
        check=old
        for op in ops:check=check.replace(op['old'],op['new'],1)
        if check!=current:raise ValueError('Patch composition mismatch: '+name)
        manifest['files'][name]={'kind':'patch','operations':ops}
    else:
        if name in front and name.endswith(('.mjs','.html')):
            data=re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''',lambda m:m[1]+m[2]+'?v='+version+m[1],data.decode()).encode()
        old=base.get(name);base_hash=sha(installer.normalized(old)) if old is not None and name in front else sha(old) if old is not None else None
        manifest['files'][name]={'kind':'replace','sha256':sha(data),'bases':[base_hash]}
        payload['payload/'+name]=data
runner=(root/'deploy/update-pdf.py').read_text().replace('pdf-','controls-').replace('PDF shabloni','Reja taqqoslash va jadval nazorati').replace('PDF template over v4','academic controls over v6')
payload.update({'manifest.json':json.dumps(manifest,ensure_ascii=False,indent=2).encode(),'install.py':source.encode(),'update.py':runner.encode(),'README.md':(root/'docs/24-REJA-VA-JADVAL-NAZORATI.md').read_bytes(),'update-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" "$@"\n','rollback-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" --rollback "$@"\n'})
output=root/'updates/tsuull-controls-v7.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in sorted(payload.items()):
        info=zipfile.ZipInfo(name,date_time=(2026,11,4,0,0,0));info.external_attr=0o100644<<16
        z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED)
output.with_suffix('.zip.sha256').write_text(sha(output.read_bytes())+'  '+output.name+'\n')
print('Controls bundle:',output,'\nVersion:',version,'\nSHA256:',sha(output.read_bytes()))
