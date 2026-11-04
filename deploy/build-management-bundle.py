#!/usr/bin/env python3
"""Build one preserving update over known ERP language/appearance releases."""
import difflib
import hashlib
from importlib.util import spec_from_file_location,module_from_spec
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('installer',root/'deploy/install-management.py');module=module_from_spec(spec);spec.loader.exec_module(module)
sha=module.digest
def git(name):return subprocess.check_output(['git','show','0c534bb:'+name],cwd=root)
files=sorted(module.ALLOWED)
version=sha(b''.join((root/n).read_bytes() for n in files))[:12]
originals=set(subprocess.check_output(['git','ls-tree','-r','--name-only','c139e98'],cwd=root,text=True).splitlines())
baselines=[{n:subprocess.check_output(['git','show','c139e98:'+n],cwd=root) for n in module.FRONTEND if n in originals}]
resolved={}
for name in ['tsuull-i18n-update.zip','tsuull-i18n-labels-v2.zip','tsuull-interface-v3.zip']:
    with zipfile.ZipFile(root/'updates'/name) as z:
        m=json.loads(z.read('manifest.json'));parents=m['base_commit'].split('+')
        base=dict(next((resolved[p] for p in reversed(parents) if p in resolved),baselines[0]))
        for n,info in m['files'].items():
            data=z.read('payload/'+n)
            if sha(data)!=info['sha256']:raise ValueError('Old bundle checksum: '+name)
            base[n]=data
        resolved[m['version']]=base;baselines.append(base)
manifest={'format':1,'version':version,'files':{}}
with tempfile.TemporaryDirectory() as tmp:
    stage=Path(tmp)
    for name in files:
        data=(root/name).read_bytes()
        if name in module.PATCHES:
            old=git(name).decode();new=data.decode();a=old.splitlines(keepends=True);b=new.splitlines(keepends=True);ops=[]
            for tag,i,j,k,l in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes():
                if tag=='equal':continue
                before=''.join(a[i:j]);after=''.join(b[k:l])
                if not before:
                    if i<len(a):before=a[i];after+=a[i]
                    else:before=''.join(a[max(0,i-3):i]);after=before+after
                if old.count(before)!=1:raise ValueError('Nonunique patch anchor: '+name)
                ops.append({'old':before,'new':after})
            if not ops:raise ValueError('Missing patch operations: '+name)
            check=old
            for op in ops:check=check.replace(op['old'],op['new'],1)
            if check!=new:raise ValueError('Patch composition mismatch: '+name)
            manifest['files'][name]={'kind':'patch','operations':ops}
        else:
            if name in module.FRONTEND and name.endswith(('.mjs','.html')):
                data=re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''',lambda m:m[1]+m[2]+'?v='+version+m[1],data.decode()).encode()
            target=stage/'payload'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
            candidates=list(dict.fromkeys(sha(module.normalized(p[name])) if name in p else None for p in baselines)) if name in module.FRONTEND else [None]
            manifest['files'][name]={'kind':'replace','sha256':sha(data),'bases':candidates}
    (stage/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    for source,destination in [('deploy/install-management.py','install.py'),('deploy/update-management.py','update.py'),('docs/21-BOSHQARUV-YANGILANISHI.md','README.md')]:shutil.copy2(root/source,stage/destination)
    (stage/'update-app.sh').write_text('#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" "$@"\n')
    (stage/'rollback-app.sh').write_text('#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" --rollback "$@"\n')
    output=root/'updates/tsuull-management-v4.zip'
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(stage.rglob('*')):
            if p.is_file():
                info=zipfile.ZipInfo(str(p.relative_to(stage)),date_time=(2026,11,4,0,0,0));info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED)
    checksum=sha(output.read_bytes());output.with_suffix('.zip.sha256').write_text(checksum+'  '+output.name+'\n')
    print('Version:',version,'\nSHA256:',checksum,'\nBundle:',output)
