# CSV va eksport oynasi — v6

V4 yoki v5 ustiga bitta paket bilan o‘rnatiladi. V5 dagi A4 PDF shablonlari ham paketga kiritilgan; v5 alohida o‘rnatilmagan bo‘lsa ham ishlaydi.

## O‘zgarishlar

- Format uchun ixcham kartochka, tartibli sozlamalar, dastlabki 5 ta yozuvdan jadval namunasi va jami yozuv/ustunlar soni.
- Til tanlanganda namunadagi sarlavhalar ham o‘sha tilda ko‘rinadi. Haqiqiy fan/kafedra/xodim nomlari o‘zgarmaydi.
- CSV uchun ajratgich va Excel mosligi ko‘rsatiladi. Sahifa yo‘nalishi faqat XLSX/PDF formatida ko‘rinadi.
- Fayl nomlari tanlangan tilda yuklanadi; CSV UTF-8 BOM, qo‘shtirnoqlar, satr oxirlari va formula sifatida talqin qilinadigan matnlar himoyasini saqlaydi.
- Namunada faqat 5 ta yozuv ko‘rsatiladi, yuklangan faylda barcha mos yozuvlar bo‘ladi. Filtrlar va vakolatlar serverda qayta tekshiriladi.
- Kunduzgi/tungi rejim va mobil ekranlar bilan mos.

CSV oddiy ma’lumotlar formatidir: rang, shrift va katak bezaklari saqlanmaydi. Rangli jadval uchun Format → Excel (.xlsx), rasmiy uslubdagi chop etish uchun PDF tanlanadi. CSV ma’lumotlari tarjima qilinmaydi, faqat sarlavha va tanlov holatlari tarjima qilinadi.

## O‘rnatish

ZIPni GitHubdan yuklang va berilgan SHA256 bilan tekshiring. Yangi papkaga oching:

    cd ~/tsuull-main
    sudo bash /home/devadmin/tsuull-export-v6/update-app.sh "$PWD"

Skript avval manba mosligini tekshiradi, kod/baza va ishlayotgan Docker tasvirini saqlaydi, yangi tasvirni quradi, faqat app konteynerini qayta yaratadi va tayyorlikni tekshiradi. App qayta ishga tushishida qisqa uzilish bo‘ladi. Baza migratsiyasi va timer o‘zgarishi yo‘q. Excel yordamchisi, Caddy/Kerio, .env, kesh tuzatishlari va mavjud yozuvlar saqlanadi.

Xatoda oldingi kod va tasvir avtomatik qaytariladi. Qo‘lda qaytarish:

    sudo bash /home/devadmin/tsuull-export-v6/rollback-app.sh "$PWD" "/home/devadmin/tsuull-main/export-deploy-YYYYMMDDTHHMMSSffffffZ"

## Tekshirish

Saytni yangilang. Istalgan reyestr → Eksport → CSV: namuna va yozuvlar sonini tekshiring, til/ajratgich tanlang va Yuklab olishni bosing. Namuna xodimning joriy vakolatlari doirasidagi ma’lumotlarnigina ko‘rsatadi.
