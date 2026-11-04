"""Exercise real preserving installer on known releases and manual live patches."""
from importlib.util import spec_from_file_location,module_from_spec
import hashlib,json
from pathlib import Path
import shutil,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('installer',root/'deploy/install-management.py');m=module_from_spec(spec);spec.loader.exec_module(m)
def old(name):return subprocess.check_output(['git','show','0c534bb:'+name],cwd=root)
def run(project,bundle,*args,ok=True):
    p=subprocess.run(['python3',str(bundle/'install.py'),'--root',str(project),*map(str,args)],capture_output=True,text=True)
    assert (p.returncode==0)==ok,p.stdout+p.stderr
    return p
with tempfile.TemporaryDirectory() as tmp:
    folder=Path(tmp);bundle=folder/'bundle'
    with zipfile.ZipFile(root/'updates/tsuull-management-v4.zip') as z:z.extractall(bundle)
    payloads={};current={}
    for release in ['tsuull-i18n-update.zip','tsuull-i18n-labels-v2.zip','tsuull-interface-v3.zip']:
        with zipfile.ZipFile(root/'updates'/release) as z:
            manifest=json.loads(z.read('manifest.json'))
            current.update({n:z.read('payload/'+n) for n in manifest['files']})
        payloads[release]=dict(current)
    for release,payload in payloads.items():
        project=folder/release;project.mkdir();(project/'package.json').write_bytes(old('package.json'))
        for name in m.PATCHES:
            p=project/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(old(name))
        for name,data in payload.items():
            p=project/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        # Reproduce server-side static/no-store patch and a custom Excel helper.
        app=project/'server/app.mjs';s=app.read_text();s=s.replace("app.use(express.static(root,{index:'index.html',dotfiles:'deny',maxAge:0}));","/* static-cache-v1 */\n app.use(express.static(root,{index:'index.html',dotfiles:'deny',maxAge:0,etag:false,lastModified:false,setHeaders(res){res.setHeader('Cache-Control','no-store, max-age=0');}}));");app.write_text(s)
        ext=project/'server/extensions.mjs';ext.write_text("import {professionalWorkbook} from './xlsx-theme.mjs';\n"+ext.read_text()+"\n// Local Excel customization preserved\n")
        untouched={'server/xlsx-theme.mjs':b'// local professional workbook\n','deploy/Caddyfile':b'https://el.tsuull.uz { reverse_proxy app:8080 }\n','.env':b'FIXTURE_ONLY=not-a-secret\n','.deploy-mode':b'proxy\n'}
        for name,data in untouched.items():(project/name).write_bytes(data)
        originals={n:(project/n).read_bytes() if (project/n).exists() else None for n in m.ALLOWED}
        run(project,bundle);assert all(((project/n).read_bytes() if (project/n).exists() else None)==v for n,v in originals.items())
        receipt=folder/'receipt.json';run(project,bundle,'--apply','--receipt',receipt)
        saved=json.loads(receipt.read_text());backup=Path(saved['backup']);assert backup.stat().st_mode&0o777==0o700
        assert 'static-cache-v1' in app.read_text();assert "import {saveCalculation}" in ext.read_text()
        assert "professionalWorkbook" in ext.read_text()
        for name,data in untouched.items():assert (project/name).read_bytes()==data,name
        run(project,bundle,'--apply','--receipt',receipt);assert json.loads(receipt.read_text())['changes']==0
        # Conflicting edits prevent rollback before it modifies any target.
        app.write_text(app.read_text()+'\n// post-install edit\n')
        run(project,bundle,'--rollback',backup,'--apply',ok=False)
        app.write_text(app.read_text().removesuffix('\n// post-install edit\n'))
        run(project,bundle,'--rollback',backup,'--apply')
        assert all(((project/n).read_bytes() if (project/n).exists() else None)==v for n,v in originals.items())
        # A frontend drift causes a complete preflight abort.
        js=project/'public/app.mjs';js.write_text(js.read_text()+'\n// unknown drift\n')
        run(project,bundle,'--apply',ok=False);assert not (project/'server/management.mjs').exists()
        js.write_bytes(originals['public/app.mjs'])
        # A symlink is never followed, and tampered payload is not accepted.
        js.unlink();js.symlink_to(folder/'outside');run(project,bundle,'--apply',ok=False);js.unlink();js.write_bytes(originals['public/app.mjs'])
    target=bundle/'payload/public/management.mjs';target.write_bytes(target.read_bytes()+b'\n// tampered\n')
    run(project,bundle,'--apply',ok=False)
print('PASS installer: v1/v2/v3, manual Excel/cache/Caddy preservation, preflight, checksum, idempotency, symlink rejection and exact rollback')
