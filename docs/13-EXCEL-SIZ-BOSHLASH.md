# 13. Excel fayllarisiz hozir bajariladigan ishlar

## A. Hozir qilish mumkin (Excel va institutsional me’yorlarga bog‘liq emas)

| Tarmoq | Real dasturda qilinadigan ish | Qabul mezoni |
| --- | --- | --- |
| Repo/CI | monorepo, build, lint, devcontainers/compose, CI | bitta buyruq bilan local run, PR test |
| Identity | tashkilotga mos login adapteri, MFA rejasi, sessiyalar | unauthorized + expired + revoked tests |
| Vakolatlar | rol va fakultet/kafedra/yil scope | cross-scope 403, full audit |
| Akademik katalog | universitet, fakultet, kafedra, fan va o‘quv yili CRUD | unique codes, effective dates, revision history |
| SuperAdmin | qoidalar draft, sozlama kiritish, preview, submit | approved qilmaguncha prod hisob yo‘q |
| Tasdiqlash | alohida akademik approver, four-eyes, immutability | author ≠ approver, audit |
| Reja/kalendar | yillik ish rejasi, mas'ul, deadline, status, dalil linki | permission & deadline tests |
| Hisobot | shablonlar yaratish, eksport struktura | ma'lumot bo‘lmasa empty state |
| Dashboard | ma’lumot kelishi, no-data, drilldown UI | haqiqiy KPI taxmin qilinmasin |
| Import platforma | .xlsx uploader, map/dry-run/preview, hash/anti-macro | haqiqiy golden-data keyinroq |
| Xavfsizlik | migrations, backup/restore playbook, secrets, observability | security acceptance gates |

## B. Hozir faqat simulyatsiya yoki shablon

- Kredit→soat, auditoriya/mustaqil ta’lim ulushi: explicit demo flag.
- Kafedra yuklama ish turlari: namuna koeffitsiyent, real qoida `BLOCKED`.
- Fan katalogi va o‘quv reja generatori: kiritilgan ma’lumot asosida draft, akademik tasdiqsiz kuchga kirmaydi.
- O‘qituvchi stavkasi, o‘quv soatlari limiti, potok/guruh ajratish: tasdiqlangan lokal qoidasiz `BLOCKED`.
- Excel template-mapping: haqiqiy fayl kelgandan keyin fingerprint, mapping va golden-test yakunlanadi.

## C. Qachon real ishlaydi?

1. O‘quv rejalar va yuklama shablonlari keladi → import mappingni solishtiramiz.
2. Universitet tasdiqlagan ichki normativlar keladi → har formula vakolatli xodim tomonidan tasdiqlanadi.
3. Bir yo‘nalishda parallel Excel vs ERP reconciliation o‘tkaziladi.
4. Farqlar zero yoki rasmiy kelishilgan tolerance bo‘lganda pilot qabul qilinadi.

## D. Asosiy qoida

`RuleSet` hech qachon demo dastlabki qiymatlardan production hisob chiqarishga ruxsat olmasin. Effective-date, source-ref, scope va approver talab qilinsin. Tasdiqlangan hujjatlar parametr o‘zgarishi bilan silently overwrite qilinmasin; yangi revision.
