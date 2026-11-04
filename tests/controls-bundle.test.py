"""Exercise the published preserving v7 archive over a v6 live-style source tree."""
import json,subprocess,tempfile,zipfile
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
from unittest.mock import patch
import sys,os
repo=Path(__file__).resolve().parents[1]
def extract(bundle):
 with zipfile.ZipFile(repo/'updates/tsuull-controls-v7.zip') as z:z.extractall(bundle)
def baseline(root,bundle):
 root.mkdir();(root/'package.json').write_text('{"name":"tsuull-oquv-erp"}')
 manifest=json.loads((bundle/'manifest.json').read_text());originals={}
 with zipfile.ZipFile(repo/'updates/tsuull-export-v6.zip') as z:
  for name,info in manifest['files'].items():
   if info['kind']=='replace' and info['bases']==[None]:continue
   try:data=z.read('payload/'+name)
   except KeyError:data=subprocess.check_output(['git','show','bc047f8:'+name],cwd=repo)
   target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 app=root/'server/app.mjs';old="app.use(express.static(root,{index:'index.html',dotfiles:'deny',maxAge:0}));"
 assert old in app.read_text()
 app.write_text(app.read_text().replace(old,"/* static-cache-v1 */\napp.use((req,res,next)=>{res.set('Cache-Control','no-store, max-age=0');next();});\napp.use(express.static(root,{index:'index.html',dotfiles:'deny',maxAge:0,etag:false,lastModified:false}));"))
 ext=root/'server/extensions.mjs';value=ext.read_text();assert 'const buffer=await writeXlsx' in value
 value="import {professionalWorkbook} from './xlsx-theme.mjs';\n"+value
 value=value.replace('const buffer=await writeXlsx','const rawBuffer=await writeXlsx',1)
 # Simulates the deployed native Excel helper without changing the patch anchors.
 at=value.index('const rawBuffer=await writeXlsx');end=value.index(';',at)+1
 value=value[:end]+'\n const buffer=professionalWorkbook(rawBuffer);'+value[end:];ext.write_text(value)
 sentinels={'server/xlsx-theme.mjs':b'export const professionalWorkbook=v=>v;\n','deploy/Caddyfile':b'LIVE TLS CONFIG\n','.env':b'SYNTHETIC_ONLY=1\n','.deploy-mode':b'original\n','compose.management.yaml':b'original mount\n'}
 for name,data in sentinels.items():
  target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 for name in manifest['files']:
  target=root/name;originals[name]=target.read_bytes() if target.exists() else None
 os.chmod(app,0o640)
 return originals,sentinels
with tempfile.TemporaryDirectory() as tmp:
 bundle=Path(tmp)/'bundle';extract(bundle);root=Path(tmp)/'project';before,sentinels=baseline(root,bundle)
 def call(*args,ok=True):
  r=subprocess.run(['python3',str(bundle/'install.py'),'--root',str(root),*map(str,args)],capture_output=True,text=True)
  assert (r.returncode==0)==ok,r.stdout+r.stderr
 call()
 assert all(((root/n).read_bytes() if (root/n).exists() else None)==data for n,data in before.items())
 receipt=Path(tmp)/'result.json';call('--apply','--receipt',receipt);state=json.loads(receipt.read_text());backup=Path(state['backup'])
 assert backup.name.startswith('controls-upgrade-') and backup.stat().st_mode&0o777==0o700
 assert (root/'server/app.mjs').stat().st_mode&0o777==0o640
 assert 'static-cache-v1' in (root/'server/app.mjs').read_text()
 assert 'res.set(\'Cache-Control\',\'no-store, max-age=0\')' in (root/'server/app.mjs').read_text()
 assert 'professionalWorkbook(rawBuffer)' in (root/'server/extensions.mjs').read_text()
 for n,data in sentinels.items():assert (root/n).read_bytes()==data
 for file in list((root/'server').glob('*.mjs'))+list((root/'public').glob('*.mjs')):
  subprocess.run(['node','--check',str(file)],check=True,capture_output=True)
 call('--apply','--receipt',receipt);assert json.loads(receipt.read_text())['changes']==0
 call('--rollback',backup,'--apply')
 for name,data in before.items():assert ((root/name).read_bytes() if (root/name).exists() else None)==data,name
 target=root/'server/planning.mjs';target.write_bytes(target.read_bytes()+b'\n// drift\n');call('--apply',ok=False);target.write_bytes(before['server/planning.mjs'])
 target=root/'public/modules.mjs';target.unlink();target.symlink_to(Path(tmp)/'outside');call('--apply',ok=False);target.unlink();target.write_bytes(before['public/modules.mjs'])
 target=bundle/'payload/public/academic-controls.mjs';target.write_bytes(b'tamper');call('--apply',ok=False)
print('PASS v7 archive: preserved live cache/Excel/config, syntax, read-only preflight, apply/reapply/exact rollback, file modes and drift/symlink/tamper rejection')
# Run exact generated deployment orchestration with real source installer; mock Docker boundary only.
real_run=subprocess.run
for fail in [False,True]:
 with tempfile.TemporaryDirectory() as tmp:
  bundle=Path(tmp)/'bundle';extract(bundle);root=Path(tmp)/'project';before,sentinels=baseline(root,bundle)
  spec=spec_from_file_location('controls_update',bundle/'update.py');u=module_from_spec(spec);spec.loader.exec_module(u)
  commands=[];previous=sys.argv[:];oldcwd=Path.cwd()
  def output(argv):
   commands.append(argv)
   if argv[-3:]==['ps','-q','app']:return 'synthetic-container'
   if argv[:2]==['docker','inspect']:return 'tsuull-erp:3.0.0' if argv[3]=='{{.Config.Image}}' else 'sha256:synthetic'
   if argv[0]=='bash' and argv[1].endswith('/backup.sh'):
    (root/'backups').mkdir();(root/'backups/erp-TEST.dump').write_bytes(b'PGDMP synthetic');return 'Backup written: backups/erp-TEST.dump'
   raise AssertionError(argv)
  def run(argv,**kwargs):
   commands.append(argv)
   if argv[0]=='python3':return real_run(argv,check=True,stdout=subprocess.DEVNULL,**kwargs)
   if argv[0]=='bash' and 'run' in argv and fail:raise subprocess.CalledProcessError(1,argv)
   return subprocess.CompletedProcess(argv,0)
  try:
   sys.argv=['update.py',str(root)]
   with patch.object(u,'run',run),patch.object(u,'output',output),patch.object(u.os,'geteuid',lambda:0):
    try:u.main()
    except subprocess.CalledProcessError:assert fail
   assert all(x[-1]=='app' and '--no-deps' in x for x in commands if x[0]=='bash' and 'up' in x)
   assert not any('systemctl' in x or any('node server/migrate.mjs' in v or 'node server/grant.mjs' in v for v in x) for x in commands)
   assert any('pg_restore' in x and '--list' in x for x in commands)
   for name,data in sentinels.items():assert (root/name).read_bytes()==data
   if fail:
    for name,data in before.items():assert ((root/name).read_bytes() if (root/name).exists() else None)==data,name
   else:assert (root/'server/schedule-calculation.mjs').exists()
  finally:sys.argv=previous;os.chdir(oldcwd)
print('PASS v7 deployment: verified DB backup, app-only recreation, no migration/timer changes, automatic source/image recovery after failed checks')
