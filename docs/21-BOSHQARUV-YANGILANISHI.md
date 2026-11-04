# Boshqaruv yangilanishi v4

Ushbu paket mavjud til/rang yangilanishlarini birlashtiradi. Excel yordamchisi, static kesh tuzatishi, .env, Caddy/Kerio sozlamalari va akademik ma’lumotlar saqlanadi.

## Imkoniyatlar

- Til tanlagichning ortiqcha yozuvi olib tashlangan; O‘zbekcha, Русский, English va mahalliy Ş/Ç/Ö/Ğ yozuvi saqlangan.
- Kun/tun rejimi yuqoridagi alohida oy/quyosh tugmasida. Shaxsiy rang tanlash o‘z joyida.
- Muvaffaqiyatli simulyatsiya va me’yor bo‘yicha hisob serverda avtomatik saqlanadi. **Hisoblash tarixi** kirish parametrlari, xodim, natija va manba versiyalarini ko‘rsatadi. Oldingi hisoblarni orqaga qarab tiklamaydi.
- Simulyatsiya akademik tasdiq yoki o‘qituvchiga yuklama biriktirish hisoblanmaydi. Haqiqiy hisob uchun tasdiqlangan me’yor ishlatiladi; yuklama loyihasi avvalgidek alohida yaratiladi va tasdiqlanadi.
- Jadval ustunlari/filtrlari va nomlangan hisobot ko‘rinishlari har foydalanuvchi uchun alohida.
- XLSX: birinchi **Reyestr** importga mos asl kalitlar bilan, ikkinchi **Hisobot** tarjima qilingan va bezatilgan ko‘rinish. CSV: UTF-8 BOM, tanlanadigan ajratgich va Excel mosligi. PDF: chop etish sahifasidagi tugma orqali brauzerda **Save as PDF / Сохранить как PDF**.
- Shaxsiy panel ko‘rsatkichlari va eslatma davri sozlanadi.
- Tasdiqlash navbati vakolat doirasidagi hujjatlarni ko‘rsatadi. Administrator alohida vakolatli tasdiqlovchini belgilashi mumkin; muallif o‘z hujjatini tasdiqlamaydi.
- Administrator zaxira holatini ko‘radi va 1–168 soat davriylikni yoqadi. Ubuntu systemd xizmati har soat jadvalni tekshiradi; muddatdan keyingi navbatdagi tekshiruvda zaxira olinadi. Zaxiralar avtomatik o‘chirilmaydi: disk hajmini nazorat qiling.

## O‘rnatish

ZIPni GitHub havolasidan Ubuntu serverga yuklang, e’lon qilingan SHA256 bilan tekshiring, yangi bo‘sh papkaga oching:

    cd ~/tsuull-main
    sudo bash /home/devadmin/tsuull-management-v4/update-app.sh "$PWD"

Oldingi v1/v2/v3 frontend yoki dastlabki mos manba qabul qilinadi. Kutilmagan manba o‘zgarishida paket hech narsani almashtirmasdan to‘xtaydi. Bir xil paketni qayta ishga tushirish o‘zgarish kiritmaydi. Boshqa ERP yangilanishini shu vaqtda boshlamang.

Skript barcha fayllarni tekshiradi; ishlayotgan Docker tasvirini alohida teg bilan saqlaydi; PostgreSQL zaxirasi oladi va arxiv tarkibini tekshiradi; kod zaxirasini oladi; faqat kerakli kod qismlarini qo‘llaydi; tasvirni quradi; **schema migratsiyasi va erp_app grantlarini bajaradi**; zaxira timerini o‘rnatadi; **faqat app** konteynerini qayta yaratadi va health tekshiradi. App qayta ishga tushishida qisqa uzilish bo‘ladi. Baza va Caddy konteynerlari qayta yaratilmaydi.

Jadvallar qo‘shiladi, mavjud yozuvlar qayta hisoblanmaydi va tasdiqlar o‘zgarmaydi. Xatoda oldingi kod va Docker tasviri avtomatik qaytariladi. Zaxira pg_restore --list bilan tekshiriladi; bu to‘liq qayta tiklash mashqi o‘rnini bosmaydi.

## Orqaga qaytarish

O‘rnatish chiqishidagi **TIKLASH PAPKASI** yo‘lidan foydalaning:

    cd ~/tsuull-main
    sudo bash /home/devadmin/tsuull-management-v4/rollback-app.sh "$PWD" "/home/devadmin/tsuull-main/management-deploy-YYYYMMDDTHHMMSSffffffZ"

Bu kod va oldingi Docker tasvirini qaytaradi, shu paket o‘rnatgan yangi timer o‘chiriladi. Yangi jadvallar, hisoblash tarixi, sozlamalar va akademik yozuvlar o‘chirilmaydi; jonli bazaga eski dump avtomatik tiklanmaydi. Yangilanishdan keyin tegishli kod fayli o‘zgargan bo‘lsa rollback xavfsiz tarzda to‘xtaydi.

## Qabul tekshiruvi

1. To‘rt tilda yuqoridagi oy/quyosh tugmasini bosing.
2. Fan soatlarini hisoblang; avtomatik saqlash xabari va **Hisoblash tarixi**da natijani oching.
3. Reyestrda ustun/filtr tanlang, hisobot ko‘rinishini saqlang; XLSX, CSV va PDF chiqishini tekshiring.
4. **Boshqaruv markazi**da panel/eslatmalarni sozlang; ADMIN bilan zaxira holatini tekshiring va kerakli jadvalni yoqing.
5. Tasdiqlash navbatini tekshiring; faqat vakolatli alohida tasdiqlovchi hujjatni tasdiqlashi mumkin.

Sinovlar sun’iy alohida bazada bajariladi; muassasaning haqiqiy me’yorlari, elektron imzo va yuridik siyosatlari qo‘shilmagan.
