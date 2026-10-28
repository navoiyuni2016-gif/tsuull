#!/usr/bin/env bash
# Ubuntu guest VM 102, devadmin@172.20.0.50; never run on the Proxmox host.
set -euo pipefail
umask 077
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_root"
mode=''; prepare_only=0; non_interactive=0; skip_admin=0; offline=0; allow_other_host=0; acme_contact=''
while [[ $# -gt 0 ]]; do
 case "$1" in
  --mode) [[ $# -ge 2 ]] || exit 2; mode="$2"; shift 2 ;;
  --prepare-only) prepare_only=1; shift ;;
  --non-interactive) non_interactive=1; shift ;;
  --skip-admin) skip_admin=1; shift ;;
  --offline) offline=1; shift ;;
  --allow-different-host) allow_other_host=1; shift ;;
  --acme-email) [[ $# -ge 2 ]] || exit 2; acme_contact="$2"; shift 2 ;;
  *) echo "Unknown option: $1" >&2; exit 2 ;;
 esac
done
for tool in docker openssl; do command -v "$tool" >/dev/null || { echo "$tool kerak. BOSHLASH.md dagi Ubuntu talablarini bajaring." >&2; exit 1; }; done
docker compose version >/dev/null
if [[ -f .deploy-mode ]]; then
 saved_mode="$(cat .deploy-mode)"
 if [[ -n "$mode" && "$mode" != "$saved_mode" ]]; then echo 'Mavjud HTTPS rejimi o‘zgartirilmadi. Avval BOSHLASH.md ni o‘qing.' >&2; exit 1; fi
 mode="$saved_mode"
fi
if [[ -z "$mode" ]]; then
 if [[ "$non_interactive" == 1 ]]; then echo '--mode standalone|proxy|cert ni tanlang.' >&2; exit 2; fi
 printf '%s\n' 'HTTPS varianti:' '  1) Shu VMda avtomatik sertifikat (80/443 public NAT/DNS kerak)' '  2) Mavjud HTTPS Nginx/proxy orqali' '  3) Universitet bergan sertifikat fayllari bilan'
 read -r -p 'Tanlang [1/2/3]: ' choice
 case "$choice" in 1) mode=standalone;; 2) mode=proxy;; 3) mode=cert;; *) echo 'Rejim tanlanmadi.' >&2; exit 2;; esac
fi
case "$mode" in standalone|proxy|cert) ;; *) echo 'Rejim noto‘g‘ri.' >&2; exit 2;; esac
mkdir .deploy-lock 2>/dev/null || { echo 'O‘rnatish qulfi bor. Boshqa o‘rnatish jarayoni ishlamayotganini tekshiring.' >&2; exit 1; }
temp_env=''
cleanup(){ [[ -z "$temp_env" ]] || rm -f -- "$temp_env"; rmdir .deploy-lock; }
trap cleanup EXIT
if [[ ! -f .env ]]; then
 if [[ "$mode" == standalone && -z "$acme_contact" ]]; then
  if [[ "$non_interactive" == 1 ]]; then echo 'Standalone uchun --acme-email haqiqiy-email kerak.' >&2; exit 2; fi
  read -r -p 'TLS sertifikat uchun administrator email: ' acme_contact
 fi
 if [[ "$mode" == standalone && ! "$acme_contact" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then echo 'Email shakli noto‘g‘ri.' >&2; exit 2; fi
 temp_env="$(mktemp "$project_root/.env.new.XXXXXX")"
 {
  printf 'DB_OWNER_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'APP_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'MFA_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
  printf '%s\n' 'ERP_DOMAIN=el.tsuull.uz' 'TARGET_SERVER_IP=172.20.0.50' 'BIND_ADDRESS=172.20.0.50' 'ERP_HTTP_PORT=80' 'ERP_HTTPS_PORT=443' 'APP_BIND_ADDRESS=127.0.0.1' 'APP_HTTP_PORT=8080'
  printf 'ACME_EMAIL=%s\n' "$acme_contact"
 } > "$temp_env"
 chmod 600 "$temp_env"
 ln -- "$temp_env" .env || { echo '.env allaqachon mavjud; yangi kalitlar qo‘llanmadi.' >&2; exit 1; }
 rm -f -- "$temp_env"; temp_env=''
 echo '.env yaratildi. Maxfiy kalitlar ekranga chiqarilmadi.'
else
 echo 'Mavjud .env va maxfiy kalitlar saqlandi.'
fi
# Only read non-secret settings; never source .env as executable shell code.
setting(){ awk -F= -v key="$1" '$1==key {sub(/^[^=]*=/,"");sub(/\r$/,"");print;exit}' .env; }
[[ "$(setting ERP_DOMAIN)" == el.tsuull.uz ]] || { echo 'Mavjud .env boshqa domenga tegishli. O‘zgartirish kiritilmadi.' >&2; exit 1; }
if [[ ! -f .deploy-mode ]]; then printf '%s\n' "$mode" > .deploy-mode; fi
"$project_root/deploy/compose.sh" config --quiet
if [[ "$prepare_only" == 1 ]]; then echo 'Tayyorlash va Compose validatsiyasi o‘tdi. Hech bir servis ishga tushirilmadi.'; exit 0; fi
docker info >/dev/null
if [[ "$allow_other_host" != 1 ]]; then
 command -v ip >/dev/null || { echo 'iproute2 kerak.' >&2; exit 1; }
 if ! ip -o -4 addr show | awk '{sub(/\/.*/,"",$4);print $4}' | grep -Fxq '172.20.0.50'; then
  echo 'Bu tizimda 172.20.0.50 manzili topilmadi. Proxmox HOSTda emas, VM 102 ichida ishlating.' >&2; exit 1
 fi
fi
if [[ "$mode" == cert ]]; then
 cert=deploy/certs/fullchain.pem; key=deploy/certs/privkey.pem
 [[ -f "$cert" && -f "$key" ]] || { echo 'deploy/certs/fullchain.pem va privkey.pem kerak.' >&2; exit 1; }
 openssl x509 -in "$cert" -noout -checkhost el.tsuull.uz >/dev/null
 openssl x509 -in "$cert" -noout -checkend 86400 >/dev/null
 cert_public="$(openssl x509 -in "$cert" -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256)"
 key_public="$(openssl pkey -in "$key" -pubout -outform DER | openssl dgst -sha256)"
 [[ "$cert_public" == "$key_public" ]] || { echo 'Sertifikat va private key mos emas.' >&2; exit 1; }
fi
if [[ "$offline" == 1 ]]; then
 [[ -f images/runtime-images.tar.gz && -f images/runtime-images.sha256 ]] || { echo 'Offline obrazlar fayli yetishmaydi.' >&2; exit 1; }
 (cd images && sha256sum -c runtime-images.sha256)
 architecture="$(docker info --format '{{.Architecture}}')"
 [[ "$architecture" == x86_64 || "$architecture" == amd64 ]] || { echo 'Offline paket Linux amd64 uchun. Boshqa platformada online build ishlating.' >&2; exit 1; }
 docker load --input images/runtime-images.tar.gz
else
 "$project_root/deploy/compose.sh" build
 "$project_root/deploy/compose.sh" pull db
 [[ "$mode" == proxy ]] || "$project_root/deploy/compose.sh" pull caddy
fi
# Back up an existing running database before applying migrations; never remove its volume.
existing_db="$("$project_root/deploy/compose.sh" ps -q db)"
if [[ -n "$existing_db" ]]; then "$project_root/deploy/backup.sh"; fi
"$project_root/deploy/compose.sh" up -d --no-build --pull never db migrate app
ready=0
for ((attempt=0; attempt<40; attempt++)); do
 if "$project_root/deploy/compose.sh" exec -T app node -e "fetch('http://127.0.0.1:8080/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then ready=1; break; fi
 sleep 2
done
[[ "$ready" == 1 ]] || { echo 'App tayyor bo‘lmadi. deploy/compose.sh logs --tail=60 app migrate bilan tekshiring.' >&2; exit 1; }
if [[ "$mode" != proxy ]]; then
 "$project_root/deploy/compose.sh" run --rm --no-deps --pull never caddy caddy validate --config /etc/caddy/Caddyfile
 "$project_root/deploy/compose.sh" up -d --no-build --pull never caddy
else
 echo 'Mavjud HTTPS proxyga deploy/nginx-location.conf bo‘limini moslab qo‘shing. Proxyni skript avtomatik o‘zgartirmaydi.'
fi
if [[ "$skip_admin" != 1 ]]; then
 admin_count="$("$project_root/deploy/compose.sh" exec -T app node --input-type=module -e "import {database} from './server/db.mjs';const p=database();try{console.log((await p.query(\"SELECT count(*) FROM portal.users WHERE role='ADMIN' AND active=true\")).rows[0].count);}finally{await p.end();}")"
 if [[ "$admin_count" == 0 ]]; then "$project_root/deploy/create-admin.sh"; else echo 'Superadmin hisobi mavjud; qayta yaratilmaydi.'; fi
fi
"$project_root/deploy/compose.sh" ps
printf '%s\n' 'Ilova va baza ishga tushdi. Tashqi DNS/HTTPS tekshiruvi:' '  https://el.tsuull.uz/health/ready' 'Superadmin parametrlari va universitet profilini kiriting.'
