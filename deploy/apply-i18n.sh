#!/usr/bin/env bash
# Run from the extracted localization bundle. Updates only the app container.
set -euo pipefail
bundle="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project="$(cd -- "${1:?ERP loyiha papkasini ko‘rsating}" && pwd)"
cd "$project"
exec 9>"$project/.i18n-deploy.lock"
flock -n 9 || { echo 'Boshqa til yangilanishi ishlayapti.' >&2; exit 1; }
python3 "$bundle/install.py" --root "$project"
# Keep the running image even if a previous build replaced the shared tag.
if [[ ! -f "$bundle/previous-image.txt" ]]; then
    app_container="$(bash deploy/compose.sh ps -q app)"
    [[ -n "$app_container" ]] || { echo 'Ishlayotgan app konteyner topilmadi.' >&2; exit 1; }
    app_image="$(docker inspect --format '{{.Image}}' "$app_container")"
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    previous_image="tsuull-erp:i18n-before-${stamp}"
    docker image tag "$app_image" "$previous_image"
    printf '%s\n' "$previous_image" > "$bundle/previous-image.txt"
else
    previous_image="$(cat "$bundle/previous-image.txt")"
    case "$previous_image" in tsuull-erp:i18n-before-*) ;; *) exit 1 ;; esac
    docker image inspect "$previous_image" >/dev/null
fi
bash deploy/backup.sh
python3 "$bundle/install.py" --root "$project" --apply
bash deploy/compose.sh build migrate
bash deploy/compose.sh up -d --no-deps --force-recreate --wait --wait-timeout 90 app
bash deploy/compose.sh ps
printf 'TAYYOR. Oldingi Docker tasviri: %s\n' "$previous_image"
