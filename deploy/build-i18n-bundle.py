#!/usr/bin/env python3
"""Create an isolated, versioned UI bundle for the existing c139e98 deployment."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
baseline = json.loads((root/'deploy/i18n-base.json').read_text())
files = ['index.html','app.css','app.mjs','features.mjs','plan-studio.mjs','i18n.mjs','i18n-messages.mjs']
version = hashlib.sha256(b''.join((root/'public'/name).read_bytes() for name in files)).hexdigest()[:12]
output = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'artifacts/tsuull-i18n-update.zip'
output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    stage = Path(tmp)
    manifest = {'base_commit':'c139e98','version':version,'files':{}}
    for name in files:
        data = (root/'public'/name).read_bytes()
        if name.endswith(('.mjs','.html')):
            # All local ES imports and HTML entry assets share a release version.
            text = data.decode()
            text = re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''', lambda m:m[1]+m[2]+'?v='+version+m[1],text)
            data = text.encode()
        relative = 'public/'+name
        destination = stage/'payload'/relative
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(data)
        manifest['files'][relative] = {'sha256':hashlib.sha256(data).hexdigest(),'base_sha256':baseline.get(relative)}
    (stage/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    shutil.copy2(root/'deploy/install-i18n.py',stage/'install.py')
    shutil.copy2(root/'docs/12-TILLAR.md',stage/'README.md')
    shutil.copy2(root/'deploy/apply-i18n.sh',stage/'update-app.sh')
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(stage.rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(stage))
print('Paket:', output)
print('Versiya:', version)
print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())
