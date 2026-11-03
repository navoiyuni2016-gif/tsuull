#!/usr/bin/env python3
"""Create a verified, versioned full or incremental frontend update bundle."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
import zipfile
from importlib.util import spec_from_file_location, module_from_spec

root = Path(__file__).resolve().parents[1]
baseline = json.loads((root/'deploy/i18n-base.json').read_text())
files = ['index.html','app.css','app.mjs','features.mjs','plan-studio.mjs','i18n.mjs','i18n-messages.mjs']
version = hashlib.sha256(b''.join((root/'public'/name).read_bytes() for name in files)).hexdigest()[:12]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', nargs='?', type=Path, default=root/'artifacts/tsuull-i18n-update.zip')
parser.add_argument('--base-bundle', type=Path, help='Build an incremental update over a previously installed bundle')
args = parser.parse_args()
output = args.output.resolve()
base_payload = {}
base_commit = 'c139e98'
if args.base_bundle:
    loader = spec_from_file_location('i18n_installer',root/'deploy/install-i18n.py')
    installer = module_from_spec(loader)
    loader.loader.exec_module(installer)
    with zipfile.ZipFile(args.base_bundle) as previous:
        old_manifest = json.loads(previous.read('manifest.json'))
        base_commit = old_manifest['version']
        for name in old_manifest['files']:
            data = previous.read('payload/'+name)
            if hashlib.sha256(data).hexdigest()!=old_manifest['files'][name]['sha256']:
                raise SystemExit('Oldingi paket hash tekshiruvi o‘tmadi: '+name)
            base_payload[name] = data
            baseline[name] = hashlib.sha256(installer.without_asset_versions(data)).hexdigest()
output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    stage = Path(tmp)
    manifest = {'base_commit':base_commit,'version':version,'files':{}}
    for name in files:
        data = (root/'public'/name).read_bytes()
        if name.endswith(('.mjs','.html')):
            # All local ES imports and HTML entry assets share a release version.
            text = data.decode()
            text = re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''', lambda m:m[1]+m[2]+'?v='+version+m[1],text)
            data = text.encode()
        relative = 'public/'+name
        if base_payload.get(relative) == data:
            continue
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
