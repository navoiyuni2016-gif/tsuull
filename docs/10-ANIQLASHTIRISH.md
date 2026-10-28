# 10. Ochiq savollar, haqiqiy ma’lumotlarni yig‘ish va loyiha chegarasi

Bu hujjat 'hech narsa qolib ketmasin' talabi uchun bosh nazorat varag‘i. Noma’lum narsani taxmin qilish o‘rniga mahsulot boshlanishidan oldin javob to‘planadi.

## 10.1. O‘quv bo‘limidan olinadigan materiallar
- [ ] O‘quv bo‘limining **rasmiy nizomi**, lavozim yo‘riqnomalari va vakolatlar.
- [ ] Amaldagi barcha o‘quv reja Excel andozalari: bakalavr/magistr, kunduzgi/sirtqi/kechki/masofaviy (mavjudlariga qarab), har qabul yili.
- [ ] O‘quv reja tasdiqlash tartibi; Kengash bayonnomasi rekvizitlari.
- [ ] 3076 ilovasi asosida universitetda tasdiqlangan barcha vaqt me’yorlari; istisno va local qarorlar.
- [ ] O‘qituvchilar bo‘yicha rejalashtirish va bajarilgan yuklama Excel.
- [ ] O‘qituvchi lavozimi/stavka/ilmiy daraja/kompetensiya va capacity ma’lumot manbasi.
- [ ] Fan katalogi, majburiy/tanlov kategoriyalari, oldindan talab fanlari.
- [ ] Guruh va potok tashkil etish amaliyoti, haqiqiy talabalar soni, kichik guruh qoidalari.
- [ ] O‘quv yili/akademik kalendar, semestr va imtihon davrlari.
- [ ] Kafedralar/fakultetlar topshiradigan hisobot namunalari va muddatlar.
- [ ] O‘quv bo‘limining yillik ish rejasi va ijro hujjati.
- [ ] Dars jadvali, auditoriya fondi va bandlikni kim boshqarishi, hozirgi Excel namunasi.
- [ ] Sillabus/fan dasturi o‘quv-uslubiy ta’minot reyestrlari.
- [ ] Amaliyot rejalari, tur va hisobotlari, kafedralar uchun sifat monitoring checklisti.
- [ ] O‘qitilgan fakt soatni qaysi tizim/hujjat tasdiqlaydi (o‘qitish dalili).
- [ ] HEMIS yoki boshqa manba bilan ulanish huquqi va mavjud texnik interfeys.
- [ ] Foydalanuvchi soni, server budjeti, hosting/data residency talablari.
- [ ] Rasmiy Excel/PDF hisobot dizayni va arxiv saqlash me’yorlari.

## 10.2. Har bir formula uchun aniqlanadigan punktlar
1. Qaysi qonuniy/universitet qaroriga asoslangan?
2. Qaysi daraja, shakl, yo‘nalish, qabul yili, semestrda amal qiladi?
3. Qiymat/kredit/foiz/limit aniq qanday?
4. Minimum, maximum, istisno, yaxlitlash va half-week qoidasi qanday?
5. Fan tarkibi kim tomonidan tasdiqlanadi va qachondan kuchga kiradi?
6. Potok/guruh/kichik guruhni qanday ajratishadi?
7. Qaysi ish turi uchun 3076 bo‘yicha boshqa hisob birligi bor?
8. Qaysi Excel formula bilan hisoblangan, Excelda manual correction bo‘lganmi?
9. O‘zgarsa qaysi kafedra/o‘qituvchiga ta’sir qiladi?
10. Kim tasdiqlaydi, kim rad eta oladi, kim audit qiladi?

## 10.3. Mezonlar
**MUST**: dars va kafedra yuklamasi hisoblarining haqiqiy Excel/huquqiy me’yorlar bilan 100% mosligi, tasdiqlangan tarix saqlanishi, RBAC, import xatolari, audit, qayta hisoblash.  
**SHOULD**: full dashboard, rejalar, hisobotlar, report designer, notification.  
**COULD**: optimizer, HEMIS integratsiyasi, AI shablon tavsiyasi, anomaly prediction.

## 10.4. Loyiha chegarasi
Registrator ofisi va talabalar arizalari **kiritilmaydi**. To‘liq dars jadvali generatori va LMS ham dastlabki P0 qismiga kirmaydi; darsning reja/fakt ko‘rinishiga integratsiya orqali keyin bog‘lash mumkin.

## 10.5. Ustuvorlikdagi birinchi pilot
1 ta bakalavr dasturi + 1 fakultet + 1–2 kafedra + 1 o‘quv yili + haqiqiy maxfiylashtirilgan Excel. Shu kesimda `o‘quv reja→soat→potok→kafedra yuklamasi→shaxsiy yuklama→Excel/PDF` natijalarini moslashtirib keyin kengaytirish.

## 10.6. Asosiy risklar va yumshatish
| Risk | Ta’sir | Qarshi chora |
|---|---|---|
| Normativ noto‘g‘ri talqin | Soatlar xato | Normativ manbasi, universitet tasdig‘i, golden test |
| Excel shablonlari turlicha | Migratsiya uziladi | Mapping version, preview, errors |
| Ma’ruza potogi noto‘g‘ri sanaladi | Yuklama ko‘payib ketadi | Distinct stream IDs, duplicate rules |
| Qabul yillari normativlari farqli | Tarix buziladi | Effective-dated rule + curriculum revision |
| Xodimlarning Excelga o‘rganganligi | Qabul qilish past | UX, paste/import, dual-run, trening |
| Parallel tasdiqlash | Conflict/race | Opt. lock + transaction + audit |
| SuperAdminning cheksiz vakolati | Yashirin me’yor o‘zgarishi | 4-eyes va separation of duties |
| Real ijroni noto‘g‘ri avtomatlashtirish | Soxta KPI | Dalil+verifier, source-of-truth |
| Integratsiya ruxsatsiz | Ma’lumot sizishi | API contract & legal approval |

## 10.7. Ochiq qarorlar uchun ADR ro‘yxati
- ADR-001: backend ORM (Prisma/Drizzle) va migration strategiya.
- ADR-002: SSO/OIDC provider va MFA.
- ADR-003: Rule DSL AST schema va versioning.
- ADR-004: rasmiy Excel shablon writer.
- ADR-005: importni historical snapshot yoki live masterga qo‘llash siyosati.
- ADR-006: prorektor/kengash tasdiqi elektron shakli (vakolatga mos).
- ADR-007: data residency va backup hosting.
- ADR-008: operator rolidan normativ tasdiqlovchini ajratish.
