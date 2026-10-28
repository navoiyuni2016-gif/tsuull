#!/usr/bin/env bash
# Run manually inside the Ubuntu guest, never on the Proxmox/Debian host.
set -euo pipefail
[[ ${EUID} -eq 0 ]] || { echo 'sudo bash deploy/install-docker-ubuntu.sh bilan ishlating.' >&2; exit 1; }
[[ -r /etc/os-release ]] || { echo 'Ubuntu aniqlanmadi.' >&2; exit 1; }
# Trusted OS-owned distribution metadata.
. /etc/os-release
[[ "${ID:-}" == ubuntu ]] || { echo 'Bu skript faqat Ubuntu VM uchun. Proxmox hostida ishlatmang.' >&2; exit 1; }
[[ "${VERSION_CODENAME:-}" =~ ^[a-z]+$ ]] || exit 1
if command -v docker >/dev/null; then
 if docker compose version >/dev/null 2>&1; then echo 'Docker va Compose mavjud; paketlar o‘zgartirilmadi.'; exit 0; fi
 echo 'Docker mavjud, lekin Compose v2 yo‘q. Mavjud Docker o‘rnatishini tekshirtirib, Compose v2 qo‘shing; skript uni almashtirmaydi.' >&2; exit 1
fi
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
key_temp="$(mktemp)"
trap 'rm -f -- "$key_temp"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 https://download.docker.com/linux/ubuntu/gpg -o "$key_temp"
fingerprint="$(gpg --batch --show-keys --with-colons "$key_temp" | awk -F: '$1=="fpr" {print $10;exit}')"
[[ "$fingerprint" == 9DC858229FC7DD38854AE2D88D81803C0EBFCD88 ]] || { echo 'Docker rasmiy GPG fingerprinti kutilgan qiymatga mos emas. O‘rnatish to‘xtadi.' >&2; exit 1; }
if [[ -f /etc/apt/keyrings/docker.asc ]]; then
 old_fingerprint="$(gpg --batch --show-keys --with-colons /etc/apt/keyrings/docker.asc | awk -F: '$1=="fpr" {print $10;exit}')"
 [[ "$old_fingerprint" == "$fingerprint" ]] || { echo 'Mavjud Docker keyring almashtirilmadi; tekshirish kerak.' >&2; exit 1; }
else
 install -m 0644 "$key_temp" /etc/apt/keyrings/docker.asc
fi
architecture="$(dpkg --print-architecture)"
if [[ -e /etc/apt/sources.list.d/docker.list || -e /etc/apt/sources.list.d/docker.sources ]]; then
 echo 'Mavjud Docker APT manbasi topildi. Uni tekshirmasdan almashtirish bajarilmadi.' >&2; exit 1
fi
( set -o noclobber
 cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $VERSION_CODENAME
Components: stable
Architectures: $architecture
Signed-By: /etc/apt/keyrings/docker.asc
EOF
)
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version
echo 'Docker tayyor. Keyingi qadam: sudo bash deploy/install.sh --offline'
