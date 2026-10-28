# Codex — hozir boshlash prompti (Excel mavjud emas)

Repo ichidagi `AGENTS.md`, `README.md`, `docs/01-TTZ.md`, `docs/03-MALUMOTLAR-BAZASI.md`, `docs/06-XAVFSIZLIK-VA-DEVOPS.md`, `docs/08-QABUL-TESTLARI.md`, `docs/13-EXCEL-SIZ-BOSHLASH.md` fayllarini o‘qi. `prototype/` UI maketi va `packages/domain/src/core.mjs` esa vaqtinchalik demonstrator: production kod shu demoga bog‘liq qolmasin. Tizim faqat O‘quv bo‘limi uchun, Registrator ofisi va talaba arizalari yo‘q.

**Vazifa: Sprint 01 ni bajar.** Next.js + TypeScript frontend; NestJS REST API + OpenAPI; PostgreSQL migration; Redis va S3-compatible dev services (kelajak uchun), modular monolith; secure authentication adapter + local-dev mock faqat DEVda; server-side RBAC + faculty/department/year scope; append-only audit; catalog CRUD (institut/fakultet/kafedra/o‘quv yili); rule-set draft va four-eyes approval uchun persistence; no-data dashboard; Uzbek-Latin UI; responsive WCAG 2.2 AA; docker-compose; CI; scripts va tests.

**Alohida shartlar:**
- Hech qanday normativni production defaults sifatida taxmin qilma.
- Normativ va koeffitsiyentlar explicit `DEMO`, `DRAFT`, `SUBMITTED`, `APPROVED` holatlar bilan boshqarilsin.
- Faqat `APPROVED`, qonuniy/asos va effective-date bor, iste’molchi akademik scope'iga mos me’yor rasmiy hisobga ishlasin.
- SuperAdmin me’yor kiritishi mumkin, lekin o‘z normativini o‘zi approve qilmasin.
- UI yoki request'dagi rol ma’lumotiga ishonma, backend session/identitydan ol.
- Import endpointlar hozir stub + validatsiya/metadata bo‘lsin; haqiqiy Excel mapping keyin.
- Dastlabki SQL migratsiyani tekshir/review qil; zarurat bo‘lsa normal migration tizimiga ko‘chir. Har DB invariant uchun test.
- API endpoints uchun user/role matrix, cross-department permission negative tests, input validation, contract tests.
- Har bosqich uchun README, OpenAPI, migrations, unit/integration/e2e tests va commit-ready fayllar.

**Qabul:** local docker run; lint/build/test o'tadi; unauthorized request rad etiladi; audit yoziladi; approved qoidalarni editing qila olmaydi; two-person approval ishlaydi; demo parametrlarsiz production calculation `BLOCKED` qaytaradi. Yakunda buyruqlar/test natijalari, qolgan blockerlar va next sprintni ochiq ko‘rsat.
