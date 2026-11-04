from pathlib import Path
import tempfile,json,subprocess,importlib.util
from datetime import datetime,timezone,timedelta
repo=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('worker',repo/'deploy/management-backup.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
rec=importlib.util.spec_from_file_location('record',repo/'deploy/record-backup.py');record=importlib.util.module_from_spec(rec);rec.loader.exec_module(record)
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);(root/'package.json').write_text('{"name":"tsuull-oquv-erp"}');(root/'backups').mkdir()
 now=datetime(2026,11,4,10,tzinfo=timezone.utc);calls=[];enabled=True;bad=False;bad_archive=False
 def runner(command,**kwargs):
  calls.append(command)
  if 'psql' in command:return subprocess.CompletedProcess(command,0,stdout=json.dumps({'enabled':enabled,'intervalHours':24}))
  if command[0]=='bash' and command[1].endswith('/backup.sh'):
   if bad:raise subprocess.CalledProcessError(1,command,output='SYNTHETIC SECRET MUST NOT LEAK')
   (root/'backups/erp-TEST.dump').write_bytes(b'PGDMP synthetic fixture')
   return subprocess.CompletedProcess(command,0,stdout='Backup written: backups/erp-TEST.dump\n')
  assert 'pg_restore' in command and '--list' in command
  if bad_archive:raise subprocess.CalledProcessError(1,command)
  return subprocess.CompletedProcess(command,0)
 assert worker.run_backup(root,runner,now)
 state=json.loads((root/'var/management/backup.json').read_text());assert state['status']=='SUCCESS' and state['filename']=='erp-TEST.dump'
 assert not worker.run_backup(root,runner,now+timedelta(hours=1))
 assert len([c for c in calls if c[0]=='bash' and c[1].endswith('/backup.sh')])==1
 bad=True;assert not worker.run_backup(root,runner,now+timedelta(hours=25))
 text=(root/'var/management/backup.json').read_text();assert 'SECRET' not in text;assert json.loads(text)['status']=='ERROR';assert json.loads(text)['lastSuccessAt']==state['lastSuccessAt']
 bad=False;bad_archive=True;assert not worker.run_backup(root,runner,now+timedelta(hours=26))
 enabled=False;calls.clear();assert not worker.run_backup(root,runner,now+timedelta(hours=27));assert len(calls)==1
 record.record_backup(root,'backups/erp-TEST.dump');assert json.loads((root/'var/management/backup.json').read_text())['status']=='SUCCESS'
 assert (root/'var/management/backup.json').stat().st_mode&0o777==0o644
 try:record.record_backup(root,'../elsewhere.dump');raise AssertionError('outside backup path accepted')
 except (ValueError,FileNotFoundError):pass
 print('PASS backup worker: scheduling, disabled state, structure verification, failure privacy, preserved last success and readable non-secret metadata')
