# PDF hujjat shabloni — v5

v4 boshqaruv yangilanishi ustiga o‘rnatiladi. Hisoblash tafsilotlari endi alohida A4 portret hujjat sahifasida ochiladi. Reyestrlar ham xuddi shu universitet blankida chiqariladi; eniga yoki bo‘yiga yo‘nalish tanlovi saqlanadi.

Universitet nomi profil sozlamalaridan, xodim va natijalar esa saqlangan hisobdan olinadi. Foizlar 4000/5000 texnik birliklar o‘rniga 40%/50% tarzida ko‘rsatiladi. Jadvallar ixcham, manba versiyalari ochiq, uzun reyestrlarda ustun sarlavhalari har sahifada takrorlanadi. Pastda sahifa raqamlari bor; oddiy simulyatsiya bitta A4 sahifaga sig‘adi. Uzun matn va jadvallar zarur miqdordagi sahifaga bo‘linadi.

Ko‘rinish to‘rt tilda ishlaydi. Haqiqiy fan/kafedra/xodim nomlari tarjima qilinmaydi. CALC/REG identifikatori tizim ichidagi havoladir; muassasaning chiqish hujjatlari raqami yoki akademik tasdiq o‘rnini bosmaydi. Simulyatsiya alohida belgilanadi; tasdiq va imzo yaratilmaydi.

## O‘rnatish

ZIPni GitHubdan yuklang va berilgan SHA256 bilan tekshiring. Yangi papkaga oching:

    cd ~/tsuull-main
    sudo bash /home/devadmin/tsuull-pdf-v5/update-app.sh "$PWD"

Skript avval v4 bilan moslikni tekshiradi. Keyin ishlayotgan Docker tasvirini saqlaydi, bazadan backup oladi va arxivini tekshiradi, kodning aniq zaxirasini oladi, yangi tasvirni quradi va faqat app konteynerini qayta yaratadi. Schema migratsiyasi, tasdiqlar, hisoblash formulalari va timerlar o‘zgarmaydi. Excel yordamchisi, Caddy/Kerio, .env va kesh sarlavhalari saqlanadi. App qayta ishga tushishida qisqa uzilish bo‘ladi.

Xatoda kod va tasvir avtomatik qaytariladi. Qo‘lda qaytarish uchun o‘rnatishdagi TIKLASH PAPKASI manzilini kiriting:

    sudo bash /home/devadmin/tsuull-pdf-v5/rollback-app.sh "$PWD" "/home/devadmin/tsuull-main/pdf-deploy-YYYYMMDDTHHMMSSffffffZ"

## PDF olish

1. Saytni yangilang. Hisoblash tarixi → Ochish → PDF / Chop etish. Alohida hujjat sahifasi ochiladi.
2. Undagi PDF / Chop etish tugmasini bosing; printerda PDF sifatida saqlashni tanlang.
3. Brauzerning qo‘shimcha chop etish sozlamalarida Kolontituly / Headers and footers bandini o‘chiring. Bu manzil URLi va brauzer sanasini olib tashlaydi. Masshtabni 100% qoldiring.
4. Reyestrdagi PDF tugmasi ham shu blankdan foydalanadi.

Chop etish Chrome/Edge’da tekshiriladi; turli printer drayverlari masshtab va chet maydonlarini qo‘shimcha o‘zgartirishi mumkin.
