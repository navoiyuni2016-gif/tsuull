# 09. Foydalanuvchi interfeysi va sahifalar

## 9.1. Asosiy menyu
1. Dashboard
2. O‘quv yili / akademik kalendar
3. Ta’lim dasturlari va fanlar katalogi
4. O‘quv rejalar: ro‘yxat, generator, validatsiya, tasdiq, versiyalar
5. Fan soatlari: breakdown, tekshiruv, kalkulyatsiya izi
6. Guruhlar, potoklar va laboratoriya kichik guruhlari
7. Kafedra yuklamasi: hisob, taqsimlash, bo‘sh yuklama, konfliktlar
8. Professor-o‘qituvchi yuklamasi: shaxsiy reja, fakt, o‘zgarishlar
9. Yillik ish rejasi va topshiriqlar
10. Kafedra/fakultet hisobotlari
11. Hisobotlar, Excel/PDF eksport
12. Import markazi: xatolar va moslashtirish
13. Normativlar/Rule Engine (SuperAdmin)
14. Foydalanuvchilar, rollar, vakolatlar (SuperAdmin)
15. Audit, faollik, versiya taqqoslash
16. Dars jadvali / auditoriyalar (2-bosqich)
17. Sillabus va metodik ta’minot (2-bosqich)
18. Amaliyot va dars sifati monitoringi (2-bosqich)
19. Resurs prognozi (keyingi bosqich)
20. Tizim holati (admins)

## 9.2. Bosh Dashboard
- Filtr: o‘quv yili, semestr, fakultet, kafedra, dastur, shakl.
- KPI: reja tasdiqlanish %, rejalashtirilgan soat, taqsimlangan soat, taqsimlanmagan soat, tekshirilgan fakt, kechikkan vazifalar, report intizomi, konfliktlar.
- Kafedralar kesimi, `drill-down`; kechikkanlarda mas’ul va muddat.
- Har KPI yaqinida data as-of, manba, hisoblash formulasi linki.
- Eksport aynan shu filtr/snapshot bilan.

## 9.3. O‘quv reja generatori wizard
1. Dastur/daraja/shakl/kohorta/akademik yil.
2. Fanlar katalogi va shablon tanlash.
3. Kreditlar va prerequisite tekshiruvi.
4. Semestrlarga taqsimlash — tavsiya va manual overrides.
5. Mashg‘ulot turlari soatlari (qoidalar va izoh).
6. Validatsiya va normativ ziddiyatlar.
7. Reja differensiasi (oldingi versiya bilan).
8. Submit/approve; Excel/PDF olish.

## 9.4. Yuklama builder
Yuqorida reja versiyasi + akademik yil + qoida; chapda fan/mashg‘ulotlar, markazda potok/guruh bo‘linishi, o‘ngda kafedra/o‘qituvchi capacity; pastda avtomatik `required / assigned / unassigned` balans; tablarda manual assignment, recommended assignment, conflicts, lineage, exports.

## 9.5. Me’yorlar paneli
RuleSet list, search, active badge, legal basis; yangi draft yaratish; field schema-based inputs; range validation; `old/new` compare; simulation; affected object tree; academic approval; effective date; history; rollback emas — yangi replacement version. Foizlar va absolyut soatlar unit bilan ko‘rsatiladi. Har field uchun description, formula, source.

## 9.6. Excel import ustasi
Upload → taniqli shablon / map → dry-run → errors table (`sheet`, `cell`, reason, suggested fix) → totals compare → commit → receipt; xavfsiz cancel/retry. Hamma xatolar bitta aniq panelda yig‘ilsin.

## 9.7. UX mezonlari
- O‘zbek lotin interfeysi, jadvallarda katta hajmdagi satrlar uchun virtual scroll, keyboard navigation.
- Rangning o‘zigina statusni bildirmaydi; ikon+matn bilan ko‘rsatiladi.
- Autosave draft, unsaved changes warning, optimistic lock conflict dialog.
- Destructive va publish operatsiyalar ikki marta tasdiq, izoh va audit bilan.
- Excelga o‘rgangan xodimlar uchun column freeze, mass paste, import/upload, keyboard shortcuts, row validation.
- Sana/soat Asia/Tashkent formatida, timestamps serverda UTC.
- Mobileda read-only dashboard va task review; murakkab Excel uslubidagi editor desktop uchun.
