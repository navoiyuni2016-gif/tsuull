#!/usr/bin/env python3
"""Preflight/apply a preserving management bundle, or restore its exact backup."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import parse_qsl,urlsplit,urlunsplit,urlencode

FRONTEND={'public/'+x for x in ('index.html','app.css','app.mjs','features.mjs','plan-studio.mjs','i18n.mjs','i18n-messages.mjs','appearance.mjs','appearance.css','management.mjs','management.css','record-dimensions.mjs','report.css','report.mjs')}
PATCHES={'server/app.mjs','server/extensions.mjs','server/schema.sql','server/grant.mjs','deploy/compose.sh','deploy/backup.sh'}
NEW={'server/calculation-history.mjs','server/management.mjs','server/report-export.mjs','deploy/management-backup.py','deploy/record-backup.py','deploy/install-management-backup.py','compose.management.yaml'}
ALLOWED=FRONTEND|PATCHES|NEW
def digest(data):return hashlib.sha256(data).hexdigest()
def normalized(data):
    def clean(m):
        p=urlsplit(m[2]);return m[1]+urlunsplit(p._replace(query=urlencode([(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if k!='v'])))+m[1]
    return re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css)(?:\?[^"'\s]*)?)\1''',clean,data.decode()).encode()
def safe(root,name):
    if name not in ALLOWED:raise ValueError('Unexpected file: '+name)
    target=root/name
    for path in [target,*target.parents]:
        if path==root.parent:break
        if path.is_symlink():raise ValueError('Symlink: '+name)
    if target.exists() and not target.is_file():raise ValueError('Not a regular file: '+name)
    return target
def load(root,bundle):
    manifest=json.loads((bundle/'manifest.json').read_text())
    if manifest.get('format')!=1 or set(manifest['files'])!=ALLOWED:raise ValueError('Invalid bundle manifest')
    changes=[]
    for name,info in manifest['files'].items():
        target=safe(root,name);current=target.read_bytes() if target.exists() else None
        if info['kind']=='patch':
            if name not in PATCHES or current is None:raise ValueError('Patch target missing: '+name)
            value=current.decode()
            for op in info['operations']:
                old,new=op['old'],op['new']
                if new in value:
                    if value.count(new)!=1:raise ValueError('Ambiguous installed patch: '+name)
                    continue
                if not old or value.count(old)!=1:raise ValueError('Source differs; no files changed: '+name)
                value=value.replace(old,new,1)
            data=value.encode()
        else:
            data=(bundle/'payload'/name).read_bytes()
            if digest(data)!=info['sha256']:raise ValueError('Bundle checksum mismatch: '+name)
            if current==data:continue
            candidates=info['bases']
            actual=digest(normalized(current)) if current is not None and name in FRONTEND else digest(current) if current is not None else None
            if actual not in candidates:raise ValueError('Source differs; no files changed: '+name)
        if data!=current:changes.append((name,target,current,data))
    return manifest,changes
def restore(root,backup):
    receipt=json.loads((backup/'receipt.json').read_text())
    if receipt['root']!=str(root):raise ValueError('Backup belongs to another project')
    changes=[]
    for name,info in receipt['files'].items():
        target=safe(root,name);current=target.read_bytes() if target.exists() else None
        if current is None or digest(current)!=info['installed']:raise ValueError('Rollback stopped: modified file '+name)
        data=(backup/'original'/name).read_bytes() if info['original'] is not None else None
        if data is not None and digest(data)!=info['original']:raise ValueError('Backup checksum mismatch: '+name)
        changes.append((name,target,current,data))
    return receipt,changes
def apply(changes,modes=None):
    prepared=[]
    try:
        for name,target,old,data in changes:
            target.parent.mkdir(parents=True,exist_ok=True)
            if data is None:prepared.append((target,None));continue
            fd,tmp=tempfile.mkstemp(prefix='.management-',dir=target.parent)
            with os.fdopen(fd,'wb') as f:f.write(data)
            mode=(modes or {}).get(name,target.stat().st_mode&0o777 if target.exists() else 0o644)
            os.chmod(tmp,mode)
            if target.exists():os.chown(tmp,target.stat().st_uid,target.stat().st_gid)
            prepared.append((target,Path(tmp)))
        for target,tmp in prepared:
            if tmp is None:target.unlink()
            else:os.replace(tmp,target)
    except BaseException:
        for name,target,old,_ in changes:
            if old is None:target.unlink(missing_ok=True)
            else:target.write_bytes(old)
        raise
    finally:
        for _,tmp in prepared:
            if tmp is not None:tmp.unlink(missing_ok=True)
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--bundle',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--apply',action='store_true');p.add_argument('--rollback',type=Path);p.add_argument('--receipt',type=Path);args=p.parse_args()
    if args.root.is_symlink():raise ValueError('Project symlink rejected')
    root=args.root.resolve()
    if json.loads((root/'package.json').read_text()).get('name')!='tsuull-oquv-erp':raise ValueError('ERP project required')
    if args.rollback:
        receipt,changes=restore(root,args.rollback.resolve())
        if args.apply:apply(changes,{n:i['mode'] for n,i in receipt['files'].items()})
        print('ROLLBACK:',len(changes),'files'+(' restored' if args.apply else ' verified'));return
    manifest,changes=load(root,args.bundle.resolve());result={'version':manifest['version'],'changes':len(changes),'backup':None}
    print('TEKSHIRUV O‘TDI:',len(changes),'fayl. Excel yordamchisi, Caddy, .env va mavjud yozuvlar saqlanadi.')
    if args.apply and changes:
        backup=root/('management-upgrade-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'));backup.mkdir(mode=0o700)
        receipt={'root':str(root),'version':manifest['version'],'files':{}}
        for name,target,old,data in changes:
            mode=target.stat().st_mode&0o777 if target.exists() else 0o644
            receipt['files'][name]={'original':digest(old) if old is not None else None,'installed':digest(data),'mode':mode}
            if old is not None:
                saved=backup/'original'/name;saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,saved)
        (backup/'receipt.json').write_text(json.dumps(receipt,indent=2))
        apply(changes);result['backup']=str(backup);print('KOD ZAXIRASI:',backup)
    if args.receipt:args.receipt.write_text(json.dumps(result))
    if not changes:print('Paket allaqachon o‘rnatilgan.')
if __name__=='__main__':
    try:main()
    except (ValueError,OSError,KeyError) as e:raise SystemExit(str(e))
