#!/usr/bin/env python3
"""Host-only backup worker. No Docker socket is exposed to the web application."""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

def run_backup(root, runner=subprocess.run, now=None):
    root = Path(root).resolve()
    if json.loads((root/'package.json').read_text()).get('name') != 'tsuull-oquv-erp':
        raise ValueError('ERP project required')
    state_dir = root/'var/management'
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o755)
    state_file = state_dir/'backup.json'
    now = now or datetime.now(timezone.utc)
    stamp = now.isoformat()
    try:
        state = json.loads(state_file.read_text())
        if not isinstance(state,dict):
            state = {'version':1,'status':'WAITING'}
    except (OSError, ValueError):
        state = {'version': 1, 'status': 'WAITING'}
    state.update(version=1, checkedAt=stamp)
    compose = ['bash', str(root/'deploy/compose.sh')]
    with (state_dir/'worker.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return False
        success = False
        try:
            config = runner(compose+['exec','-T','db','psql','-U','erp_owner','-d','erp','-Atc',
                "SELECT data::text FROM portal.management_config WHERE key='backup'"],
                capture_output=True, text=True, timeout=30, check=True)
            if len(config.stdout) > 8192:
                raise ValueError('config size')
            schedule = json.loads(config.stdout.strip()) if config.stdout.strip() else {'enabled':False,'intervalHours':24}
            if not isinstance(schedule,dict) or type(schedule.get('enabled')) is not bool or type(schedule.get('intervalHours')) is not int or not 1 <= schedule['intervalHours'] <= 168:
                raise ValueError('config')
            due = True
            if state.get('lastSuccessAt'):
                try:
                    last = datetime.fromisoformat(state['lastSuccessAt'])
                    due = last.tzinfo is None or (now-last).total_seconds() >= schedule['intervalHours']*3600
                except ValueError:
                    due = True
            if schedule['enabled'] and due:
                state['lastAttemptAt'] = stamp
                result = runner(['bash', str(root/'deploy/backup.sh')],
                                capture_output=True, text=True, timeout=1800, check=True)
                match = re.search(r'(?m)^Backup written: (backups/erp-[\w-]+\.dump)\s*$', result.stdout)
                if not match:
                    raise ValueError('backup receipt')
                dump = root/match[1]
                if dump.is_symlink() or not dump.is_file() or dump.stat().st_size == 0:
                    raise ValueError('backup file')
                with dump.open('rb') as source:
                    runner(compose+['exec','-T','db','pg_restore','--list'],stdin=source,
                           stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=120,check=True)
                state.update(status='SUCCESS', lastSuccessAt=stamp, filename=dump.name, bytes=dump.stat().st_size)
                success = True
        except (OSError, ValueError, subprocess.SubprocessError):
            state['status'] = 'ERROR'
        fd, temporary = tempfile.mkstemp(prefix='.backup-', dir=state_dir)
        try:
            with os.fdopen(fd,'w') as target:
                json.dump(state,target)
            os.chmod(temporary,0o644)
            os.replace(temporary,state_file)
        finally:
            Path(temporary).unlink(missing_ok=True)
        return success

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    arguments = parser.parse_args()
    run_backup(arguments.root)
