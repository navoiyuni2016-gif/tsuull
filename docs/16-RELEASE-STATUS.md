# v3 — aniq imkoniyatlar va chegaralar

## Amalga oshirilgan va sinovdan o‘tgan

| Bo‘lim | Amaldagi xatti-harakat |
|---|---|
| Superadmin | Universitet profilini saqlash; qo‘lda typed me’yorlar; foydalanuvchi, rol va doiralar |
| Xavfsizlik | Login/logout, scrypt parol, sessiya bekor qilish, TOTP, bir martalik recovery, CSRF/origin, rate limit, CSP |
| Vakolat | Universitet/fakultet/kafedra/yil; yozuvlar, tarix, XLSX, fayllar, import va snapshotlarda server nazorati |
| Katalog | Fakultet, kafedra, yil, fan, guruh va o‘qituvchilar; dublikat, reference va yil cheklovlari |
| Me’yor | Qo‘lda kiritilgan kredit-soat, besh tur ulushi, sig‘imlar, yaxlitlash, yillik limit va kredit mezonlari; alohida tasdiq; davr konflikti |
| O‘quv reja | Qo‘lda qatorlar yoki generator tavsiyasi; prerequisite/sikl, semestr va jami kredit nazorati; akademik tasdiq |
| Hisob | Talaba jami/auditoriya/mustaqil soati va bazaviy o‘qitish talabi alohida; aniq fixed-point va izohli trace |
| Yuklama | Hisoblangan soatni tanlangan o‘qituvchiga loyiha qilish; fan vakolati, til, kafedra va yillik limit; takror biriktirishni bloklash |
| Qo‘shimcha ish | Tasdiqlangan vaqt me’yori, talaba/guruh/hodisa/fixed birligi, miqdor va yillik limit |
| Fakt va vazifa | Dalil hujjat IDsi/fayl, alohida tasdiq, reja soatidan oshmaslik; dalilsiz vazifa yakuni tasdiqlanmaydi |
| Hisobot | Reja va davrdagi tekshirilgan fakt manbalarini immutable approval snapshotiga olish |
| Excel | XLSX andoza, qo‘lda ustun mapping, dry-run, xatolar/jamilar, atomar commit, hash/manba fayl arxivi, kvitansiya va idempotency |
| Eksport | Joriy filtr bo‘yicha CSV/XLSX; XLSXda holat/versiya/manba va hisob ko‘rsatkichlari; barcha filtrlangan jadval qatorlarini brauzer orqali PDF/print |
| Fayllar | Vakolatli upload/download, format/hajm tekshiruvi va SHA256; bazaga saqlash; backupga kirishi |
| Jadval | Aniq sana/vaqt, guruh/xona/o‘qituvchi konflikti va xona sig‘imi |
| Metodik/amaliyot/sifat | Hujjat reyestri, mas’ullar, davr, dalil fayllari, versiya va tasdiq |
| Analitika | Tasdiqlangan reja/fakt/qoldiq; kafedra kesimi; konfiguratsiyalangan bitta fan-kontingent resurs stsenariysi |
| Operatsiya | Read snapshot orqali sahifalangan yuklash; yilni yopish; yangi revision; append-only audit; Docker/Caddy; backup/restore |

## Parametrlar nega bo‘sh?

Universitet me’yorlari dasturchi tomonidan taxmin qilinmaydi. Superadmin ularni profil/me’yor oynasida qo‘lda kiritadi. Barcha zarur qiymatlar kiritilib, boshqa vakolatli akademik hisob tasdiqlagandan keyin hisoblash ishlaydi. Bu foydalanuvchi so‘ragan konfiguratsiya oqimi; demo qiymatlar productionga avtomatik tushmaydi.

## Qo‘llab-quvvatlanadigan aniq doira

- Generator deterministik tavsiya beradi; tanlov savatlari, barcha kasbiy akkreditatsiya istisnolari va murakkab cross-faculty optimizer emas. Qo‘shimcha institutsional cheklovlar uchun kod/sxema kengaytmasi kerak bo‘lishi mumkin.
- Bir fan/guruh/mashg‘ulot talabi bir nechta o‘qituvchiga soat bilan bo‘linishi mumkin. Har bir qator alohida, jami tasdiqlangan taqsimot hisoblangan talabdan oshmaydi.
- Jadval aniq sanalar bilan yuritiladi; takrorlanuvchi haftalik jadval optimizatori yo‘q. Uni XLSX qatorlari bilan kiritish mumkin.
- Excel importi birinchi varaqni o‘qiydi, 5MB/1000 qator bilan chegaralangan. Makro, formula va tashqi linkli fayl rad etiladi. Oldindan qiymatlarga aylantirilgan varaqdan foydalaning. Katta fayllar qismlarga bo‘linadi.
- XLSX eksport dastur reyestri formatida. Universitetning alohida imzoli/merged-cell rasmiy blankasi aynan qayta tiklangani tekshirilmagan. PDF browser print orqali olinadi.
- Prognoz bitta fan-kontingent stsenariysi; to‘liq universitet shtat optimizatori yoki ish haqi hisoblagichi emas.
- HEMIS, tashqi SSO, email/SMS kanallari ulanmagan. Ular uchun tasdiqlangan API va provayder konfiguratsiyasi kerak; tizim o‘zining login/TOTP va ichki bildirishnomalari bilan ishlaydi.
- Maxfiy fayllar tashqi AI/xizmatga yuborilmaydi. File format/hajm tekshiruvi antivirus auditi o‘rnini bosmaydi.

## Nimalar hali tashqi tekshiruv talab qiladi?

Haqiqiy domen va TLS sertifikati, universitetning haqiqiy normativ qiymatlari, uning Excel maketi bilan golden parity, real server yuklamasi, to‘liq WCAG 2.2 AA va mustaqil xavfsizlik auditi hamda vakolatli buyurtmachi qabul sinovi bu vazifada tasdiqlanmagan. Lokal testlar ushbu tashqi tasdiqlar o‘rnini bosmaydi.

Shuning uchun “asl katta TTZning barcha talablari 100% bajarilgan va universitetda production ishlatishga sertifikatlangan” degan da’vo qilinmaydi. Paket ishlaydigan, sozlanadigan yadro va reyestrlar platformasidir; yuqoridagi murakkab imkoniyatlar chegaralari ochiq ko‘rsatilgan.
