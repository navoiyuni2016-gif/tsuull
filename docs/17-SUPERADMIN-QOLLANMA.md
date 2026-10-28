# Superadmin uchun boshlash qo‘llanmasi — v3

## 1. Universitet profili

`Superadmin profili`ga kiring. To‘liq/qisqa nom, universitet kodi, manzil, email, telefon, rektor va bo‘lim boshlig‘ini kiriting. Saqlash yangi profil versiyasini va audit yozuvini yaratadi. Akademik me’yorlar bu profilning texnik qiymatlariga aralashtirilmaydi.

## 2. Hisoblar va doiralar

`Foydalanuvchilar`dan hisob yarating. `Rol / doira / parol` orqali fakultet, kafedra va/yoki yilni cheklang, kerak bo‘lsa hisobni bloklang. O‘zgarish mavjud sessiyalarni bekor qiladi. Rol vazifalari:

- **Superadmin** — profil, hisoblar va me’yor loyihalari; o‘z me’yorini akademik tasdiqlay olmaydi.
- **Mutaxassis** — ruxsat doirasidagi katalog, reja, yuklama, import va ijro loyihalari.
- **Akademik tasdiqlovchi** — boshqa muallif yuborgan yozuvni tasdiqlash yoki sabab bilan qaytarish.
- **Auditor** — ruxsat doirasida faqat o‘qish va eksport.

`Shaxsiy profil`dan ism va parolni o‘zgartiring. MFA uchun joriy parol bilan sozlashni boshlang, kalitni Authenticator ilovasiga kiriting, 6 xonali kodni tasdiqlang. Recovery kodlari faqat bir marta ko‘rsatiladi. MFA yoqilgach login oynasida yangi kod yoki ishlatilmagan recovery kodi kerak. Seedni yangilashdan oldin joriy MFAni yangi OTP bilan o‘chirish lozim.

## 3. Kataloglar

Fakultet → kafedra → yil → fan → guruh → o‘qituvchi tartibida kiriting. Har biriga noyob kod bering. Fan uchun kredit, til va kerak bo‘lsa oldindan talab fan kodlarini yozing. O‘qituvchining vakolatli fan kodlari va tilini kiriting. Individual tasdiqlangan yillik limit mavjud bo‘lsa uning soni va huquqiy manbasini yozing; bo‘lmasa hisoblash paketidagi universitet limiti ishlatiladi.

## 4. Me’yor paketi — barcha sonlar qo‘lda

`Me’yorlar va versiyalar` → yangi loyiha. Huquqiy asos, davr, qo‘llanish doirasi va kerak bo‘lsa kafedra/yilni belgilang. `Hisoblash parametrlarini ulash`ni yoqing. Bo‘sh maydonlarga universitet tasdiqlagan qiymatlarni kiriting:

- Soat/kredit; auditoriya ulushi.
- Ma’ruza, amaliy, seminar, laboratoriya va individual mashg‘ulot ulushlari. Bu besh ulush jami 10000 basis point bo‘lsin. **10000 bp = 100%; 4000 bp = 40%.**
- Amaliy, ma’ruza, seminar va laboratoriya guruh sig‘imlari.
- Individual mashg‘ulotni talaba yoki guruhga ko‘paytirish birligi.
- Yaxlitlash kasr xonalari, usuli va teng qoldiqdagi ustuvor mashg‘ulot.
- O‘qituvchi yillik limiti, semestr kredit limiti, dastur jami krediti va semestrlar soni.

Hech qanday son avtomatik qonuniy standart deb olinmaydi. Bir xil aniq doira va davrda ikki hisoblash paketi tasdiqlanmaydi. Superadmin saqlaydi va ko‘rib chiqishga yuboradi; boshqa akademik hisob tasdiqlaydi. Hujjat sifatida kiritilgan, typed parametrlari yo‘q me’yor hisoblash ro‘yxatida chiqmaydi.

## 5. Reja generatori

Reja loyihasiga yil, kafedra, me’yor va hisob sanasini belgilang. Fanlar katalogini tasdiqlating. Reja tafsilotidagi `Reja generatori` orqali fanlarni tanlang, tavsiya etilgan semestrlarni ko‘ring va alohida tasdiq bilan loyiha qatorlarini yarating. Tizim prerequisite, sikl, semestr limiti va dastur jami kreditini tekshiradi. Qo‘lda tahrir `Reja fanlari va semestrlar`da bajariladi. Yakuniy reja akademik tasdiqqa yuboriladi.

## 6. Hisoblash va yuklama

`Me’yor bo‘yicha hisob`dan tasdiqlangan paket, fan, guruh va sanani tanlang. Talaba jami/auditoriya/mustaqil soati va bazaviy dars talabi alohida chiqadi. Hisob izi va qoida versiyasi ko‘rinadi. Pastdagi tavsiyadan mos o‘qituvchi va mashg‘ulot turini tanlab, loyiha yarating. Tavsiya yakuniy tasdiq emas.

Tasdiqda kafedra, fan kompetensiyasi, til, to‘g‘ri hisoblangan soat va yillik limit yana serverda tekshiriladi. Bitta fan/guruh/mashg‘ulot/o‘qituvchi qatori takrorlanmaydi. Bir mashg‘ulot talabini bir nechta o‘qituvchiga soat bilan bo‘ling: jami taqsimot hisoblangan talabdan oshsa tasdiq rad etiladi.

Imtihon, kurs ishi, amaliyot rahbarligi va boshqa ishlar uchun `Qo‘shimcha ish me’yorlari`ga huquqiy asos, birlik (talaba/guruh/hodisa/fixed) va soat yozing, tasdiqlating. `Qo‘shimcha ish yuklamasi`da shu me’yor, miqdor, o‘qituvchi va yillik limit qoidasini tanlang. Fixed ish uchun miqdor 1; boshqa birliklarda `miqdor × me’yor` ishlaydi.

## 7. Fakt, dalil va hisobot

Tasdiqlangan yuklamaga `Fakt ijro va dalillar` yozuvini kiriting. Dalil hujjat IDsi yoki tizimga yuklangan fayl IDsi kerak. Tafsilot oynasidan PDF/rasm/XLSX/DOCX yuklash mumkin. Akademik tekshiruvchi tasdiqlagandan keyingina soat faktga qo‘shiladi. Jami fakt reja soatidan oshmaydi.

Vazifa bajarilgan holati va dalil bo‘lmaguncha uning yakuniy tasdig‘i rad etiladi. Hisobot tasdiqlanganda tasdiqlangan yillik reja va tanlangan davrdagi tekshirilgan fakt manbalari alohida snapshotda saqlanadi. Keyingi yozuvlar eski snapshotni o‘zgartirmaydi.

## 8. Import, eksport va tarix

Import markazida modul va XLSX faylni tanlang. Bog‘langan ma’lumotlar oldindan kiritilgan **kodlar** orqali moslanadi. Andozani dasturdan yuklab olish mumkin. Faqat birinchi varaq o‘qiladi; boshqa varaq kerak bo‘lsa uni alohida faylga ko‘chiring. Ustunlarni moslashtiring, barcha xatolarni tuzating, qator/soat/kredit yig‘indisini manba bilan solishtiring. Shundan keyin commitni tasdiqlang. Qayta commit bir xil kvitansiyani qaytaradi; dublikat yozuv yaratmaydi. Importlar bir-biriga bog‘langan modullar tartibida bajariladi.

XLSX/CSV eksport joriy qidiruv va holat filtriga mos. XLSXda holat, versiya, manba va tasdiqlangan hisob ko‘rsatkichlari ham bor. `PDF / Chop etish` barcha filtrlangan jadval qatorlarini brauzer print oynasiga beradi. Bu universitetning maxsus imzolangan blankasi aynan qayta yaratilganini anglatmaydi.

Tasdiqlangan yozuv tahrirlanmaydi: `Yangi versiya` bilan yangi loyiha yarating. Akademik yilni yopish APPROVER hisobida amalga oshiriladi; yilga keyingi yozuvlar bloklanadi.
