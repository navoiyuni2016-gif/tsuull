# 04. API, statuslar va jarayonlar

## 4.1. API prinsiplari
Base `/api/v1`, JSON+ISO-8601 (timezone explicit), decimal qiymatlar string (`"144.00"`), cursor pagination, sortable/filterable list, RBAC+scope, RFC 9457 Problem Details xato javobi, `X-Request-ID`; create/approve/recalculate import uchun `Idempotency-Key`; ETag/If-Match bilan optimistic concurrency. OpenAPI avtomatik yangilanadi.

## 4.2. Endpointlar xaritasi
| Modul | Endpointlar (namunaviy) | Role |
|---|---|---|
| Identity | `GET /me`, `GET /permissions`, `GET /scopes` | barcha |
| Ma’lumotnoma | `GET/POST /academic-years`, `/faculties`, `/departments`, `/programs`, `/subjects`, `/staff`, `/groups` | scope bo‘yicha |
| Rules | `GET/POST /rule-sets`, `GET /rule-sets/:id/diff`, `POST /rule-sets/:id/validate`, `/simulate`, `/submit`, `/approve`, `/activate` | admin/academic approver |
| Curricula | `POST /curricula`, `POST /curricula/:id/revisions`, `GET /curricula/:id/revisions/:rid`, `POST /curriculum-revisions/:rid/validate`, `/generate`, `/submit`, `/approve` | planner/approver |
| Hours | `GET /curriculum-revisions/:id/hours`, `POST /curriculum-revisions/:id/recalculate` | planner |
| Groups | `GET/POST /offerings`, `/streams`, `/teaching-units`, `POST /streams/validate` | planner/kafedra |
| Workload | `POST /workloads/calculate`, `GET /workloads?scope=`, `POST /workload-assignments`, `POST /workload-plans/:id/submit`, `/approve` | kafedra/bo‘lim |
| Actuals | `POST /workload-actuals`, `POST /workload-actuals/:id/verify`, `GET /workload-actuals/differences` | reviewer |
| Annual | `GET/POST /annual-plans`, `/tasks`, `POST /tasks/:id/complete`, `/verify` | bo‘lim |
| Reports | `GET /report-templates`, `POST /report-runs`, `POST /report-runs/:id/approve`, `GET /report-runs/:id/export` | authorized |
| Dashboards | `GET /dashboards/summary?year=&faculty=&department=`, `/anomalies`, `/drilldown` | authorized |
| Import | `POST /imports`, `POST /imports/:id/preview`, `/validate`, `/commit`, `GET /imports/:id/errors`, `/status` | authorized |
| Export | `POST /exports`, `GET /exports/:jobId`, `GET /exports/:jobId/download` | authorized |
| Audit | `GET /audit-events?entity=&from=&to=` | auditor/admin (read-only) |
| Jobs | `GET /jobs/:id`, `POST /jobs/:id/cancel`, `POST /jobs/:id/retry` | owner/admin |

API nomlari texnik shablon; loyihada OpenAPI kontrakti orqali qat’iylashtiriladi. Export signed URL qisqa amal qiladi; kirish permissionga bog‘liq.

## 4.3. Status mashinalari
**RuleSet**: `DRAFT → REVIEW → APPROVED → EFFECTIVE → SUPERSEDED/ARCHIVED`. Rad etish `REVIEW → DRAFT_WITH_COMMENTS` orqali. `EFFECTIVE` kontent o‘zgarmaydi.

**CurriculumRevision**: `DRAFT → VALIDATED → SUBMITTED → REVIEWED → APPROVED → LOCKED → ARCHIVED`; qaytarish `SUBMITTED/REVIEWED → REVISION_REQUESTED`, yangi revision. Har bir transition uchun actor+reason+audit.

**WorkloadPlan**: `DRAFT → CALCULATED → ASSIGNMENT_IN_PROGRESS → SUBMITTED → VERIFIED → APPROVED → LOCKED`. Tasdiqdan so‘ng o‘zgartirish — yangi revision.

**Import**: `UPLOADED → SCANNING → PARSING → MAPPING → VALIDATING → PREVIEW → READY_TO_COMMIT → COMMITTING → COMPLETED`; `FAILED`, `CANCELLED`, `ROLLED_BACK` qoidalari.

**Report**: `DRAFT → COLLECTING → SUBMITTED → IN_REVIEW → APPROVED → FROZEN`. Hisobot qayta hisoblash faqat yangi report run.

**PlanTask**: `NOT_STARTED → IN_PROGRESS → SUBMITTED_FOR_VERIFICATION → VERIFIED`; `BLOCKED`, `REOPENED` alohida izoh bilan.

## 4.4. Muhim ish oqimlari
**A. O‘quv reja generatori:** planner dastur+shablonni tanlaydi → fan ro‘yxati va qoidalarni yuklaydi → draft generation → validatsiya → xatolarni tuzatish → submitted → akademik tekshiruv → approved+snapshot → load calculationga event.

**B. Kafedra yuklamasi:** approved curriculum revision → fan-soatlar breakdown → guruh/potok → work type calculation → department total → gap/duplicate check → assign staff → approval → freeze. `draft calculation` va `approved calculation` alohida.

**C. Normativ yangilanishi:** superadmin draft → preview impact → reviewer approve → effective date → `recalculation_requested` outbox event → worker draft versiyalarda hisoblaydi → comparison report → notification. Oldingi approved o‘zgarmaydi.

**D. Excel migratsiya:** upload → encrypted quarantine → parser+format fingerprint → header mapping → row validation+dedup → golden totals reconciliation → preview → commit → audit, file hash → historical snapshot. Import kelishilgan scopega yozadi, boshqa fakultetga emas.

**E. Yillik rejalar:** akademik yil uchun template → mas’ul va muddat → reminder → dalil → tekshiruvchi approve → annual metrics snapshot.

## 4.5. Domen eventlari
`RuleSetActivated`, `CurriculumRevisionApproved`, `CourseHoursCalculated`, `StreamCompositionChanged`, `DepartmentLoadCalculated`, `TeacherAssignmentApproved`, `ActualWorkVerified`, `AnnualTaskVerified`, `ReportApproved`, `ImportCommitted`.

Eventlar DB outbox jadvali bilan transactional publish; consumerlar idempotent; retry + dead-letter queue; `event_id` va `causation_id` saqlanadi. Materialized reportlar faqat tegishli eventdan keyin yangilanadi.

## 4.6. Mas’uliyat va ajratish
CRUD huquqi hujjatni tasdiqlash huquqiga teng emas. Masalan `SuperAdmin` normativni kiritadi, lekin akademik kengash vakolati talab qilinadigan qoida yoki reja uchun tasdiqlash vakolatini o‘ziga avtomatik bera olmaydi. API’da barcha transitionlar domen servisda tekshiriladi.
