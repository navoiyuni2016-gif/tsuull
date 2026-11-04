"""Exercise PDF deployment/recovery with real installer and fake Docker only."""
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
import json,subprocess,sys,tempfile,zipfile
from unittest.mock import patch
repo=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('update',repo/'deploy/update-pdf.py');u=module_from_spec(spec);spec.loader.exec_module(u)
real_run=subprocess.run
for fail in [False,True]:
 with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)/'project';root.mkdir();bundle=Path(tmp)/'bundle'
    with zipfile.ZipFile(repo/'updates/tsuull-pdf-v5.zip') as z:z.extractall(bundle)
    u.bundle=bundle;(root/'package.json').write_text('{"name":"tsuull-oquv-erp"}')
    manifest=json.loads((bundle/'manifest.json').read_text())
    with zipfile.ZipFile(repo/'updates/tsuull-management-v4.zip') as z:
        for name in manifest['files']:
            try:data=z.read('payload/'+name)
            except KeyError:continue
            target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    before=(root/'server/calculation-history.mjs').read_bytes();commands=[];previous=sys.argv[:]
    def output(argv):
        commands.append(argv)
        if argv[-3:]==['ps','-q','app']:return 'synthetic-container'
        if argv[:2]==['docker','inspect']:return 'tsuull-erp:3.0.0' if argv[3]=='{{.Config.Image}}' else 'sha256:synthetic'
        if argv[0]=='bash' and argv[1].endswith('/backup.sh'):
            (root/'backups').mkdir();(root/'backups/erp-TEST.dump').write_bytes(b'PGDMP synthetic')
            return 'Backup written: backups/erp-TEST.dump'
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
        if fail:assert (root/'server/calculation-history.mjs').read_bytes()==before
        else:assert '/print' in (root/'server/calculation-history.mjs').read_text()
    finally:sys.argv=previous
print('PASS PDF deployment contract: verified backup, app-only recreation, no schema/timer changes and automatic source/image recovery after failed checks')
