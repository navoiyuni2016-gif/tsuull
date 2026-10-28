#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -t 0 ]]; then echo 'Superadmin yaratish uchun interaktiv terminal kerak.' >&2; exit 1; fi
read -r -p 'Superadmin email: ' USER_EMAIL
read -r -p 'Superadmin F.I.Sh.: ' USER_NAME
read -r -s -p 'Parol (kamida 14 belgi): ' USER_PASSWORD
printf '\n'
read -r -s -p 'Parolni yana kiriting: ' password_confirmation
printf '\n'
[[ "$USER_PASSWORD" == "$password_confirmation" && ${#USER_PASSWORD} -ge 14 ]] || { echo 'Parollar mos emas yoki qisqa.' >&2; exit 1; }
unset password_confirmation
export USER_EMAIL USER_NAME USER_PASSWORD
export USER_ROLE=ADMIN
trap 'unset USER_EMAIL USER_NAME USER_PASSWORD USER_ROLE' EXIT
"$project_root/deploy/compose.sh" exec -T -e USER_EMAIL -e USER_NAME -e USER_PASSWORD -e USER_ROLE app node server/create-user.mjs
