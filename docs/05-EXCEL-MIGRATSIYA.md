# 05. Excel migratsiyasi — yo‘qotishsiz o‘tish strategiyasi

## 5.1. Nima uchun birinchi navbatda audit?
Excel fayl faqat jadval emas: ko‘pincha maxfiy formula, 'hidden sheet', merged-cell, hardcode, qo‘lda tuzatilgan koeffitsiyent, turli yillar versiyasi, vlookup/xlookup va makrolar bo‘ladi. Ishlab turgan hisobni to‘liq tushunmasdan import qilish ma’lumot va hisob xatolariga olib keladi.

## 5.2. Inventarizatsiya (har bir fayl uchun)
`Excel_ID`, file hash, fayl egasi, fakultet/kafedra, yil/semestr, versiya, format (XLSX/XLSM/XLS), sheetlar, header koordinatalari, hidden rows/columns, merged cells, name ranges, formula ustunlari, decimal locale, input cells, output totals, manba va qabul qiluvchi, tasdiqlovchi, foydalanuvchi, arxiv siyosati.

Majburiy toifalar:
1. O‘quv reja Excel shablonlari (daraja/shakl/yil bo‘yicha).
2. Fan kredit/soat taqsimoti.
3. Fanlar katalogi, sillabus ro‘yxati.
4. O‘qituvchi ro‘yxati/kompetensiya/stavka ma’lumotlari.
5. Kafedra o‘quv yuklama hisoblari.
6. Professor-o‘qituvchi shaxsiy yuklamalari.
7. Akademik guruhlar va talaba soni (agregat).
8. O‘quv bo‘limi yillik reja va ijro nazorati.
9. Kafedra/fakultet davriy hisobotlari.
10. Xizmat amaliy me’yorlar va universitet kengashi qarorlari.

## 5.3. Import jarayoni
**Phase 0 — archive:** original faylni read-only, SHA-256 bilan saqlash. Mijozdan kelgan faylni 'truth' deb qabul qilmaslik.

**Phase 1 — classify:** Excel fayl andozasi, yil/fakultet/kafedra, `header_fingerprint`, known template version; noma’lum formatni manual mapping queue.

**Phase 2 — mapping:** `source.sheet!cell/column → domain.field`, qiymat tipi, unit, normalizer, required, row start, record key, lookup; mapping UI’da saqlanadigan versiya.

**Phase 3 — validate:** majburiy kataklar; unikal fan/yo‘nalish/kafedra kodi; kredit-soat mutanosibligi; 0/manfiy; yillik/semestlik jami; potok dublikat; bo‘sh/kasr/shartli qiymatlar; eski tasdiqlangan revisionga ziddiyat. Excel formulalar **ishlatilmaydi**; ularning hisoblangan/natija qiymati va formulasi audit uchun ajratib olinadi.

**Phase 4 — preview:** imported, updated, skipped, warnings, blocked, yangi soatlar, manba Excel total vs tizim total; satr va katak darajasida xato (`Sheet2!F18: fan kodi topilmadi`). Foydalanuvchi eksport qilinadigan error log oladi.

**Phase 5 — commit:** rollback-safe transaction, batch idempotency, object/version pinning, audit, import source linkage. Retry ikki nusxa yaratmaydi. Katta fayllar asinxron import.

**Phase 6 — reconcile:** alohida golden dataset uchun Excel vs ERP natijalar (fan, semestr, kafedra, o‘qituvchi, work_type, total) mos kelishi; farqlar 0 yoki rasmiy izohlangan/fix qilingan. Imzo/dalolatnoma.

**Phase 7 — dual-run:** real ish davri davomida eski Excel hisoboti va ERP natijasi parallel yuritilib solishtiriladi; rasmiy tasdiq bilan asosiy hisob ERPga o‘tadi. Dastlab Excel export saqlanadi.

## 5.4. Excel xatolari katalogi
- Kodlar bo‘sh / bir fan turlicha yozilgan (normalizatsiya va master mapping).
- Formula qiymati cached bo‘lmagan (server o‘z qoidasi bo‘yicha hisoblaydi, Excel ishonchli natija hisoblanmaydi).
- Merge qilingan headerlar (multirow parse).
- Yashirin satr/yashirin varaq (sabab va qamrov bilan qayta ko‘rib chiqish).
- Lokal raqam `1 234,50` vs `1,234.50` (locale-aware parser, hech qachon jim taxmin qilmasin).
- Sana Excel serial number (calendar source handling) vs ISO.
- Dublikat o‘qituvchilar/fanlar (canonical master ID, employee ID PII himoyasi bilan).
- Bir xil shablon nomi, turli yil normativlari (template version + academic year).
- Excel report’da qo‘lda yakuniy total o‘zgartirilgan (discrepancy report).
- Fayl ichidagi formula injection, makro, tashqi linklar (sandbox, links disabled, security scanning).
- CSV export formula injection (`=`, `+`, `-`, `@` boshida) uchun xavfsiz escaping.

## 5.5. Minimal import mapping shabloni
| source_file | sheet | header_path | entity | target_field | type | required | transform | validation |
|---|---|---|---|---|---|---|---|---|
| reja.xlsx | Reja | Fan kodi | subject | code | string | yes | trim+normalize | unique subject code |
| reja.xlsx | Reja | Kredit | curriculum_course | credits | decimal | yes | locale decimal | >0 |
| reja.xlsx | Reja | Semestr | curriculum_course | term_no | integer | yes | exact | within program duration |
| yuklama.xlsx | Yuklama | Ma’ruza soati | teaching_unit | hours_per_unit | decimal | yes | locale decimal | >=0 |
| yuklama.xlsx | Yuklama | Guruhlar soni | teaching_unit | number_of_units | integer | yes | integer | >=0 |

## 5.6. Ma’lumot sifati KPI
- Mapping coverage: 100% muhim ustunlar (yil, fan, kredit, soat, guruh, kafedra, o‘qituvchi, total).
- Noma’lum yoki unmatched ID soni: 0 blocking.
- Har bir tasdiqlanadigan golden workbook: umumiy jami va satr kesimida `delta=0` (faqat oldindan tasdiqlangan rounding exception bo‘lishi mumkin).
- Import errorlar sabab va satr/ustun bilan ochiq ko‘rinadi.
- `lineage` orqali istalgan raqam uchun manba Excel satrigacha qaytish mumkin.

## 5.7. Keskin cheklov
Ilk migratsiyada universitetning asl maxfiy Excel fayllarini ochiq GitHub/Codex promptiga joylamaslik. Shaxsga doir ma’lumotlar anonimlashtirilgan yoki ruxsatga muvofiq himoyalangan muhitda qayta ishlansin.
