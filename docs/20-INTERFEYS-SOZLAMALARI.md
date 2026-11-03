# Shaxsiy interfeys va ranglar

Kirish oynasidagi yoki yuqori paneldagi **Interfeys** tugmasi ko‘rinish sozlamalarini ochadi. Telefon ekranida shu tugma ranglar belgisi bilan ko‘rsatiladi.

- Kunduzgi, tungi yoki qurilma sozlamasiga mos avtomatik ko‘rinish.
- Tayyor ranglar, ixtiyoriy rang tanlagichi va `#2859dc` shaklidagi aniq rang kodi.
- Rang tugma, menyu, tanlangan element va sahifaning yordamchi ranglariga qo‘llanadi.
- Jonli ko‘rinish: **Saqlash** tanlovni saqlaydi; **Bekor qilish**, × yoki Escape avvalgi ko‘rinishga qaytaradi. **Standartni tiklash** boshlang‘ich ko‘rinishni namoyish etadi; uni ham Saqlash bilan tasdiqlash kerak.
- Har bir hisob uchun shu brauzerda alohida saqlanadi. Kirish oynasining tanlovi ham alohida. Bu serverga saqlanadigan yoki boshqa qurilmaga avtomatik ko‘chadigan sozlama emas.
- Brauzer saqlashni bloklasa, xabar chiqadi va tanlov joriy oynada amal qiladi.
- To‘rtta interfeys tili qo‘llanadi.

Tugma matni, havolalar va tanlangan menyu uchun rang kontrasti avtomatik moslanadi. Imkon qadar tanlangan rangning o‘zi saqlanadi; yozuv va yordamchi ranglar o‘qilishi uchun moslashtiriladi. Holat ranglari ma’nosini saqlaydi. PDF/chop etishda oq fon ishlatiladi; XLSX/CSV fayllari shaxsiy rangdan o‘zgarmaydi.

## Tekshiruv

`node tests/appearance.test.mjs` — rejimlar, rang tekshiruvi, ekstremal ranglar kontrasti va hisob kalitlari.

`python3 tests/ui_appearance.py /path/to/isolated-ui.env` — haqiqiy interfeysda jonli tanlash, saqlash, qayta yuklash, bekor qilish, hisoblar almashishi, avtomatik rejim, mobil ekran, chop etish va saqlash bloklanishi. Faqat ajratilgan sinov serverida ishlating: bitta sintetik hisob yaratadi.

`python3 tests/i18n_bundle_test.py` — oldingi v1 va v2 til paketlarining har ikkisidan yangilash, mahalliy Excel/server sozlamalarini saqlash, rollback va o‘zgargan manbani rad etish.

## Mavjud serverga o‘rnatish

`tsuull-interface-v3.zip` oldingi til paketlarining v1 yoki v2 nusxasiga mos keladi. Oldingi tuzatishlar ham paketga kiradi. Faqat frontend fayllari yangilanadi; server kodi, Caddy, Excel dizayni va biznes ma’lumotlari almashtirilmaydi.

```bash
cd ~/tsuull-main
python3 -m zipfile -e /home/devadmin/tsuull-interface-v3.zip /home/devadmin/tsuull-interface-v3
sudo bash /home/devadmin/tsuull-interface-v3/update-app.sh "$PWD"
```

Skript avval manbani tekshiradi, ishlayotgan Docker tasvirini va bazani zaxiralaydi, keyin faqat `app`ni qayta ishga tushiradi. Qisqa uzilish bo‘ladi. Noma’lum mahalliy o‘zgarish bo‘lsa, fayllarni almashtirishdan oldin to‘xtaydi.

Ortga qaytarish uchun [til paketi yo‘riqnomasi](12-TILLAR.md)dagi tartib ishlatiladi. Tasvirni tanlashda aynan yangi `/home/devadmin/tsuull-interface-v3/previous-image.txt`, manba uchun esa yangi `i18n-upgrade-...` zaxira papkasini ishlating.
