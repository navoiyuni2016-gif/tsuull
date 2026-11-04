#!/usr/bin/env python3
"""Create a verified v5 PDF-only update over the installed v4 management release."""
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
with zipfile.ZipFile(root/'updates/tsuull-management-v4.zip') as z:
    oldmanifest=json.loads(z.read('manifest.json'));base={}
    for name in front|existing:
        data=z.read('payload/'+name)
        if sha(data)!=oldmanifest['files'][name]['sha256']:raise ValueError('v4 checksum mismatch: '+name)
        base[name]=data
source=(root/'deploy/install-management.py').read_text()
start=source.index('FRONTEND=');end=source.index('\ndef digest',start)
source=source[:start]+'FRONTEND=set('+repr(sorted(front))+')\nPATCHES=set()\nNEW=set('+repr(sorted(existing|new))+')\nALLOWED=FRONTEND|NEW'+source[end:]
source=source.replace('management-upgrade-','pdf-upgrade-').replace('preserving management bundle','preserving PDF bundle')
source=source.replace('Excel yordamchisi, Caddy, .env va mavjud yozuvlar saqlanadi.','PDF ko‘rinishi yangilanadi; Excel yordamchisi, Caddy, .env va mavjud yozuvlar saqlanadi.')
manifest={'format':1,'version':version,'files':{}}
payload={}
for name in files:
    data=(root/name).read_bytes()
    if name in front and name.endswith(('.mjs','.html')):
        data=re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''',lambda m:m[1]+m[2]+'?v='+version+m[1],data.decode()).encode()
    old=base.get(name)
    digest=sha(installer.normalized(old)) if old is not None and name in front else sha(old) if old is not None else None
    manifest['files'][name]={'kind':'replace','sha256':sha(data),'bases':[digest]}
    payload['payload/'+name]=data
payload.update({'manifest.json':json.dumps(manifest,ensure_ascii=False,indent=2).encode(),'install.py':source.encode(),'update.py':(root/'deploy/update-pdf.py').read_bytes(),'README.md':(root/'docs/22-PDF-SHABLON.md').read_bytes(),'update-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" "$@"\n','rollback-app.sh':b'#!/usr/bin/env bash\nset -euo pipefail\npython3 "$(dirname -- "$0")/update.py" --rollback "$@"\n'})
output=root/'updates/tsuull-pdf-v5.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in sorted(payload.items()):
        info=zipfile.ZipInfo(name,date_time=(2026,11,4,0,0,0));info.external_attr=0o100644<<16
        z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED)
output.with_suffix('.zip.sha256').write_text(sha(output.read_bytes())+'  '+output.name+'\n')
print('PDF bundle:',output,'\nVersion:',version,'\nSHA256:',sha(output.read_bytes()))
