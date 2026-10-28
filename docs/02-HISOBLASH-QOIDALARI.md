# 02. Hisoblash yadrosi — funksional va matematik spetsifikatsiya

## 2.1. Asosiy farqlar (xatolikni oldini olish uchun)
**A. Talaba fan yuklamasi:** kreditlar × akademik soat/kredit = talabaning jami (auditoriya + mustaqil ta’lim) soati.  
**B. Guruhning auditoriya soati:** o‘sha fan bo‘yicha bitta guruh talabalari qatnashadigan rejalangan auditoriya mashg‘ulotlari.  
**C. Kafedra talab etiladigan o‘qitish soati:** guruh/potok soni × tegishli ma’ruza/amaliy/lab soatlari + normativdagi boshqa ish turlarining hajmi.  
**D. O‘qituvchiga taqsimlangan ish:** (C) ichidan muayyan o‘qituvchiga berilgan dars/ishlar.  
**E. Fakt bajarilgan soat:** haqiqatan bajarilgan va tekshirilgan dalilga ega soat.  
A≠C, C≠D, D≠E. Talabaning mustaqil ta’lim soati o‘qituvchi bajaradigan dars soatiga avtomatik qo‘shilmaydi.

## 2.2. Qoidalar ierarxiyasi va qoida paketi
Har bir hisoblash quyidagilar bilan bajariladi:
- `rule_set_id`, `version`, `effective_from/to`, `legal_basis`, `approval_id`;
- `academic_year_id`, `study_level`, `study_mode`, `program_id`, `cohort_id`, `subject_id` va tegishli normativ istisno;
- Ustuvorlik: **aniq fan+reja** → **dastur** → **ta’lim shakli/darajasi** → **universitet**. Bir xil aniqlikdagi ikki faol qoida konflikt bo‘lib bloklanadi;
- Obyekt ishlab chiqarish jarayonida **aniq qoida versiyasiga pin** qilinadi; publish'dan oldingi natija va keyingisi `diff`;
- `legal_basis` hujjat URL/kodi, bandi, universitet kengashi qarori identifikatori bilan saqlanadi.

SuperAdmin `DRAFT` qoida paketini yaratadi; vakolatli akademik tasdiqlovchi va tizim validatori tekshiradi; tasdiqdan keyingina `EFFECTIVE`. Rollar doirasiga ko‘ra texnik admin + akademik tasdiqlovchi bir kishi bo‘lmasligi tavsiya etiladi.

## 2.3. Fan soatlari formulalari
`H_total = C * H_per_credit`  
`H_contact = apply_rounding(H_total * P_contact)`  
`H_self = H_total - H_contact`  
`H_contact = H_lecture + H_practice + H_seminar + H_lab + H_individual + H_other_contact`

`C`: kredit, `H_per_credit`: universitet tasdiqlagan akademik soat/kredit, `P_contact`: daraja/shakl va amaldagi qoidaga bog‘liq ulush.

**Validatsiya:** soatlar manfiy emas; foiz ulushlari 100% ni tashkil qiladi; barcha mashg‘ulotlar yig‘indisi auditoriya jami bilan mos; kreditlar va semestr balansi; zarur joyda 2 soatlik juftlikka moslash bo‘yicha taqsimot va qoldiqni alohida hal qilish. Kredit × soat kalkulyatsiyasi `Decimal`; yaxlitlash turi, qadam va qoldiqni kimga berish qoidasi saqlanadi. Boshqa fakultet/darajalar uchun ulushlar boshqacha bo‘lishi mumkin.

**Demonstratsiya, qonuniy standart emas:** 6 kredit × 30 = 180 akademik soat. Auditoriya 40% → 72; mustaqil 108. Auditoriya 36 ma’ruza + 36 amaliy deb **faraz** qilsak, 3 amaliy guruh / 1 ma’ruza potok = 36 + (36 × 3) = 144 ta bazaviy dars yuklamasi soati. Bunga 3076 va mahalliy tasdiqlangan me’yorlar bo‘yicha qo‘shimcha ishlar hisoblanadi. Aynan 144 soatni o‘qituvchining yakuniy shaxsiy yuklamasi deb bo‘lmaydi.

## 2.4. Mashg‘ulotlarni guruhlarga ko‘paytirish
Har bir `teaching_activity`da `type, subject_offering, assigned_unit_group, hours_per_unit, number_of_units, normative_multiplier, source_rule_id` bo‘ladi.

`Load_activity = hours_per_unit × number_of_units × multiplier` (faqat qoidada ko‘zda tutilgan ishlarda).  
- Ma’ruza — haqiqiy `lecture_stream` soni; har bir akademik guruhga alohida ko‘paytirilmaydi, agar bitta potok bo‘lsa.
- Amaliy/seminar — amaliy guruhlar soni.
- Lab/til — normativ bo‘yicha tasdiqlangan kichik guruhlar soni.
- Individual/bitiruv malakaviy ish/imtihon — alohida `work_type` va vaqt me’yori, kerak bo‘lganda student count yoki ishlar soni bilan hisoblanadi; umumiy 1:1 qoida yozilmaydi.
- `work_type` ma’lumotnomasida vaqt birligi (`PER_ACADEMIC_HOUR`, `PER_STUDENT`, `PER_GROUP`, `PER_EVENT`, `FIXED_HOURS`), asos, limit, maxsus shartlar, dalil turi bo‘ladi.

**Dublikat nazorati:** har bir `(year, offering, semester, activity_type, unit_group_id, normative_version)` da noyob load item ID; bir guruh bir potokda ikki marta sanalmaydi. Kafedralararo darslarda har bir assignment hissasi yig‘indisi 100% yoki qoida bo‘yicha tasdiqlangan tartibda bo‘lishi shart.

## 2.5. O‘qituvchiga taqsimlash
`department_required = Σ valid_load_activities`  
`allocated = Σ instructor_assignments`  
`unallocated = department_required - allocated`  
`staff_utilization = allocated / approved_capacity` faqat `approved_capacity > 0` bo‘lsa. `approved_capacity` — yuridik va Kengash tasdiqlagan ma’lumot; `stavka × taxminiy yagona soat` emas.

Taqsimlashda ko‘riladigan cheklovlar: (1) fan kompetensiyasi, (2) ish joyi/kafedra huquqi, (3) o‘qitish tili, (4) tasdiqlangan soat limiti, (5) mavjud bandlik, (6) jadval konfliktlari, (7) ta’til, (8) bo‘lib o‘qitish holati, (9) manual lock, (10) akademik rahbar tasdiqi. Konflikt bo‘lsa `UNASSIGNED` yoki `WARNING/ERROR` bilan ko‘rsatish. Optimizator faqat tavsiya qiladi.

## 2.6. Reja → fakt
`Actual_hours` faqat tasdiqlangan dalil yozuvi (masalan, jurnal yoki tekshirilgan import) bilan hisobga olinadi.  
`Remaining = planned_approved - actual_verified`  
`Execution_ratio = actual_verified / planned_approved` (0 maxraj alohida N/A).  
Bekor bo‘lgan darsni avtomatik `o‘tilgan` hisoblash taqiqlanadi. Almashtirishlar, ko‘chirishlar, semestr oralig‘idagi o‘zgarishlar alohida event va asos bilan qayd qilinadi.

## 2.7. O‘quv reja generatsiyasi
**Kirish:** tasdiqlangan fanlar katalogi, maqsadli dastur, davomiylik, semestrlar, fan majburiy/tanlov bloklari, kreditlar, prerequisite DAG, akademik kalendar, tanlov savatlari, o‘quv yili uchun rasmiy shablon.

Algoritm:
1. Katalog va reja shablonining versiyasini o‘rnatish.
2. Har bir fanning kredit/soat va boshqa manba ma’lumotlarini validatsiya qilish.
3. Majburiy fanlar va tavsiya qilingan semestrlarni joylashtirish.
4. Prerequisite zanjiri, kredit limitlari va blok balansini tekshirish.
5. Qolgan fanlar uchun solver **tavsiya** yaratadi; `hard` va `soft` constraints alohida.
6. Har qanday mos kelmaslik `blocking error` yoki izoh talab qiluvchi `warning` sifatida chiqadi.
7. O‘quv bo‘limi ko‘rib chiqadi; tasdiqlovchi `APPROVED` holatiga o‘tkazadi.

Hech qanday algoritm universitet uchun huquqiy tasdiqlangan fan tarkibini o‘zi yaratmaydi; mavjud tasdiqlangan katalog va shablonsiz reja draftdan oshmasin.

## 2.8. Parametr o‘zgarsa qayta hisoblash
1. SuperAdmin yangi norma `DRAFT` yaratadi, sabab va huquqiy asos kiritadi.
2. Server normativ cheklovlarni tekshiradi va `DEPENDENCY_GRAPH` orqali qaysi obyektlarga ta’sirini topadi.
3. `dry-run` — eski/yangi hisob, delta, ta’sirlangan rejalar, kafedralar, o‘qituvchilar va hisobotlar ro‘yxati.
4. Akademik tasdiqlovchi qoidani kuchga kiritadi, `effective_at` belgilaydi.
5. `DRAFT/IN_REVIEW` obyektlar qayta hisoblanadi yoki yangi draft versiyasiga ko‘chiriladi; natija tekshiriladi.
6. `APPROVED/LOCKED/ARCHIVED` obyektlar o‘zgarmaydi. Kerak bo‘lsa ular uchun **yangi revision** ochiladi.
7. Har recalculation'da idempotency key, source hash, run ID, rule version, audit event, error report, retry.
8. Noto‘g‘ri yangi me’yor aniqlansa eski natijani restore qilmasdan, yangi **bekor qiluvchi normativ versiya** chiqariladi; tarix saqlanadi.

## 2.9. Hisoblash API diagnostikasi
Har bir numeric natija `value, unit, rounding_policy, rule_id/version, source_ids, trace, warnings, calculated_at, calculation_run_id` bilan qaytsin. UI’da `Hisoblash tafsiloti` oynasi `36 ma’ruza × 1 potok = 36` kabi inson tushunadigan izohni ko‘rsatsin.

## 2.10. Korner keyslar
0 talaba; 1 kredit; kasr kredit; 25 soat/kredit; 0 guruh; semestr muddatining qisqarishi; 3 guruh bitta ma’ruza potoki; guruh kichik bo‘linishi; 2 kafedra o‘rtasida fan; o‘qituvchi ish davri yarim semestr; noto‘g‘ri pre-requisite sikli; overlapping rules; 0 capacity; capdan oshish; oldingi yilning eski qoidasi; Excel'da kasr vergul; import takroriy ketma-ket; bir vaqtning o‘zida bir normani ikki admin tahrirlash; tasdiqlangan reja qisman o‘zgartirish; rad etilgan tasdiq; yillik report snapshot qayta ishlov bermasligi.
