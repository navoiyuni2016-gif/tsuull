# 01. Tizimning to‘liq texnik topshirig‘i (TTZ / PRD)

## 1.1. Maqsad va loyiha doirasi
**Mahsulot:** `O‘quv bo‘limi ERP` (ishchi nom).  
**Mijoz:** universitet O‘quv bo‘limi.  
**Maqsad:** Excelga bog‘langan takrorlanuvchi o‘quv rejalashtirish, fan-soatlari hisobi, o‘qituvchi yuklamasi, ijro monitoringi, kafedra/fakultet hisobotlari va rahbar panelini bir tizimda yuritish.

**Kirmaydi:** Registrator ofisi; talaba arizalari; chetlashtirish/tiklash; to‘lov-kontrakt; baholarni qo‘lda yuritish; diplom; buxgalteriya; to‘liq LMS; abituriyent qabuli. Talaba soni faqat normativ guruhlash/yuklama uchun umumlashgan ma’lumot sifatida ishlatilishi mumkin.

**Bosh prinsiplari:** (a) manba ma’lumotni qayd qilish, (b) deterministik hisoblash, (c) kelishish va tasdiqlash, (d) o‘zgarmas tasdiqlangan snapshot, (e) audit, (f) eksport/import mosligi.

## 1.2. Kim foydalanadi va vakolatlar
1. **SuperAdmin (texnik):** tizim konfiguratsiyasi, foydalanuvchi va rol huquqlari, me’yor loyihasini kiritish, import sxemasi, integratsiya sozlamalari; o‘z-o‘zidan normativni akademik tasdiqlay olmaydi.
2. **O‘quv ishlari bo‘yicha prorektor / vakolatli tasdiqlovchi:** o‘quv reja va yillik yuklama versiyalarini tasdiqlash, umumiy dashboard, normativ o‘zgarishlariga akademik rozilik.
3. **O‘quv bo‘limi boshlig‘i:** reja, hisobot, kafedralar yuborgan ma’lumotlar, konfliktlar va monitoring; yakuniy ko‘rib chiqish.
4. **O‘quv bo‘limi mutaxassisi/rejalashtiruvchi:** o‘quv reja loyihasi, fanlar, akademik kalendar, guruhlar, yuklama loyihasi, import tuzatishlari.
5. **Fakultet mas’uli:** faqat tegishli fakultet kesimida ma’lumot ko‘radi/kiritadi, kafedra hisobotlarini ko‘rib chiqadi.
6. **Kafedra mudiri/mas’uli:** kafedra fanlari va o‘qituvchilari, yuklama taqsimoti loyihasi, fakt ijro dalillari va kafedra hisobotlari.
7. **O‘qituvchi:** faqat o‘ziga biriktirilgan yuklama va ijro ko‘rinishi; dalillarni yuborish (agar vakolat berilsa).
8. **Auditor (read-only):** barcha tasdiqlangan versiyalar, audit va solishtirish; maxfiy maydonlar ruxsatga ko‘ra maskalanadi.
9. **Servis integratsiyasi:** faqat aniq ruxsat berilgan API/import operatsiyalari, alohida texnik identifikator.

**Har bir so‘rovda:** foydalanuvchining rolidan tashqari uning fakultet/kafedra doirasi, hujjat holati va akademik yil tekshiriladi. SuperAdmin ham auditni o‘chira olmaydi. Ikki bosqichli tasdiqlash (four-eyes) akademik me’yor o‘zgarishlarida majburiy.

## 1.3. Funktsional modullar (to‘liq ko‘lam)
### M01. Akademik ma’lumotnomalar va o‘quv yillari
Universitet → fakultet → kafedra; ta’lim darajasi, shakli, dastur/yo‘nalish kodi, kohorta (qabul yili), semestr, o‘quv yili, fan turlari, kredit birligi, o‘qituvchi lavozimi, toifa, shtat/stavka ma’lumotlari; barcha kataloglarga barqaror kod va tarix.
**Qabul:** bir xil kodni ikki marta qo‘shib bo‘lmasin; eski yillarning kodi o‘zgarmasin; izlanadigan UI.

### M02. SuperAdmin me’yorlari / Rule Engine
Normativ paketi: kredit→soat; ta’lim darajasi/shakliga ko‘ra auditoriya ulushi; fan turi va mashg‘ulot turi; guruh/potok/kichik guruh chegaralari; lavozim va o‘qituvchi yuklama parametrlari; ish turi bo‘yicha koeffitsiyent; yaxlitlash; limitlar; qoida ustuvorligi; kirish/kuchga kirish/amal qilish sanalari. Qoidalarni cheklanmagan `eval` kodida kiritish mumkin emas. JSON-sxema va tasdiqlangan operatorli Rule DSL.
**Qabul:** `draft → review → approved → effective → archived` holatlar; bir-birini qoplovchi faol qoida uchun tekshiruv; diff va qayta hisoblash preview; tasdiqlangan snapshotni in-place o‘zgartirmaslik.

### M03. Fanlar katalogi
Fan ID, kodi, o‘zbek/rus/inglizcha nomi (ixtiyoriy), kategoriyasi (majburiy/tanlov), mas’ul kafedra, kredit diapazoni, oldindan talab fanlari, o‘qitish tili, yo‘nalishga aloqasi, versiyalar, shablonlar, faol/arxiv.
**Qabul:** takror fan/dublikat aniqlanadi; tegishli yo‘nalishda tanlov fanlari savati to‘g‘ri ishlaydi.

### M04. O‘quv rejalar generatori
Ta’lim dasturi, qabul yili, daraja, ta’lim shakli, muddat, akademik semestrlar, fanlar va kreditlar, oldindan talab fanlari, bloklar, amaliyotlar, attestatsiya; shablondan loyihani yaratish; semestrlarga avtomatik taqsimlash uchun cheklovli tavsiya algoritmi (avtomatik 'tasdiq' yo‘q); tasdiqlangan namunaviy reja bilan solishtirish.
**Validatsiya:** har semestr/yil kreditlari; umumiy kredit; majburiy va tanlov balans; oldindan talablar; soatlar yig‘indisi; kasbiy/yo‘nalish talablari; haftalar. Istisnolarni alohida tasdiqlangan qaror bilan qayd qilish. Eksport: universitetning rasmiy Excel/PDF shabloni, format va formulalar bilan mos.

### M05. Fan soatlari generatori
Kredit × soat/kredit = talabaning fan bo‘yicha jami o‘quv soati; auditoriya ulushi → auditoriya va mustaqil ta’lim; mashg‘ulot turlari (ma’ruza, amaliy, seminar, laboratoriya, individual) soatlarini foydalanuvchi qoida/shablon bilan hisoblash; akademik haftalar va juftliklar bo‘yicha reja; yarim semestr/parallel fanlar/kechki-sirtqi-distant format va istisnolarni qo‘llash. Har xil soat kategoriyalarini chalkashtirmaslik.

### M06. Guruh, potok va kichik guruhlar
Guruh kodi, yo‘nalish, bosqich, semestr, talabalar soni (PII'siz), til/shakl, fan uchun kontingent, ma’ruza potoklari, amaliy guruhlar, laboratoriya kichik guruhlar, fakultetlararo birlashtirish qoidasi va chegaralari. Bir talaba kontingentini ikki marta sanamaslik, ko‘rsatkichlar snapshoti.

### M07. Kafedra/o‘qituvchi yuklamasi hisoblash
Fan+semestr+guruh/potok+soat turi asosida mashg‘ulotni ko‘paytirish; 3076 va o‘quv kengashi qaroridagi tegishli darsdan tashqari o‘quv ishlarini **alohida normativ qoida** orqali hisoblash (imtihonlar, yakuniy nazorat, kurs ishi rahbarligi, amaliyot, attestatsiya, boshqa belgilangan ishlar). Natijalar: kafedra buyurtmasi, jami talab, o‘qituvchi nomiga biriktirilgan yuklama; reja/tasdiqlangan/fakt farqi; dublikat dars detektori.
**Eslatma:** shaxsiy ish rejasining metodik/ilmiy/ustoz-shogird bo‘limlari o‘quv soatlariga asossiz qo‘shilmaydi; zarur bo‘lsa alohida ish turlari modulida qayd qilinadi.

### M08. O‘qituvchiga taqsimlash / Constraint Solver
O‘qituvchi malakasi va fan kompetensiyasi, kafedra mansubligi, mavjud yuklama, stavka va lokal limit, ta’til/bandlik, ma’ruza o‘qish vakolati, til, fan va guruh bo‘yicha cheklov, qo‘lda bandlash (lock) va prioritetlar; dastlab deterministik validatsiya/foydalanuvchi tanlovi, keyin optimizer takliflari. Taklif sabablarini ko‘rsatish, haddan tashqari bandlikda blok yoki asoslantirilgan ogohlantirish. Yakuniy qaror insonda.

### M09. Yillik ish rejasi va ijro nazorati
Yillik/choraklik/oylik vazifalar; takrorlanuvchi ish shablonlari; mas’ul, kuzatuvchi, muddat, progress, dalil fayli, qabul qiluvchi, kechikish, eslatmalar, audit. O‘quv bo‘limi ish jarayoniga tegishli topshiriqlar, umumuniversitet HR/task-management emas.

### M10. O‘qitish va yuklama ijrosi monitoringi
Tasdiqlangan reja bo‘yicha mashg‘ulot / dalil / real bajarilgan soatlar; kelmagan/almashtirilgan/ko‘chirilgan dars; manba va tekshiruvchi; reja vs fakt; dalilsiz ish 'bajarildi' hisoblanmasin. Tashqi tizimdan real bajarilish ma’lumoti faqat ruxsat etilgan integratsiya yoki tekshirilgan import bilan.

### M11. Kafedra va fakultet elektron hisobotlari
Hisobot davri, majburiy ko‘rsatkichlar, manbalar, avtomatik hisob, zarur izoh/dalil, submit-review-return-approve, kumulyativ universitet ko‘rinishi, eski versiya va qayta yuborish tarixi. Takror qo‘lda to‘ldirishni minimallashtirish.

### M12. Rahbariyat Dashboard va analitika
O‘quv reja holati, fakultet/kafedra bo‘yicha jami reja va tasdiq, yuklama bajarilishi, normativ og‘ishlar, ochiq konfliktlar, topshiriq kechikishlari, hisobot topshirish vaqti, yillar taqqoslovi, drill-down, filtr va snapshot sanasi. Foiz denominator va yangilanish vaqti ko‘rsatiladi. CSV/XLSX/PDF eksportda ekrandagi filtrlarga mos ma’lumot.

### M13. Excel import/eksport va hujjatlar
.xlsx/.xlsm (makrolar ishga tushirilmasin) import, ruxsat berilgan CSV/XLSX, shablon aniqlash, mapping, preview, validatsiya xatolari, deduplikatsiya, dry-run, atomic commit, rollback/compensating action, manba fayl hash va arxiv; rasmiy Excel maketlari, Word/PDF faqat tasdiqlangan shablonlarda. CSV injectiondan himoyalash.

### M14. Integratsiya, audit va xabarnomalar
Mavjud ichki ma’lumot manbalari/HEMIS faqat tasdiqlangan API va ruxsatlar mavjud bo‘lsa; idempotent pull/push, source-of-truth matriksi va conflict queue; ichki bildirishnomalar/e-mail (opsional), audit jurnal, notifikatsiya shablonlari. Hech qanday integratsiya majburiy faraz qilinmaydi.

### M15. Versiyalar, stsenariylar, qayta hisoblash
`what-if` simulyatsiyasi: SuperAdmin '30 → 29 soat' yoki kontingent `75 → 82` kabi parametr almashtirsa qaysi reja, fan soati, kafedra va o‘qituvchi yuklamasi o‘zgarishi aniq diff bilan chiqadi. Faol tasdiqlangan obyektga bevosita yozish mumkin emas. Yangi loyiha versiyasi hosil qilinadi, review so‘ng publish. Oldingi semestrlar uchun lock va tarixiy eksport ishlashda davom etadi.

### M16. Dars jadvali va auditoriya resurslari (ikkinchi bosqich)
Dars jadvalini yaratish yoki universitetda mavjud jadval manbasidan o‘quv bo‘limi nazorati uchun olish. Fakultet, guruh, o‘qituvchi, auditoriya, hafta, juft/toq hafta, mashg‘ulot turi, xona sig‘imi, texnik jihoz, ta’til va istisnolar bo‘yicha konfliktlarni aniqlash; auditoriyalar bandligi dashboardi. Jadval generatori avtomatik tavsiya beradi, mas’ul tasdiqlaydi. Tasdiqlangan yuklama bilan jadval o‘rtasidagi moslik tekshiriladi. Agar dars jadvallari boshqa bo‘limga tegishli bo‘lsa, read-only integratsiya bilan cheklaniladi.

### M17. Sillabus, fan dasturi va metodik ta’minot nazorati (ikkinchi bosqich)
Fan bo‘yicha sillabus, o‘quv dasturi, kalendar-tematik reja, o‘quv-uslubiy majmua versiyalari; shablon, akademik yil, fan kodi va mas’ul kafedra bilan bog‘lash; mavjudlik, eskirganlik, muddat, ko‘rib chiqish, aprobatsiya/approval holati; o‘quv reja soatlari bilan moslik. Tizim materialning pedagogik sifatini avtomatik 'tasdiqlamaydi', faqat strukturaviy va versiya nazoratini avtomatlashtiradi.

### M18. Amaliyotlar rejalari va nazorati (ikkinchi bosqich)
Amaliyot turi, dasturi, belgilangan kredit/soat, davr, mas’ul, hamkor tashkilot (tegishli bo‘lsa), rejalashtirilgan guruhlar, ish/dalil va yakuniy hisobotlar; amaliyotga tegishli yuklama normativ hisoblari alohida work type. Talabalarning individual amaliyot arizalari loyiha doirasiga kirmaydi.

### M19. Ta’lim jarayoni sifat monitoringi (ikkinchi bosqich)
Mashg‘ulot kuzatuvi, namunaviy nazorat checklisti, fan metodik materiallari mavjudligi, dars uzilishlari, aniqlangan kamchilik, tuzatish vazifasi, deadline, dalil va qayta tekshirish; bo‘limga tegishli ma’lumotlar tahlili. Individuallarning reyting/attestatsiya qarori avtomatik chiqarilmaydi.

### M20. Resurslarga ehtiyoj prognozi (ixtiyoriy)
Kafedra bo‘yicha kelasi o‘quv yili yuklama ehtiyoji, talabalar kontingenti stsenariylari, mavjud professor-o‘qituvchi capacity bilan gap analysis, auditoriya ehtiyoji, taxminiy rejalash. Bu HR shtat yoki ish haqini avtomatik tasdiqlash emas: 3076 bo‘yicha hisoblangan o‘quv yuklamasi shtat birligi va ish haqini bevosita belgilamaydi.

## 1.4. Qoidalar va avtomatlashtirishning chegarasi
- **Avtomatik:** arifmetik hisob, qoida asosida validatsiya, qoida/shablon bo‘yicha loyiha, qayta hisoblash, agregat hisobot, xatolarni topish.
- **Inson tasdiqlaydi:** normativlar, o‘quv rejadagi fan tarkibi, asoslangan istisnolar, yakuniy pedagogik yuklama taqsimoti, tasdiqlangan yillik reja va yakuniy hisobotlar.
- **AI ixtiyoriy va tavsiyaviy:** hujjat qidirish, Excel ustunlarini taxminiy moslashtirish, og‘ishlar sabablarini sharhlash. AI hech qachon rasmiy soat yoki qonuniy koeffitsiyentni o‘ylab topmasin.

## 1.5. Sifat talablari
- Uzbek lotin lokalizatsiya birinchi o‘rinda; uz-Kirill, rus va inglizcha kengaytirish arxitekturasi.
- Desktop-first, planshetda o‘qilishi; klaviatura boshqaruvi; WCAG 2.2 AA mezonlari.
- Katta Excel fayllari uchun asinxron import, progress, cancel, retry, checkpoint.
- Daraja/shakl/fakultet/o‘quv yiliga asoslangan izolatsiya va ruxsatlar.
- Vaqt zonasi `Asia/Tashkent`, serverda UTC va timezone-aware vaqt.
- Hisoblar uchun decimal/rational (float emas), rounding policy o‘zida saqlansin.
- Idempotent create/import/recalculate; race conditionlardan himoya.
- Tracing, structured logs, metrics, alertlar, backup/restore drills.
- UI’da ko‘rsatilgan barcha raqamlar uchun 'qayerdan kelgan' (source/lineage) ochiladigan oynasi.

## 1.6. Tizim tarkibidagi asosiy hisobotlar
1. Ta’lim dasturi bo‘yicha o‘quv rejalar reyestri va versiyalari.
2. Semestr/yil kesimida fanlar kredit va soat balansi.
3. Kafedra o‘quv yuklamasi umumiy yig‘indisi.
4. O‘qituvchi shaxsiy o‘quv yuklamasi.
5. Mashg‘ulot turi bo‘yicha soatlar taqsimoti.
6. Guruh/potok/kichik guruhlar ro‘yxati va asoslari.
7. Reja vs fakt, bajarmagan ishlar va sabablari.
8. Kafedra/fakultet hisobot topshirish intizomi.
9. Yillik ish rejasi ijrosi va kechikkan vazifalar.
10. Me’yor o‘zgarishi va undan ta’sirlangan hujjatlar jurnali.
11. Import natijalari — manba Excel bilan moslik dalolatnomasi.
12. Rahbar dashboardining filtrlangan print-ready nusxasi.

## 1.7. Talablarni ustuvorlikka ajratish
**P0, yadro:** M01–M07, M11–M13 (kamida), autentifikatsiya/RBAC, versiyalar, audit, migratsiya, testlar, rasmiy formatdagi eksport.  
**P1, birinchi joriy etish:** M08 (manual+validatsiya), M09, M10, M12, M14, M15.  
**P2, takomillashtirish:** M16–M20 (jadval/auditoriya, sillabus, amaliyot, sifat monitoringi, resurs prognozi), to‘liq avtomatik optimizator, AI-assistent, murakkab HEMIS integratsiyalari — barchasi P0 hisoblarning to‘g‘riligiga bog‘liq.

## 1.8. 'Tayyor' tushunchasi (global Definition of Done)
Xususiyat faqat API qaytarishi bilan tugagan hisoblanmaydi. Quyidagilar talab qilinadi: schema migration; domain va permission testlari; UI form va validatsiya; API/OpenAPI hujjati; audit; 0 seed normative default; i18n; accessibility; observability; import/export moslik; test fixtures; rollback; runbook; product owner signoff.
