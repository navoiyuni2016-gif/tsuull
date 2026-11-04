#!/usr/bin/env python3
"""Write non-secret backup metadata for the read-only application status mount."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile

def record_backup(root, dump):
    root=Path(root).resolve()
    candidate=Path(dump)
    path=candidate if candidate.is_absolute() else root/candidate
    if path.is_symlink() or path.resolve().parent != root/'backups' or not re.fullmatch(r'erp-[\w-]+\.dump',path.name) or path.stat().st_size <= 0:
        raise ValueError('Valid local ERP backup required')
    (root/'var').mkdir(exist_ok=True,mode=0o755)
    (root/'var').chmod(0o755)
    folder=root/'var/management'
    folder.mkdir(exist_ok=True,mode=0o755)
    folder.chmod(0o755)
    output=folder/'backup.json'
    try:
        state=json.loads(output.read_text())
        if not isinstance(state,dict):
            state={}
    except (OSError,ValueError):
        state={}
    now=datetime.now(timezone.utc).isoformat()
    state.update(version=1,status='SUCCESS',lastSuccessAt=now,lastAttemptAt=now,filename=path.name,bytes=path.stat().st_size)
    fd,temporary=tempfile.mkstemp(prefix='.backup-',dir=folder)
    try:
        with os.fdopen(fd,'w') as target:
            json.dump(state,target)
        os.chmod(temporary,0o644)
        os.replace(temporary,output)
    finally:
        Path(temporary).unlink(missing_ok=True)

if __name__=='__main__':
    record_backup(Path(__file__).resolve().parents[1],sys.argv[1])
