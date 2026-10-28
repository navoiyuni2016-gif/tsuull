# Codex agent instructions — O‘quv bo‘limi ERP

1. Read `README.md`, `docs/01-TTZ.md`, `docs/02-HISOBLASH-QOIDALARI.md`, `docs/08-QABUL-TESTLARI.md` BEFORE writing code.
2. SCOPE: university O‘quv bo‘limi ONLY. Do NOT add Registrator ofisi, student applications, expulsions, fee accounting, full LMS.
3. Production calculations MUST use approved, versioned, effective-dated rules. NEVER hardcode an assumed legally required hours/credits/staff workload. Demo fixture config is NOT production default.
4. Student study hours, contact hours, departmental teaching demand, teacher allocation and verified actual hours are DIFFERENT measures. Maintain explicit types and units.
5. Use decimal-safe arithmetic, explicit rounding, no JS floating-point accounting, no `eval`/untrusted executable rule expressions.
6. All business records have source lineage, version, audit, permission checks. Approved reports/curricula and historical years are immutable snapshots.
7. SuperAdmin creates rule drafts; distinct academically authorized approver activates them. Four-eyes wherever institution policy requires.
8. No silent import. Excel input: classify, map, validate, preview, reconcile, commit. Macro execution prohibited. Import/export idempotent.
9. Modular-monolith boundary: domain services + pure calculation library + audited workflows + worker queue + PostgreSQL + OpenAPI.
10. No untested code. Add unit, integration, permission, E2E and golden Excel tests appropriate to every feature.
11. Source code, docs, UI text in coherent style. Default locale Uzbek Latin, timezone Asia/Tashkent, internal UTC.
12. Before each sprint: explain scope and assumptions; after: summary, tests run, limitations, new risks, blockers and accepted criteria.
13. If institutional Excel, law, curricula or approval authority are unknown, STOP that specific production rule and mark `BLOCKED`; don't invent numbers.
14. Do not place real personal data, passwords or private Excel attachments in repository fixtures or logs.
15. Prefer simple, explainable, testable logic over black-box ML/AI; assigners/solvers give auditable recommendations only.
