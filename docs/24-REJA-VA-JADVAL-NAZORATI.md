# Reja taqqoslash va jadval nazorati — v7

V6 ustiga bitta paket bilan o‘rnatiladi. Faqat foydalanuvchi tanlagan ikki imkoniyat qo‘shilgan: reja versiyalarini taqqoslash va dars jadvalini tasdiqlangan yuklama bilan solishtirish.

## Reja versiyalarini taqqoslash

Reyestrdagi reja → Ochish → Yangi versiya: yangi noyob kod va ixtiyoriy sabab kiriting. Tasdiqlangan asl reja saqlanadi; yangi nusxa loyihadir. Nusxa tasdiqlangan rejaning muzlatilgan fan tarkibidan olinadi. Rejalar oynasidagi Taqqoslash tugmasi yoki chap menyudagi Reja versiyalarini taqqoslash orqali ikkita rejani tanlang.

Qo‘shilgan/olib tashlangan/o‘zgargan/o‘zgarmagan fanlar, eski/yangi kredit va semestr, talaba soatlari, muallif, oxirgi o‘zgartirgan xodim va haqiqiy audit sababi ko‘rsatiladi. Tafsilotlarda auditoriya, mustaqil ta’lim va barcha mashg‘ulot turlari uchun soat farqlari bor. PDF ham chiqariladi.

Tasdiqlangan rejaning saqlangan tarkibi ishlatiladi; loyiha uchun joriy saqlangan holat ko‘rsatiladi. Bu har bir eski loyiha tahririning to‘liq tarixiy tarkibini orqaga qarab yaratmaydi. Alohida yozuvning Versiyalar tarixi avvalgidek mavjud. Tasdiqlangan me’yor yoki sana bo‘lmasa, kredit/semestr solishtiriladi, soatlar o‘rnida — va izoh chiqadi. Fan versiyalari manbasi bilan moslashtiriladi; noaniq takrorlar avtomatik birlashtirilmaydi.

Loyihani ustaxonada ochish orqali yangi nusxani tahrirlang. O‘zgarish sababi maydoni ixtiyoriy; kiritilmasa Sabab ko‘rsatilmagan deb chiqadi. Sabablar foydalanuvchi matni bo‘lib, tarjima qilinmaydi. Saqlash avtomatik akademik tasdiq emas.

## Tasdiqlangan juftlik qoidasini tayyorlash

Foydalanuvchi 2026–2027 yil uchun quyidagi vaqtlarni va **1 para = 80 daqiqa = 2 akademik soat** birligini tasdiqlagan:

| Juftlik | Vaqt | Akademik soat |
|---|---|---|
| 1 | 08:00–09:20 | 2 |
| 2 | 09:30–10:50 | 2 |
| 3 | 11:00–12:20 | 2 |
| 4 | 13:00–14:20 | 2 |
| 5 | 14:30–15:50 | 2 |
| 6 | 16:00–17:20 | 2 |
| 7 | 17:30–18:50 | 2 |
| 8 | 19:00–20:20 | 2 |

Me’yorlar va versiyalar → yangi qoida. O‘quv yilini tanlang, Jadval juftliklari qoidasi belgisini yoqing va 2026–2027 juftliklarini qo‘yish tugmasini bosing. Kod/nom/doira, huquqiy asos, parametrlarning hujjat tavsifi va amal qilish sanalarini kiriting. Sana tanlangan o‘quv yili ichida bo‘lishi kerak. So‘ng alohida akademik tasdiqlovchi tasdiqlaydi. Davrlar faqat loyiha formasiga qo‘yiladi; o‘rnatish biznes yozuv yoki tasdiqlangan me’yorni avtomatik yaratmaydi. Oddiy kredit/soat Hisoblash parametrlari belgisini ushbu alohida juftlik qoidasida yoqish shart emas.

## Jadvalni yuklamaga bog‘lash

Dars jadvali → mashg‘ulot qo‘shish/tahrirlash. Tasdiqlangan yuklamani tanlang: guruh va o‘qituvchi undan olinadi. Tasdiqlangan juftlik qoidasi, sana va juftlik vaqtini tanlang; akademik soat serverda hisoblanadi va o‘zgartirib bo‘lmaydi.

Faqat to‘liq tasdiqlangan juftliklar qo‘shiladi. Masalan, 08:00–10:50 oralig‘i 2 ta to‘liq juftlik bo‘lib, 10 daqiqalik tanaffusni qo‘shmasdan 4 akademik soat beradi. Nostandart/qisman juftlikka taxminiy yoki yaxlitlangan soat berilmaydi; bunday vaqt uchun muassasaning alohida tasdiqlangan davri kerak.

Guruh/o‘qituvchi, o‘quv yili, amal sanalari, auditoriya sig‘imi, vaqt to‘qnashuvi va yozuv vakolatlari serverda tekshiriladi. Tasdiqlangan eski mashg‘ulotga bog‘lanish kiritish uchun yangi versiya oching; asl tasdiqlangan yozuv o‘zgarmaydi.

## Nazorat oynasi

Jadval va yuklama nazorati: yil, kafedra, o‘qituvchi, fan va guruh bo‘yicha tanlang.

- Tasdiqlangan yuklama — o‘qituvchiga biriktirilgan reja.
- Jadvaldagi tasdiqlangan soat — bog‘langan, tasdiqlangan mashg‘ulotlar.
- Tasdiq kutayotgan soat — loyiha/ko‘rib chiqilayotgan jadval, alohida jami.
- Yetishmaydi/Ortiqcha — tasdiqlangan jadval bilan butun tanlangan o‘quv yili yuklamasi farqi; muddatga mutanosib taxmin emas.
- Tekshirilgan fakt — faqat alohida tasdiqlangan ijro dalillari. Jadvaldan fakt avtomatik yaratilmaydi.

Bog‘lanmagan eski mashg‘ulotlar va manbasi mos kelmagan yozuvlar jamiga qo‘shilmaydi, alohida tekshirish ro‘yxatiga chiqadi. Bir darsning yangi tasdiqlangan avlod nusxasi oldingi nusxasini amaldagi jadval hisobida almashtiradi, tarix saqlanadi. Parallel tasdiqlangan shoxlar bo‘lsa, birini taxminan tanlamaydi: soatlar chiqarib tashlanib, ogohlantirish beriladi. Ogohlantirishlar borida ko‘rsatilgan yetishmovchilikni to‘liq jadvalning yakuniy bahosi deb qabul qilmang.

## O‘rnatish va qaytarish

GitHub ZIPini berilgan SHA256 bilan tekshirib, yangi papkaga oching:

    cd ~/tsuull-main
    sudo bash /home/devadmin/tsuull-controls-v7/update-app.sh "$PWD"

Avval barcha manbalar tekshiriladi. Bazadan tasdiqlangan arxiv zaxirasi va kod/tasvir zaxirasi olinadi. Faqat app qayta yaratiladi, qisqa uzilish bo‘ladi. Baza migratsiyasi, parollar, timerlar, Caddy/Kerio va mavjud ma’lumotlar o‘zgarmaydi. App/ext fayllaridagi faqat aniq zarur qismlar yangilanadi: mahalliy Excel yordamchisi va static kesh tuzatishi saqlanadi. Ularning o‘zgartiriladigan qismi kutilganidan farq qilsa, paket hech narsa almashtirmasdan to‘xtaydi.

Xatoda kod va Docker tasviri avtomatik qaytariladi. Qo‘lda qaytarishda o‘rnatishdagi TIKLASH PAPKASI ishlatiladi:

    sudo bash /home/devadmin/tsuull-controls-v7/rollback-app.sh "$PWD" "/home/devadmin/tsuull-main/controls-deploy-YYYYMMDDTHHMMSSffffffZ"

Yangi bog‘lanishlar va audit bazada qoladi. Eski ilovaga qaytganda yangi boshqaruv bo‘limlari ko‘rinmaydi.
