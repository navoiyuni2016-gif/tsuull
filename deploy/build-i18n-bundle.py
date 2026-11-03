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
files = ['index.html','app.css','app.mjs','features.mjs','plan-studio.mjs','i18n.mjs','i18n-messages.mjs','appearance.mjs','appearance.css']
version = hashlib.sha256(b''.join((root/'public'/name).read_bytes() for name in files)).hexdigest()[:12]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', nargs='?', type=Path, default=root/'artifacts/tsuull-i18n-update.zip')
parser.add_argument('--base-bundle', type=Path, action='append', help='Build an incremental update over a previously installed bundle')
args = parser.parse_args()
output = args.output.resolve()
base_payloads = []
base_commit = 'c139e98'
if args.base_bundle:
    loader = spec_from_file_location('i18n_installer',root/'deploy/install-i18n.py')
    installer = module_from_spec(loader)
    loader.loader.exec_module(installer)
    versions = []
    resolved_payloads = {}
    for bundle in args.base_bundle:
        payload = {}
        with zipfile.ZipFile(bundle) as previous:
            old_manifest = json.loads(previous.read('manifest.json'))
            parent = old_manifest.get('base_commit','c139e98')
            if parent in resolved_payloads:
                payload.update(resolved_payloads[parent])
            elif parent != 'c139e98':
                raise SystemExit('Avval asosiy paketni --base-bundle bilan ko‘rsating: '+parent)
            versions.append(old_manifest['version'])
            for name in old_manifest['files']:
                data = previous.read('payload/'+name)
                if hashlib.sha256(data).hexdigest()!=old_manifest['files'][name]['sha256']:
                    raise SystemExit('Oldingi paket hash tekshiruvi o‘tmadi: '+name)
                payload[name] = data
        resolved_payloads[old_manifest['version']] = payload
        base_payloads.append(payload)
    base_commit = '+'.join(versions)
    for name in ['public/'+f for f in files]:
        candidates = list(dict.fromkeys(hashlib.sha256(installer.without_asset_versions(p[name])).hexdigest() if name in p else None for p in base_payloads))
        baseline[name] = candidates[0] if len(candidates)==1 else candidates
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
        if base_payloads and all(p.get(relative) == data for p in base_payloads):
            continue
        destination = stage/'payload'/relative
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(data)
        manifest['files'][relative] = {'sha256':hashlib.sha256(data).hexdigest(),'base_sha256':baseline.get(relative)}
    (stage/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    shutil.copy2(root/'deploy/install-i18n.py',stage/'install.py')
    shutil.copy2(root/'docs/12-TILLAR.md',stage/'README.md')
    shutil.copy2(root/'docs/20-INTERFEYS-SOZLAMALARI.md',stage/'INTERFEYS.md')
    shutil.copy2(root/'deploy/apply-i18n.sh',stage/'update-app.sh')
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(stage.rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(stage))
print('Paket:', output)
print('Versiya:', version)
print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())
