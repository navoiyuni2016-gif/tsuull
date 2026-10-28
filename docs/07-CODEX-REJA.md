# 07. Codex uchun sprint-by-sprint ish rejasi

## 7.1. Codex bilan ishlash qoidasi
BARCHA kod bir yo‘la generatsiya qilinmaydi. Har sprint — kod + migratsiya + real UI + permission + tests + docs + reproducible run. Keyingi sprint oldingi sprint qabul testlari tugaguncha ochilmaydi. Dastlab hech qanday demo normani production uchun seed qilmasin.

## 7.2. Tech stack (baza)
Monorepo (`pnpm workspaces` / Turborepo mumkin), `apps/web` (Next.js+TS), `apps/api` (NestJS+TS), `apps/worker` (BullMQ), `packages/domain` (pure Decimal calculation), `packages/contracts` (schema/OpenAPI), PostgreSQL, Redis, S3-compatible local MinIO, Docker Compose, CI. DB access uchun Prisma yoki Drizzle — birini konsept/transactions/complex constraintsga qarab tanlab ADR yozish; dinamik normativlar JSON Schema. Testing: Vitest/Jest + Supertest + Playwright, DB integration via isolated test container. Barcha fixed versions lock-file bilan.

## 7.3. Sprintlar / Gate
| Sprint | Vazifa | Demo output | Gate |
|---|---|---|---|
| 00 | Discovery, Excel audit va me’yor mapping | real anonymized golden datasets, domain glossary, ADR | no critical unanswered formula |
| 01 | Monorepo, auth, RBAC, metadata, audit, DB | login, org/faculty/dept/year CRUD | permission negative tests |
| 02 | RuleSet manager, versioning, validation, calculations core | SuperAdmin draft, approval, effective rules, simulation | no `eval`; time travel tests |
| 03 | Fan katalogi va o‘quv reja generator | curriculum wizard, credit validation, versions, approval | totals and prerequisite tests |
| 04 | Contact/self hours, potok va guruhlar | subject hour breakdown and stream editor | teaching load vs student load distinction |
| 05 | Kafedra yuklamasi, qo‘shimcha ish me’yorlari | department load and full trace | 3076 mapping golden tests |
| 06 | Staff and assignment, conflicts | teacher assignment, unassigned hours, approvals | under/over allocation tested |
| 07 | Excel import/eksport, reconciliation | real workbook import, error UI, XLSX output | source equality and idempotency |
| 08 | Yillik ish reja, ijro | tasks, proofs, planned-vs-actual | evidence and status checks |
| 09 | Kafedra/fakultet hisobotlari | period close, submission, multi-scope aggregation | correct snapshots and scoped RBAC |
| 10 | Dashboard, analytics, as-of lineage | drill-down, KPI, anomalies | no misleading denominators |
| 11 | Integratsiya adapterlari, monitoring, i18n, a11y, backup | staging release | security/load/restore gate |
| 12 | Real pilot → dual run → production cutover | signed reconciliation, support runbooks | owner acceptance |
| 13 | Dars jadvali va auditoriya bandligi | conflicts, room utilization, schedule export | double-booking test |
| 14 | Sillabus va metodik hujjatlar | completeness, version, review states | curriculum-hour consistency |
| 15 | Amaliyotlar va sifat monitoringi | practical plans, observations, improvement tasks | evidence and workflow tests |
| 16 | Resurs prognozi / optimizer | auditable scenario comparisons | constraints and reviewer approval |

### Sprint 00 Codex prompt — tashxis
```
Sen senior solution architect, education-domain analyst va QA mutaxassisisan.
`README.md` va docs/01..10 ni o‘qi. Faqat O‘quv bo‘limi doirasida qol.
Hozir hech qanday ishlab chiqarish hisob normasini o‘ylab topma va prod kod yozma.
Berilgan anonymized Excel shablonlarini inventarizatsiya qil:
- workbook/sheet/ustun/formula/hidden/merged-cell/total mapping,
- ichki nizomga bog‘liq har bir hisob formulasini top,
- har biri uchun source→target diagram, ambiguity log va golden scenarios yoz.
Natija: docs/ADRs, discovery matrix va test fixtures; ochiq savollarni nomma-nom yoz.
Har ma’lumot uchun qayerdan kelgani va ishonchlilik holatini belgila.
```

### Sprint 01 Codex prompt — platforma bazasi
```
`README.md`, `AGENTS.md`, `docs/01-TTZ.md`, `docs/03-MALUMOTLAR-BAZASI.md` ni o‘qi.
Next.js+NestJS+Postgres+Redis+MinIO modular-monolith monorepo yarat.
Auth (dev mock, prod OIDC adapter), RBAC+faculty/department/year scoping, migration,
audit append-only, seeded demo university metadata, health checks, OpenAPI,
Docker Compose va CI pipeline bo‘lsin. Registrator yoki talaba arizasi moduli yo‘q.
Har endpointga unauthorized/cross-department integration test yoz.
README run instructions, migrations, test commands va ADR chiqarsin.
Natija kompilyatsiya bo‘lsin, unit+integration+e2e smoke testlar o'tsin.
```

### Sprint 02 Codex prompt — normativ yadrosi
```
`docs/02-HISOBLASH-QOIDALARI.md` ni qat’iy asos qil.
RuleSet/Parameter/Formula (safe AST, `eval` yo‘q), precedence, overlap detection,
Decimal accounting, rounding policy, effective dating, review & approve workflow,
version pinning, what-if simulation, dependency diff, calculation lineage yarat.
SuperAdmin faqat draft tayyorlay oladi; akademik tasdiqlovchi faollashtiradi.
Locked approved snapshot tarixiy qayta hisoblansin deb o‘zgarmasin.
`fixtures/demo-scenario.json` uchun 180/72/108 va bazaviy 144 soatni unit testda isbotla.
Haqiqiy qonuniy me’yorlarni hardcode qilma. APIs va UI sahifani yarat.
```

### Sprint 03–04 Codex prompt — o‘quv reja va soat
```
O‘quv reja generatorini curriculum revision + subjects catalog + template +
prerequisite DAG + semester credit constraints orqali qur. Fan tarkibi hech qachon
AI yoki ixtiyoriy taxmin asosida tasdiqlanmasin. Reja draft/generate/validate/
submit/approve/export workflow, izohli xatolar va oldingi revision diff bo‘lsin.
Contact/self hours va activity breakdown Decimal bilan hisoblanadi; fan soati
bilan professor-o‘qituvchi yuklamasi bir xil ko‘rsatkich emas. Talabaning
mustaqil soati professor yuklamasiga qo‘shilmasin. O‘zbekcha UI + tests.
```

### Sprint 05–06 Codex prompt — kafedra va o‘qituvchi yuklamasi
```
Har bir work type 3076 va universitet tasdiqlagan norma versiyasi bilan
konfiguratsiyada belgilanadi. Lecture streams, practice groups, lab subgroups,
additional work type, department required load va teacher assignment qur.
Kafedra talab qilingan, taqsimlangan, bo‘sh va fakt soatlari alohida.
Instructor qualification, capacity, scope, workload conflicts, manual locks,
review/approval workflow, immutable approved revision va full trace bo‘lsin.
Avtomatik taqsimlash tavsiya beradi, yakuniy qaror xodimda.
`docs/08-QABUL-TESTLARI.md`ga mos integration+golden tests yoz.
```

### Sprint 07 Codex prompt — Excel migratsiya
```
`docs/05-EXCEL-MIGRATSIYA.md`ni implementatsiya qil.
.xlsx parser, sheet fingerprint, mapping versions, dry-run, per-cell errors,
preview, idempotent commit, import audit, dedupe va reconciliation receipt.
Makrolarni bajarish taqiqlansin, xlsm content never execute. Export safe XLSX;
source Excel original hash arxivda. Noma’lum formula/normalar bloklovchi xato.
Real anonymized golden Excel files bilan exact reconciliation test bo‘lsin.
```

### Sprint 08–10 Codex prompt — monitoring va tahlil
```
Yillik ish reja va dalilli ijro, period/cafedra/fakultet reports, snapshot,
review/approve, dashboard KPIs, breakdown drill-down, filters, source lineage
va export yarat. Reja avtomatik ravishda faktga aylanmaydi.
O‘qituvchining fakt soati faqat tekshirilgan dalil asosida kiritiladi.
Bir kafedra boshqa kafedra ma’lumotini API yoki eksport orqali ola olmasin.
Dashboarddagi barcha raqamlar uchun as-of, denominator va manba ko‘rsatilsin.
```

### Sprint 11–12 Codex prompt — production gate
```
OWASP ASVS 5.0, WCAG 2.2 AA, DB migrations, object storage security,
backup/restore drill, load tests, SAST/DAST, incidents/runbooks, audit review,
observability, locale uz, permission matrix va anonymized golden acceptance
ro‘yxatini tekshir. Dastlab stagingga chiq. Pilotda Excel va ERP parallel
natijalarini satr-satr solishtir. Blocker qolsa production deploy qilma.
```

## 7.4. Umumiy tugallash prompti (har sprint oxirida)
```
1. O‘zgartirilgan fayllar va architecture summary.
2. Barcha run/test/build komandalari va natijasi; o'tmagan testni yashirma.
3. Yangi DB migratsiya va backward compatibility.
4. Qaysi talab IDs (docs/01, docs/08) bajarildi.
5. Security, permissions, audit, API docs va localization cheklisti.
6. Nima qolganini backlogga aniq ticket va acceptance criteria bilan yoz.
7. Agar kerakli Excel yoki ichki normativ yo‘q bo‘lsa taxminiy normani
   production'da ishlatmay, demo flag va BLOCKED state bilan ko‘rsat.
```
