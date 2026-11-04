#!/usr/bin/env python3
"""Create a verified export update compatible with both v4 and v5."""
import hashlib
from importlib.util import spec_from_file_location,module_from_spec
import json
from pathlib import Path
import re,tempfile,zipfile
root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('installer',root/'deploy/install-management.py');installer=module_from_spec(spec);spec.loader.exec_module(installer)
front=installer.FRONTEND
existing={'server/calculation-history.mjs','server/report-export.mjs'}
new={'server/print-document.mjs'}
files=sorted(front|existing|new)
sha=lambda b:hashlib.sha256(b).hexdigest()
version=sha(b''.join((root/n).read_bytes() for n in files))[:12]
baselines=[]
for archive in ['tsuull-management-v4.zip','tsuull-pdf-v5.zip']:
    with zipfile.ZipFile(root/'updates'/archive) as z:
        oldmanifest=json.loads(z.read('manifest.json'));base={}
        for name in files:
            if name not in oldmanifest['files']:continue
            data=z.read('payload/'+name)
            if sha(data)!=oldmanifest['files'][name]['sha256']:raise ValueError('Base checksum mismatch: '+name)
            base[name]=data
        baselines.append(base)
source=(root/'deploy/install-management.py').read_text()
start=source.index('FRONTEND=');end=source.index('\ndef digest',start)
source=source[:start]+'FRONTEND=set('+repr(sorted(front))+')\nPATCHES=set()\nNEW=set('+repr(sorted(existing|new))+')\nALLOWED=FRONTEND|NEW'+source[end:]
source=source.replace('management-upgrade-','export-upgrade-').replace('preserving management bundle','preserving export bundle')
source=source.replace('Excel yordamchisi, Caddy, .env va mavjud yozuvlar saqlanadi.','Eksport ko‘rinishi yangilanadi; Excel yordamchisi, Caddy, .env va mavjud yozuvlar saqlanadi.')
manifest={'format':1,'version':version,'files':{}}
payload={}
for name in files:
    data=(root/name).read_bytes()
    if name in front and name.endswith(('.mjs','.html')):
        data=re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''',lambda m:m[1]+m[2]+'?v='+version+m[1],data.decode()).encode()
    candidates=[]
    for base in baselines:
        old=base.get(name)
        digest=sha(installer.normalized(old)) if old is not None and name in front else sha(old) if old is not None else None
        if digest not in candidates:candidates.append(digest)
    manifest['files'][name]={'kind':'replace','sha256':sha(data),'bases':candidates}
    payload['payload/'+name]=data
payload.update({'manifest.json':json.dumps(manifest,ensure_ascii=False,indent=2).encode(),'install.py':source.encode(),'update.py':(root/'deploy/update-pdf.py').read_text().replace('pdf-','export-').replace('PDF shabloni','Eksport yangilanishi').replace('PDF template over v4','CSV/PDF export update over v4/v5').encode(),'README.md':(root/'docs/23-CSV-EKSPORT.md').read_bytes(),'update-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" "$@"\n','rollback-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" --rollback "$@"\n'})
output=root/'updates/tsuull-export-v6.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in sorted(payload.items()):
        info=zipfile.ZipInfo(name,date_time=(2026,11,4,0,0,0));info.external_attr=0o100644<<16
        z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED)
output.with_suffix('.zip.sha256').write_text(sha(output.read_bytes())+'  '+output.name+'\n')
print('Export bundle:',output,'\nVersion:',version,'\nSHA256:',sha(output.read_bytes()))
