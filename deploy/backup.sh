#!/bin/sh
set -eu
umask 077
project_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_root"
mkdir -p backups
backup_file="backups/erp-$(date -u +%Y%m%dT%H%M%SZ).dump"
if [ -f .env ] && [ -f .deploy-mode ]; then
    bash deploy/compose.sh exec -T db pg_dump -U erp_owner -d erp -Fc > "$backup_file"
else
    docker compose exec -T db pg_dump -U erp_owner -d erp -Fc > "$backup_file"
fi
if [ ! -s "$backup_file" ]; then
    rm -f "$backup_file"
    echo 'Backup failed' >&2
    exit 1
fi
printf 'Backup written: %s\n' "$backup_file"
