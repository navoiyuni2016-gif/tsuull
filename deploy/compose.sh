#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
mode=standalone
if [[ -f "$project_root/.deploy-mode" ]]; then mode="$(cat -- "$project_root/.deploy-mode")"; fi
args=(--project-directory "$project_root" --env-file "$project_root/.env" -p "${ERP_COMPOSE_PROJECT:-tsuull-erp}" -f "$project_root/compose.yaml")
case "$mode" in
 standalone) ;;
 proxy) args+=(-f "$project_root/compose.proxy.yaml") ;;
 cert) args+=(-f "$project_root/compose.cert.yaml") ;;
 *) echo 'Invalid .deploy-mode; use standalone, proxy or cert.' >&2; exit 1 ;;
esac
if [[ -f "$project_root/compose.management.yaml" ]]; then args+=(-f "$project_root/compose.management.yaml"); fi
exec docker compose "${args[@]}" "$@"
