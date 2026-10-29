# v3 verification — 2026-10-28 (Asia/Tashkent)

All runtime evidence uses isolated PostgreSQL databases and synthetic fixtures. No university normative defaults are seeded.

## Automated suites

Fresh `npm test` with exported `TEST_DATABASE_URL`:

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Original fixed-point domain | 6 | 0 | 0 |
| Typed academic calculation and generator | 5 | 0 | 0 |
| Base server regression | 8 | 0 | 0 |
| Extended end-to-end API/database workflows | 12 | 0 | 0 |
| **Total** | **31** | **0** | **0** |

Extended tests cover Superadmin profile revision, typed manual parameters and independent approval, institutional 180/72/108 student-hours and 144 teaching-hours fixture, curriculum prerequisites/credit balance, approved teacher competencies, hour allocations, shared 10+26=36 lecture assignment with rejection of 10+27 overallocation, verified actuals, immutable report snapshots, additional-work unit/rate calculation, task evidence, scoped read/edit/export/history access, authorized paging snapshots invalidated by scope changes, XLSX export/reimport, dry-run without business writes, atomic/idempotent commit, invalid/cancelled import rejection, evidence BLOB hashes, year lock and TOTP/recovery replay protection.

## Browser checks

Both scripts were executed after the final local server restart:

- `tests/ui_server.py`: login, creation/edit, duplicates, reload persistence, references/tasks, exact filtered totals, CSV download, demo calculator, keyboard search, all sidebar destinations, audit, mobile menu, no horizontal document overflow, full-height white sidebar, logout. No JS/CSP errors observed.
- `tests/ui_v3.py`: save university profile, enter typed parameters through the form, independent approver in separate browser context, institutional 144-hour fixture output, download XLSX template, upload/map/dry-run/commit XLSX, personal profile, user scope controls and mobile Superadmin layout. No JS errors observed.

Screenshots contain only synthetic test data. MFA seeds/recovery codes are not captured in preview screenshots.

## Production container and operations

- Docker image `tsuull-erp:3.0.0` built with TLS verification and temporary proxy CA mount; image runs as non-root.
- Compose staging: PostgreSQL healthy, migration completed with exit 0, app started.
- Final image smoke executed inside the production container: login, Secure cookie, restricted `erp_app` DB role, bounded-worker XLSX parsing, mapping, dry-run, commit, original source-file archive, evidence BLOB upload, encrypted TOTP enrollment and recovery login.
- `deploy/backup.sh` dump restored into a separate fresh database. Counts match for all 9 tables: users, records, record_versions, audit, settings, settings_history, imports, files and year_locks. Evidence and original-XLSX byte totals also match. The MFA encryption key remains in separate secure configuration, not in the dump or distribution.
- Source syntax checks and `git diff --check` passed.
- `npm audit --omit=dev`: 0 known vulnerabilities in the installed locked dependency tree.

## Limits of this evidence

No real public domain/TLS issuance, university-specific Excel golden parity, full WCAG 2.2 AA audit, independent penetration test, large production benchmark, external HEMIS/SSO integration or institution product-owner signoff was performed. CI workflow is present but was not executed on GitHub. See `docs/16-RELEASE-STATUS.md` for exact supported semantics and boundaries; these tests do not certify every requirement in the original broad TTZ.

## el.tsuull.uz deployment package

Fresh checks for the VM-targeted installer:

- `python3 tests/deployment_test.py`: 6 checks passed for target domain/IP, standalone/proxy/certificate modes, secure independent generated keys, no default password, and preservation of existing configuration.
- `python3 tests/deployment_smoke.py`: offline image checksum/load, migrations, trusted local test-certificate hostname verification for `el.tsuull.uz`, HTTPS readiness, Secure/HttpOnly login, repeat install preserving credentials/account/database, and pre-migration backup all passed in a disposable local Docker project.
- The smoke test initially exposed inherited HTTP proxy forwarding of internal `app` traffic. Explicit `NO_PROXY`/`no_proxy` entries for Docker service names corrected it; the original full installation test then passed.
- Shell syntax and `git diff --check` passed.

No connection was made to the real `devadmin@172.20.0.50` VM: the managed environment has no VPN configuration or TCP grant for that private endpoint. No remote files, DNS/NAT settings, Proxmox configuration or real certificates were changed. The Ubuntu Docker-install helper was syntax checked but not executed on the user's Ubuntu guest. Offline images are Linux amd64; Docker Engine/Compose prerequisites must already exist or be installed on that VM.


## 2026-10-29 — native curriculum studio and optional local AI

- `npm test` with isolated `TEST_DATABASE_URL`: **40 passed** (6 core, 5 academic, 8 server, 12 extended, 3 studio unit, 6 studio integration), exit 0.
- `python tests/deployment_test.py`: **6 passed**, exit 0. Existing environment generation, TLS modes and secret preservation remain covered.
- `python tests/ui_studio.py /workspace/setup/studio-ui.env`: passed. Browser created a plan without a workbook, selected subjects/semesters, checked exact hours, reviewed a synthetic local-model contract response, explicitly applied/saved, removed/re-added a row with retained history, and submitted for independent approval. Desktop/mobile and no page JS errors.
- `python tests/ui_studio.py /workspace/setup/native-ui.env --without-ai`: passed. Same native workflow with AI disabled and deterministic recommendations; matches the university's current 2-vCPU/3-GB ERP VM configuration choice.
- Docker image `tsuull-erp:plan-studio-check` built successfully with the managed proxy CA; no TLS bypass. Build evidence `/workspace/setup/studio-build.log` is local and not committed.
- Initial tests detected save/UI races and a locked-year revision boundary; fixed, then the integrated tests above passed. AI invalid/disabled cases deliberately return 502/503 and are logged as expected errors in the integration run.
- **Not verified:** actual Ollama image/model deployment, model quality/latency, dedicated university AI server network access, or live deployment to `el.tsuull.uz`. User has deferred AI server setup; model IP/specification is unavailable. The optional local-AI API was tested with a synthetic local HTTP contract server, not an actual model.
- Archived plan rows use JSONB `_excluded` and retain snapshots/audit. Old application versions do not understand that marker; use the compatibility/rollback instructions in `docs/19-REJA-USTAXONASI-VA-AI.md`.
