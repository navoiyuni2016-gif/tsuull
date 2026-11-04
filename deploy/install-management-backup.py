#!/usr/bin/env python3
"""Install a local systemd timer for the database-configured backup schedule."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

def install(root):
    root=Path(root).resolve()
    if not re.fullmatch(r'/[A-Za-z0-9/_-]+',str(root)):
        raise SystemExit('Server project path must contain only letters, digits, /, _ and -')
    if json.loads((root/'package.json').read_text()).get('name')!='tsuull-oquv-erp':
        raise SystemExit('ERP project required')
    (root/'var').mkdir(exist_ok=True,mode=0o755)
    (root/'var').chmod(0o755)
    state=root/'var/management'
    state.mkdir(parents=True,exist_ok=True,mode=0o755)
    state.chmod(0o755)
    status=state/'backup.json'
    if not status.exists():
        status.write_text(json.dumps({'version':1,'status':'WAITING'}))
        status.chmod(0o644)
    name='tsuull-backup-'+hashlib.sha256(str(root).encode()).hexdigest()[:10]
    service=(
        '[Unit]\nDescription=TSUULL ERP scheduled database backup\nAfter=docker.service network-online.target\n'
        '[Service]\nType=oneshot\nUser=root\nUMask=0077\nNoNewPrivileges=true\nProtectSystem=strict\n'
        'ReadWritePaths='+str(root/'backups')+' '+str(root/'var')+'\n'
        'ExecStart=/usr/bin/python3 '+str(root/'deploy/management-backup.py')+' --root '+str(root)+'\n'
        'TimeoutStartSec=2100\n'
    )
    (root/'backups').mkdir(exist_ok=True,mode=0o700)
    timer='[Unit]\nDescription=Check TSUULL backup schedule hourly\n[Timer]\nOnBootSec=5min\nOnUnitActiveSec=1h\nPersistent=true\nUnit='+name+'.service\n[Install]\nWantedBy=timers.target\n'
    folder=Path('/etc/systemd/system')
    (folder/(name+'.service')).write_text(service)
    (folder/(name+'.timer')).write_text(timer)
    subprocess.run(['systemctl','daemon-reload'],check=True)
    subprocess.run(['systemctl','enable','--now',name+'.timer'],check=True)
    print('Zaxiralash kuzatuvi tayyor:',name+'.timer')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',required=True,type=Path)
    install(p.parse_args().root)
