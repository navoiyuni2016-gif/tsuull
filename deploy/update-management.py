#!/usr/bin/env python3
"""Ubuntu Docker deployment with source/image recovery; never restores live data."""
from datetime import datetime,timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

bundle=Path(__file__).resolve().parent
def run(argv,**kwargs):return subprocess.run(argv,check=True,**kwargs)
def output(argv):return subprocess.check_output(argv,text=True).strip()
def compose(root,*argv):return ['bash',str(root/'deploy/compose.sh'),*argv]
def rollback(root,state_dir):
    info=json.loads((state_dir/'deployment.json').read_text())
    if info['root']!=str(root) or not re.fullmatch(r'tsuull-erp:management-before-[0-9TZ]+',info['imageBackup']):raise ValueError('Invalid recovery state')
    receipt=json.loads((state_dir/'source.json').read_text())
    if not receipt.get('backup'):raise ValueError('Source backup is missing')
    run(['python3',str(bundle/'install.py'),'--root',str(root),'--rollback',receipt['backup']])
    if not info['timerExisted']:
        # A failed build may occur before timer installation.
        subprocess.run(['systemctl','disable','--now',info['timer']],stdout=subprocess.DEVNULL,check=False)
    run(['python3',str(bundle/'install.py'),'--root',str(root),'--rollback',receipt['backup'],'--apply'])
    run(['docker','image','tag',info['imageBackup'],info['imageTag']])
    run(compose(root,'up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','90','app'))
    print('OLDINGI ILOVA QAYTARILDI. Yangi hisoblash tarixi va qo‘shilgan jadvallar bazada saqlanadi.')
def main():
    undo=len(sys.argv)>1 and sys.argv[1]=='--rollback';args=sys.argv[2:] if undo else sys.argv[1:]
    if len(args)!=(2 if undo else 1):raise ValueError('Usage: update-app.sh PROJECT; rollback-app.sh PROJECT DEPLOYMENT_DIRECTORY')
    if os.geteuid()!=0:raise ValueError('sudo bash bilan ishga tushiring.')
    root=Path(args[0]).resolve()
    if not re.fullmatch(r'/[A-Za-z0-9/_-]+',str(root)):raise ValueError('Unsupported project path')
    if json.loads((root/'package.json').read_text()).get('name')!='tsuull-oquv-erp':raise ValueError('ERP project required')
    os.chdir(root)
    with (root/'.management-deploy.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if undo:rollback(root,Path(args[1]).resolve());return
        if not Path('/run/systemd/system').is_dir():raise ValueError('Ubuntu systemd server required for scheduled backups')
        for path in ['var','var/management','backups']:
            if (root/path).is_symlink():raise ValueError('Unsafe status/backup path: '+path)
        run(['python3',str(bundle/'install.py'),'--root',str(root)])
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');state=root/('management-deploy-'+stamp);state.mkdir(mode=0o700)
        run(['python3',str(bundle/'install.py'),'--root',str(root),'--receipt',str(state/'preflight.json')])
        if not json.loads((state/'preflight.json').read_text())['changes']:
            print('Paket tayyor holatda. Qayta o‘rnatish talab qilinmaydi.');return
        container=output(compose(root,'ps','-q','app'))
        if not container:raise ValueError('Running app container required')
        old_image=output(['docker','inspect','--format','{{.Image}}',container]);image_tag=output(['docker','inspect','--format','{{.Config.Image}}',container])
        image_backup='tsuull-erp:management-before-'+stamp;run(['docker','image','tag',old_image,image_backup])
        timer='tsuull-backup-'+hashlib.sha256(str(root).encode()).hexdigest()[:10]+'.timer'
        info={'root':str(root),'imageBackup':image_backup,'imageTag':image_tag,'timer':timer,'timerExisted':Path('/etc/systemd/system',timer).exists()}
        (state/'deployment.json').write_text(json.dumps(info,indent=2))
        result=output(['bash',str(root/'deploy/backup.sh')]);print(result)
        match=re.search(r'(?m)^Backup written: (backups/erp-[\w-]+\.dump)$',result)
        if not match:raise ValueError('Verified database backup receipt required')
        dump=root/match[1]
        if dump.is_symlink() or not dump.is_file() or dump.stat().st_size==0:raise ValueError('Database backup is empty')
        with dump.open('rb') as f:run(compose(root,'exec','-T','db','pg_restore','--list'),stdin=f,stdout=subprocess.DEVNULL)
        applied=False
        try:
            run(['python3',str(bundle/'install.py'),'--root',str(root),'--apply','--receipt',str(state/'source.json')]);applied=True
            (root/'var/management').mkdir(parents=True,exist_ok=True,mode=0o755)
            run(['python3',str(root/'deploy/record-backup.py'),str(dump)])
            run(compose(root,'build','migrate'))
            checks='for file in server/*.mjs public/*.mjs; do node --check "$file" || exit 1; done; node server/migrate.mjs && node server/grant.mjs'
            run(compose(root,'run','--rm','--no-deps','migrate','sh','-ec',checks))
            run(['python3',str(root/'deploy/install-management-backup.py'),'--root',str(root)])
            run(compose(root,'up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','90','app'))
            run(compose(root,'exec','-T','app','node','--input-type=module','-e',"const r=await fetch('http://127.0.0.1:8080/health/ready');if(!r.ok)process.exit(1);console.log(await r.text())"))
        except BaseException:
            print('YANGILASH TO‘XTADI. Tiklash papkasi:',state,flush=True)
            if applied:
                try:rollback(root,state)
                except BaseException:print('AVTOMATIK QAYTARISH TUGAMADI. README dagi rollback buyrug‘ini bajaring.',flush=True)
            raise
        run(compose(root,'ps'))
        print('TAYYOR. Sahifani yangilang. Hisoblash tarixi va boshqaruv markazi ulandi.')
        print('TIKLASH PAPKASI:',state)
        print('Zaxiralash jadvalini Boshqaruv markazida yoqishingiz mumkin.')
if __name__=='__main__':
    try:main()
    except (ValueError,OSError,subprocess.SubprocessError) as e:raise SystemExit(str(e))
