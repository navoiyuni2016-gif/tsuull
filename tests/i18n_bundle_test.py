"""Verify the preservation contract of the frontend-only localization installer."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

repo=Path(__file__).resolve().parents[1]

def run(*args,ok=True):
    p=subprocess.run([str(x) for x in args],capture_output=True,text=True)
    if ok:assert p.returncode==0,p.stdout+p.stderr
    else:assert p.returncode!=0,p.stdout+p.stderr
    return p

def snapshot(root):
    return {str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()}

with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp);archive=tmp/'update.zip'
    run('python3',repo/'deploy/build-i18n-bundle.py',archive)
    bundle=tmp/'bundle'
    with zipfile.ZipFile(archive) as z:z.extractall(bundle)
    manifest=json.loads((bundle/'manifest.json').read_text())
    for versioned in (False,True):
        root=tmp/('versioned' if versioned else 'plain');(root/'public').mkdir(parents=True)
        (root/'package.json').write_text('{"name":"tsuull-oquv-erp"}')
        for name,info in manifest['files'].items():
            if not info['base_sha256']:continue
            data=subprocess.check_output(['git','show','c139e98:'+name],cwd=repo)
            if versioned and name.endswith(('.html','.mjs')):
                data=re.sub(rb'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css))\1''',lambda m:m[1]+m[2]+b'?v=e2a9841a84e7'+m[1],data)
            (root/name).write_bytes(data)
        for name in ('server/xlsx-theme.mjs','server/extensions.mjs','server/app.mjs','deploy/Caddyfile','.env','.deploy-mode','backups/fixture.dump'):
            p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('SYNTHETIC PRESERVATION MARKER '+name)
        before=snapshot(root)
        command=['python3',bundle/'install.py','--root',root]
        run(*command);assert snapshot(root)==before,'Preflight must be read-only'
        run(*command,'--apply')
        for name in manifest['files']:assert (root/name).read_bytes()==(bundle/'payload'/name).read_bytes()
        for name,data in before.items():
            if name not in manifest['files']:assert (root/name).read_bytes()==data,name
        installed=snapshot(root);run(*command,'--apply');assert snapshot(root)==installed,'Idempotent apply'
        backups=list(root.glob('i18n-upgrade-*'));assert len(backups)==1
        run(*command,'--rollback',backups[0]);assert snapshot(root)==installed
        run(*command,'--rollback',backups[0],'--apply')
        for name,data in before.items():assert (root/name).read_bytes()==data,name
        for name,info in manifest['files'].items():
            if info['base_sha256'] is None:assert not (root/name).exists()
        # A user edit aborts the whole update before touching any file.
        (root/'public/app.css').write_text('/* unrecognized local change */')
        drift=snapshot(root);run(*command,'--apply',ok=False);assert snapshot(root)==drift
        (root/'public/app.css').write_bytes(before['public/app.css'])
        # A corrupt download must not be applied.
        target=bundle/'payload/public/i18n.mjs';original=target.read_bytes();target.write_bytes(original+b'corrupt')
        drift=snapshot(root);run(*command,'--apply',ok=False);assert snapshot(root)==drift;target.write_bytes(original)
        # Existing unknown helper content must survive unchanged.
        (root/'public/i18n.mjs').write_text('// user-owned helper')
        drift=snapshot(root);run(*command,'--apply',ok=False);assert snapshot(root)==drift
    print('PASS: plain and cache-versioned install; preflight, idempotence, rollback, source drift, corrupt payload and preservation of Excel/server/Caddy/DB files')
