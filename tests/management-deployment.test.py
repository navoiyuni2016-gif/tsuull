"""Orchestrator contract with real source updates and mocked Docker/systemd only."""
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
import json,subprocess,sys,tempfile,zipfile
from unittest.mock import patch
repo=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('update',repo/'deploy/update-management.py');u=module_from_spec(spec);spec.loader.exec_module(u)
def old(name):return subprocess.check_output(['git','show','0c534bb:'+name],cwd=repo)
real_isdir=Path.is_dir
for fail in [False,True]:
 with tempfile.TemporaryDirectory() as tmp:
    folder=Path(tmp);root=folder/'project';root.mkdir();bundle=folder/'bundle'
    with zipfile.ZipFile(repo/'updates/tsuull-management-v4.zip') as z:z.extractall(bundle)
    u.bundle=bundle
    (root/'package.json').write_bytes(old('package.json'))
    manifest=json.loads((bundle/'manifest.json').read_text())
    for name,info in manifest['files'].items():
        if info['kind']=='patch':
            p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(old(name))
    for release in ['tsuull-i18n-update.zip','tsuull-i18n-labels-v2.zip','tsuull-interface-v3.zip']:
        with zipfile.ZipFile(repo/'updates'/release) as z:
            m=json.loads(z.read('manifest.json'))
            for name in m['files']:
                p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read('payload/'+name))
    original=(root/'server/app.mjs').read_bytes();commands=[];previous=sys.argv[:]
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
        if argv[0]=='python3':
            if argv[1].endswith('install-management-backup.py'):return
            subprocess.run(argv,check=True,stdout=subprocess.DEVNULL,**kwargs);return
        if argv[0]=='bash' and 'run' in argv and fail:raise subprocess.CalledProcessError(1,argv)
        return subprocess.CompletedProcess(argv,0)
    try:
        sys.argv=['update.py',str(root)]
        with patch.object(u,'run',run),patch.object(u,'output',output),patch.object(u.os,'geteuid',lambda:0),patch.object(Path,'is_dir',lambda self:True if str(self)=='/run/systemd/system' else real_isdir(self)),patch.object(u.subprocess,'run',wraps=subprocess.run) as ignored:
            # Keep actual subprocess execution available to installer calls; mocked
            # systemctl cleanup is the only direct subprocess.run call in rollback.
            ignored.side_effect=lambda argv,**kw:subprocess.CompletedProcess(argv,0) if argv[0]=='systemctl' else ignored._mock_wraps(argv,**kw)
            try:u.main()
            except subprocess.CalledProcessError:
                assert fail
        assert any('node server/migrate.mjs' in x[-1] and 'node server/grant.mjs' in x[-1] for x in commands if x[0]=='bash' and 'run' in x)
        ups=[x for x in commands if x[0]=='bash' and 'up' in x]
        assert all(x[-1]=='app' and '--no-deps' in x for x in ups)
        if fail:assert (root/'server/app.mjs').read_bytes()==original
        else:assert 'registerCalculationHistory' in (root/'server/app.mjs').read_text()
        assert any('pg_restore' in x and '--list' in x for x in commands)
        assert not any('pg_restore' in x and '--list' not in x for x in commands)
    finally:sys.argv=previous
print('PASS deployment contract: backup verification, schema+grants before app, app-only restart and failed-migration source/image recovery')
