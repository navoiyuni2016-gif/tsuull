# 06. Xavfsizlik, sifat, operatsiya va standartlar

## 6.1. Xavfsizlik majburiy talablari
- Identity: SSO/OIDC qabul qilinadigan tashkilotda, yoki keyinchalik ulanadigan provider; MFA yuqori vakolatlarda majburiy.
- Authz: RBAC + Attribute-Based Scope (institution/faculty/department/year/object status), har endpointda server-side tekshirish, object-level authorization.
- Normativ tasdiqlash va yil lock/unlock uchun two-person rule / step-up authorization.
- Maxfiy ma’lumotni minimallashtirish, maxfiy maydonlarni maskalash, eksportlarni ruxsat va watermark bilan chiqarish.
- OWASP ASVS 5.0 asosida tekshiruv; dependency scanning, SAST/DAST, secrets scanning, CSP/CSRF/CORS policy, parametrli SQL, file scanning, rate limit.
- TLS, encrypted backups va object storage, secret manager, token rotation, audit append-only.
- Har bir normativ/yuklama o‘zgarishida kim, nima, qachon, eski/yangi ma’lumot, sabab, IP/request id (maxfiylikka mos) saqlanadi.
- Productionda auditni o‘chirish yoki retroaktiv o‘zgartirish huquqi hech kimga berilmasin.
- Shaxsga doir ma’lumotlar joylashuvi, saqlash muddati, shartnomalar va boshqa qonuniy talablar O‘RQ-547 va amaldagi hujjatlar bo‘yicha yuridik tekshiruvdan o‘tkazilsin.

## 6.2. Test piramidasi
- Unit: barcha soat formulalari, yarim soat/yaxlitlash, Decimal arithmetic, qoida precedence, pre-requisite DAG, conflict solver.
- Property-based: `contact + independent = total`, allocation sum invariants, credits>=0, retroactive snapshots stable.
- Integration: DB transaction, RBAC, workflow transition, queue outbox, Excel mapping, export.
- Golden Excel: haqiqiy (maxfiylashtirilgan) 5–10 xil real shablon bilan satrma-satr diff.
- E2E: SuperAdmin draft/approve rules, reja→load→report, audit, permission denial, version rollback/forward.
- Performance/load: kattaroq yuklama sonlari bilan dashboard va recalculation profiling; performance regression test.
- Security: OWASP ASVS tekshiruvi; IDOR, cross-faculty leakage, CSV injection, upload abuse, over-authorized admin.
- Accessibility: keyboard, screen-reader labels, contrast, responsive, WCAG 2.2 AA.

## 6.3. SLO va sinov mezonlari (taklif, haqiqiy infratuzilmaga qarab tasdiqlanadi)
- Oddiy ro‘yxat va dashboard API: warm-cache p95 <= 2 s (masalan 100 parallel foydalanuvchi bilan test).
- Import va recalculation: bloklamaydigan async worker, progress va xatolikni ko‘rsatish; katta import uchun alohida load-test target.
- Tizim mavjudligi: ish vaqtida maqsadli >= 99.9% (deployment/infratuzilma shartnomasi bilan tasdiqlanadi).
- **RPO** 24 soatdan kam emas — maqsadli <= 1 soat, **RTO** <= 4 soat deb rejalashtirish mumkin, lekin zaxira sxemasi va budjetga mos test bilan tasdiqlansin.
- Restore drill: har chorak; production release oldidan backup va rollback testi.
- 0 known critical/high security issues release gate.

## 6.4. DevOps
- Git branch protection; CODEOWNERS; commit/pull-request templates.
- `lint`, `typecheck`, `unit`, `integration`, `e2e`, `build`, `security`, `migration-check` CI pipeline.
- Dev/Test/Staging/Production alohida; prod ma’lumotlari developmentga nusxalanmaydi.
- `docker compose up` orqali local dev; seed va migratsiya bir buyruq.
- Structured logs + OpenTelemetry traces, metrics, alerts, queue DLQ, failed import count.
- Feature flags va rolling deployment; schema backward-compatible migration.
- DB va fayllar backup/restore runbook, incident response, emergency access (break glass) auditlangan.

## 6.5. Ma’lumotlarni boshqarish
- Data owner: O‘quv bo‘limi; system operator: universitet IT.
- Student aggregate counts — boshqa ishlar uchun PII yig‘ilmasin.
- Master: program/subject, teacher, academic year, normativ, department — har birida source-of-truth belgilansin.
- Retention: tasdiqlangan hujjat, hisoblash izi va audit saqlash muddati universitetning amaldagi arxiv siyosatiga ko‘ra; avtomatik o‘chirishdan oldin huquqiy ruxsat.
- Exports: scope filtering + who/why audit; signed URLs expire; mass export alohida ruxsat.

## 6.6. Normativ manbalar
- https://lex.uz/uz/acts/-5193564 (kredit-modul tartibi)
- https://lex.uz/uz/acts/-3967278 (3076, professor-o‘qituvchilar vaqt me’yorlari)
- https://lex.uz/uz/acts/-8117474 (3807, 2026-yilgi nizom)
- https://lex.uz/uz/acts/-4396419 (shaxsga doir ma’lumotlar)
- https://asvs.owasp.org/ (ASVS 5.0)
- https://www.w3.org/TR/WCAG22/ (WCAG 2.2)

**Amaliy qoidani faollashtirishdan oldin hujjatlarning amaldagi tahririni va o‘quv muassasasiga tatbiq etilishini tekshirish kerak.**
