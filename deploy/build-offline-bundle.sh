#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
mkdir -p images
images=(tsuull-erp:3.0.0 postgres:17-alpine caddy:2-alpine)
for image in "${images[@]}"; do
 arch="$(docker image inspect "$image" --format '{{.Architecture}}')"
 [[ "$arch" == amd64 ]] || { echo "Unexpected architecture for $image" >&2; exit 1; }
done
temp_file="$(mktemp "$project_root/images/runtime-images.tar.gz.XXXXXX")"
trap 'rm -f -- "$temp_file"' EXIT
docker save "${images[@]}" | gzip -1 > "$temp_file"
mv -- "$temp_file" images/runtime-images.tar.gz
(cd images && sha256sum runtime-images.tar.gz > runtime-images.sha256)
docker image inspect "${images[@]}" --format '{{json .RepoTags}} {{.Id}} {{.Os}}/{{.Architecture}}' > images/runtime-manifest.txt
printf '%s\n' 'Offline image bundle written and SHA256 recorded.'
