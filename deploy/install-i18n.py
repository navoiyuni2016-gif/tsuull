#!/usr/bin/env python3
"""Apply a verified frontend-only bundle; default is a read-only preflight."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ALLOWED = {'public/'+name for name in (
    'index.html','app.css','app.mjs','features.mjs','plan-studio.mjs',
    'i18n.mjs','i18n-messages.mjs','appearance.mjs','appearance.css')}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def without_asset_versions(data):
    """Accept the existing cache patch, but no other source drift."""
    text = data.decode('utf-8')
    def clean(match):
        quote, url = match.group(1), match.group(2)
        parts = urlsplit(url)
        query = [(k,v) for k,v in parse_qsl(parts.query, keep_blank_values=True) if k != 'v']
        return quote + urlunsplit(parts._replace(query=urlencode(query))) + quote
    return re.sub(r'''(["'])((?:\.?\.?/)[^"'\s]+\.(?:mjs|css)(?:\?[^"'\s]*)?)\1''', clean, text).encode()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True, help='Existing ERP project directory')
    parser.add_argument('--bundle', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--rollback', type=Path, help='Restore a backup created by this installer')
    args = parser.parse_args()
    root = args.root.resolve()
    package = json.loads((root/'package.json').read_text())
    if package.get('name') != 'tsuull-oquv-erp':
        raise SystemExit('ERP loyiha papkasi noto‘g‘ri.')
    manifest_path = args.rollback/'manifest.json' if args.rollback else args.bundle/'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    files = manifest['files']
    if not files or not set(files).issubset(ALLOWED):
        raise SystemExit('Paket fayllari ro‘yxati kutilgan shaklda emas.')
    changes = []
    already_current = 0
    for name, info in files.items():
        target = root/name
        if target.is_symlink() or target.parent.is_symlink():
            raise SystemExit('Symlink orqali o‘zgartirishga ruxsat yo‘q: '+name)
        current = target.read_bytes() if target.exists() else None
        if args.rollback:
            if current is None or digest(current) != info['sha256']:
                raise SystemExit('Rollback to‘xtadi: yangilanishdan keyin fayl o‘zgargan: '+name)
            data = (args.rollback/name).read_bytes() if info['base_sha256'] else None
            if data is not None and digest(without_asset_versions(data)) != info['base_sha256']:
                raise SystemExit('Zaxira tekshiruvi o‘tmadi: '+name)
        else:
            data = (args.bundle/'payload'/name).read_bytes()
            if digest(data) != info['sha256']:
                raise SystemExit('Paket hash tekshiruvi o‘tmadi: '+name)
            if current is not None and digest(current) == info['sha256']:
                already_current += 1
                continue
            expected = info['base_sha256']
            candidates = expected if isinstance(expected,list) else [expected]
            actual = digest(without_asset_versions(current)) if current is not None else None
            if actual not in candidates:
                raise SystemExit('Manba boshqacha; hech narsa almashtirilmadi: '+name)
        changes.append((name, target, data))
    if already_current and changes:
        raise SystemExit('Paket qisman mavjud. Avvalgi yangilanish zaxirasini tekshiring; hech narsa almashtirilmadi.')
    print('TEKSHIRUV O‘TDI:', len(changes), 'frontend fayl; server, Excel, Caddy va baza o‘zgarmaydi.')
    if not args.apply:
        print('Faqat tekshirildi. O‘rnatish uchun --apply ishlating.')
        return
    if not changes:
        print('Bu paket allaqachon o‘rnatilgan.')
        return
    backup = root/('i18n-upgrade-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(mode=0o700)
    backup_manifest = json.loads(json.dumps(manifest))
    originals = {}
    for name, target, _ in changes:
        originals[name] = target.read_bytes() if target.exists() else None
        backup_manifest['files'][name]['base_sha256'] = digest(without_asset_versions(originals[name])) if originals[name] is not None else None
        if target.exists():
            saved = backup/name
            saved.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(target, saved)
    (backup/'manifest.json').write_text(json.dumps(backup_manifest,ensure_ascii=False,indent=2))
    # Prepare every replacement before touching a project file. Recover on errors.
    staged = []
    try:
        for name, target, data in changes:
            if data is None:
                staged.append((name,target,None))
                continue
            fd, path = tempfile.mkstemp(prefix='.i18n-',dir=target.parent)
            with os.fdopen(fd,'wb') as handle:
                handle.write(data)
            os.chmod(path, 0o644)
            staged.append((name,target,Path(path)))
        for _, target, path in staged:
            if path is None:
                target.unlink()
            else:
                os.replace(path,target)
    except BaseException:
        for name, target, _ in changes:
            if originals[name] is None:
                target.unlink(missing_ok=True)
            else:
                target.write_bytes(originals[name])
        raise
    finally:
        for _, _, path in staged:
            if path is not None:
                path.unlink(missing_ok=True)
    print('TAYYOR. Kod zaxirasi:', backup)
    print('Ishlayotgan konteyner o‘zgarmadi. Keyingi qadam: backup, build va faqat app xizmatini yangilash.')

if __name__ == '__main__':
    main()
