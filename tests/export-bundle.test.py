"""Verify the exact v6 download over both supported installed release states."""
import json,subprocess,tempfile,zipfile
from pathlib import Path
repo=Path(__file__).resolve().parents[1]
for baseline in ['tsuull-management-v4.zip','tsuull-pdf-v5.zip']:
 with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)/'project';root.mkdir();bundle=Path(tmp)/'bundle'
    (root/'package.json').write_text('{"name":"tsuull-oquv-erp"}')
    with zipfile.ZipFile(repo/'updates/tsuull-export-v6.zip') as z:z.extractall(bundle)
    manifest=json.loads((bundle/'manifest.json').read_text());originals={}
    with zipfile.ZipFile(repo/'updates'/baseline) as z:
        for name in manifest['files']:
            try:data=z.read('payload/'+name)
            except KeyError:data=None
            originals[name]=data
            if data is not None:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    untouched={'server/app.mjs':b'// custom static cache headers\n','server/extensions.mjs':b'// local Excel code\n','server/xlsx-theme.mjs':b'// custom workbook\n','deploy/Caddyfile':b'// live TLS config\n','.env':b'SYNTHETIC_ONLY=1\n','compose.management.yaml':b'// original status mount\n'}
    for name,data in untouched.items():
        target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    def call(*args,ok=True):
        result=subprocess.run(['python3',str(bundle/'install.py'),'--root',str(root),*map(str,args)],capture_output=True,text=True)
        assert (result.returncode==0)==ok,result.stdout+result.stderr
    call();receipt=Path(tmp)/'receipt.json';call('--apply','--receipt',receipt)
    backup=Path(json.loads(receipt.read_text())['backup']);assert backup.name.startswith('export-upgrade-')
    for name,data in untouched.items():assert (root/name).read_bytes()==data
    assert "format==='preview'" in (root/'server/report-export.mjs').read_text()
    assert '/print' in (root/'server/calculation-history.mjs').read_text()
    call('--apply','--receipt',receipt);assert json.loads(receipt.read_text())['changes']==0
    call('--rollback',backup,'--apply')
    for name,data in originals.items():assert ((root/name).read_bytes() if (root/name).exists() else None)==data
    target=root/'server/report-export.mjs';target.write_bytes(target.read_bytes()+b'\n// local edit\n')
    call('--apply',ok=False);assert (root/'public/management.mjs').read_bytes()==originals['public/management.mjs']
    target.write_bytes(originals['server/report-export.mjs'])
    target=root/'public/management.css';target.unlink();target.symlink_to(Path(tmp)/'outside');call('--apply',ok=False);target.unlink();target.write_bytes(originals['public/management.css'])
    target=bundle/'payload/public/management.css';target.write_bytes(b'tampered');call('--apply',ok=False)
print('PASS export package: v4/v5 compatibility, apply/reapply/rollback, CSV preview + PDF retained, preserved local config, drift/symlink/tamper checks')
