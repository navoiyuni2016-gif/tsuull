#!/usr/bin/env python3
"""Install the PDF template over v4, keeping a verified DB and image backup."""
from datetime import datetime,timezone
import fcntl,json,os
from pathlib import Path
import re,subprocess,sys

bundle=Path(__file__).resolve().parent
def run(argv,**kw):return subprocess.run(argv,check=True,**kw)
def output(argv):return subprocess.check_output(argv,text=True).strip()
def compose(root,*args):return ['bash',str(root/'deploy/compose.sh'),*args]
def rollback(root,state):
    info=json.loads((state/'deployment.json').read_text())
    if info['root']!=str(root) or not re.fullmatch(r'tsuull-erp:pdf-before-[0-9TZ]+',info['imageBackup']):raise ValueError('Invalid recovery state')
    saved=json.loads((state/'source.json').read_text())
    if not saved.get('backup'):raise ValueError('Source backup missing')
    run(['python3',str(bundle/'install.py'),'--root',str(root),'--rollback',saved['backup']])
    run(['python3',str(bundle/'install.py'),'--root',str(root),'--rollback',saved['backup'],'--apply'])
    run(['docker','image','tag',info['imageBackup'],info['imageTag']])
    run(compose(root,'up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','90','app'))
    print('Oldingi ilova va kod qaytarildi. Bazadagi yozuvlar saqlanadi.')
def main():
    undo=len(sys.argv)>1 and sys.argv[1]=='--rollback';args=sys.argv[2:] if undo else sys.argv[1:]
    if len(args)!=(2 if undo else 1):raise ValueError('update-app.sh PROJECT; rollback-app.sh PROJECT DEPLOYMENT_DIRECTORY')
    if os.geteuid()!=0:raise ValueError('sudo bash bilan ishga tushiring.')
    root=Path(args[0]).resolve()
    if not re.fullmatch(r'/[A-Za-z0-9/_-]+',str(root)) or json.loads((root/'package.json').read_text()).get('name')!='tsuull-oquv-erp':raise ValueError('ERP project required')
    os.chdir(root)
    with (root/'.management-deploy.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if undo:rollback(root,Path(args[1]).resolve());return
        # Complete the read-only compatibility check before backup/build/mutation.
        run(['python3',str(bundle/'install.py'),'--root',str(root)])
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');state=root/('pdf-deploy-'+stamp);state.mkdir(mode=0o700)
        run(['python3',str(bundle/'install.py'),'--root',str(root),'--receipt',str(state/'preflight.json')])
        if not json.loads((state/'preflight.json').read_text())['changes']:print('PDF shabloni allaqachon o‘rnatilgan.');return
        container=output(compose(root,'ps','-q','app'))
        if not container:raise ValueError('Running app container required')
        image=output(['docker','inspect','--format','{{.Image}}',container]);tag=output(['docker','inspect','--format','{{.Config.Image}}',container])
        previous='tsuull-erp:pdf-before-'+stamp;run(['docker','image','tag',image,previous])
        (state/'deployment.json').write_text(json.dumps({'root':str(root),'imageBackup':previous,'imageTag':tag},indent=2))
        receipt=output(['bash',str(root/'deploy/backup.sh')]);print(receipt)
        match=re.search(r'(?m)^Backup written: (backups/erp-[\w-]+\.dump)$',receipt)
        if not match:raise ValueError('Database backup receipt required')
        dump=root/match[1]
        if (root/'backups').is_symlink() or dump.is_symlink() or not dump.is_file() or not dump.stat().st_size:raise ValueError('Invalid backup')
        with dump.open('rb') as f:run(compose(root,'exec','-T','db','pg_restore','--list'),stdin=f,stdout=subprocess.DEVNULL)
        applied=False
        try:
            run(['python3',str(bundle/'install.py'),'--root',str(root),'--apply','--receipt',str(state/'source.json')]);applied=True
            run(compose(root,'build','migrate'))
            run(compose(root,'run','--rm','--no-deps','migrate','sh','-ec','for file in server/*.mjs public/*.mjs; do node --check "$file" || exit 1; done'))
            run(compose(root,'up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','90','app'))
            run(compose(root,'exec','-T','app','node','--input-type=module','-e',"const r=await fetch('http://127.0.0.1:8080/health/ready');if(!r.ok)process.exit(1);console.log(await r.text())"))
        except BaseException:
            print('Yangilash to‘xtadi. Tiklash papkasi:',state,flush=True)
            if applied:
                try:rollback(root,state)
                except BaseException:print('Avtomatik qaytarish tugamadi. README dagi rollback buyrug‘ini bajaring.',flush=True)
            raise
        print('TAYYOR. PDF shabloni o‘rnatildi. Saytni yangilang.')
        print('TIKLASH PAPKASI:',state)
if __name__=='__main__':
    try:main()
    except (OSError,ValueError,subprocess.SubprocessError) as e:raise SystemExit(str(e))
