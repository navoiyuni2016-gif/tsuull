# Interfeys tillari va ehtiyotkor yangilash

Interfeysda o‘zbekcha, ruscha, inglizcha va moslashtirilgan lotin yozuvi bor. Standart til — o‘zbekcha. Moslashtirilgan yozuv foydalanuvchi tanlagan `Sh → Ş`, `Ch → Ç`, `O‘ → Ö`, `G‘ → Ğ` almashtirishlarini qo‘llaydi; rasmiy alifbo sifatida taqdim etilmaydi.

Til kirish oynasida va yuqori panelda tanlanadi. Tanlov shu brauzerda saqlanadi; `?lang=ru`, `?lang=en`, `?lang=uz`, `?lang=uz-new` havolalari ham ishlaydi. Saqlanmagan shakl yoki reja bo‘lsa, til almashishdan oldin ogohlantiriladi. Til o‘zgarishi sahifani qayta yuklaydi. Seans va vakolatlar saqlanadi. Sana vaqti Asia/Tashkent bo‘yicha qoladi.

Tarjima faqat manba kodiga tegishli menyu, tugma, ko‘rsatma, maydon nomlari va tanilgan xatolar uchun. Fan, fakultet, kafedra nomlari, hujjatlar, huquqiy asoslar, foydalanuvchi matnlari, AI izohlari va auditning asl mazmuni tarjima qilinmaydi. Tanlovlarda ko‘rsatiladigan yozuv o‘zgaradi, bazaga yuboriladigan kod va qiymatlar saqlanadi. Texnik ID va formulalar o‘zgarmaydi. Import ustunlari va mavjud Excel hisobotlari avvalgi formatida qoladi. Tashqi tarjima xizmatiga ma’lumot yuborilmaydi.

## Alohida sinovlar

- `node tests/i18n.test.mjs` — lug‘at, yozuv, opaque qiymatlar va fallback.
- `python3 tests/ui_i18n.py /path/to/isolated-ui.env` — to‘rt til, 19 modul shakllari, mobil ko‘rinish, qiymatlar, xatolar va tilni eslab qolish. Faqat ajratilgan test serverida bajaring; sintetik yozuvlar yaratadi.
- `python3 tests/i18n_bundle_test.py` — paket preflight/apply/rollback, kesh versiyalari, manba farqi va boshqa fayllar daxlsizligi.
- `npm test` — mavjud hisoblash, vakolat, import va reja regressiyalari hamda yangi til sinovi.

## Paketni o‘rnatish

Bu paket faqat 7 ta `public/` faylini yangilaydi. `server/`, Excel dizayni, Caddy, Kerio, Docker sozlamalari, `.env` va baza o‘zgartirilmaydi. c139e98 manbasi va oldingi `?v=...` kesh versiyalari taniladi. Boshqa o‘zgarish topilsa, o‘rnatish barcha fayllarga tegishdan oldin to‘xtaydi. Loyihangiz ustiga butun GitHub arxivini yozmang.

Windows PowerShell’da, yuklab olingan ZIP `Downloads` papkasida bo‘lsa:

```powershell
scp "$env:USERPROFILE\Downloads\tsuull-i18n-update.zip" devadmin@172.20.0.50:/home/devadmin/
ssh devadmin@172.20.0.50
```

Ubuntu terminalida:

```bash
cd ~/tsuull-main
python3 -m zipfile -e /home/devadmin/tsuull-i18n-update.zip /home/devadmin/tsuull-i18n-update
sudo python3 /home/devadmin/tsuull-i18n-update/install.py --root "$PWD"
```

`TEKSHIRUV O‘TDI` bo‘lsa, Ubuntu’da shu blokni bajaring. Manba zaxirasi avtomatik yaratiladi. Eski Docker tasviri ham alohida teg bilan saqlanadi. Faqat `app` qayta ishga tushadi; qisqa uzilish bo‘ladi.

```bash
sudo bash /home/devadmin/tsuull-i18n-update/update-app.sh "$PWD"
```

Saytni odatiy yangilab oching. Kirish oynasida yoki yuqoridagi panelda til tanlagichi chiqadi. Bitta yozuv, tanlov maydoni, hisoblash va Excel yuklashni tekshiring. Kod paketi bazaga o‘zgartirish kiritmaydi.

## Ortga qaytarish

Muammo bo‘lsa, aynan shu yangilashdan oldingi tasvirni qayta ishlating. Boshqa parallel yangilanish o‘rnatilgan bo‘lsa, quyidagini bajarmang.

```bash
sudo bash -s <<'SH'
set -euo pipefail
cd /home/devadmin/tsuull-main
old_image="$(cat /home/devadmin/tsuull-i18n-update/previous-image.txt)"
case "$old_image" in tsuull-erp:i18n-before-*) ;; *) exit 1 ;; esac
docker image inspect "$old_image" >/dev/null
docker image tag "$old_image" tsuull-erp:3.0.0
bash deploy/compose.sh up -d --no-deps --force-recreate --wait --wait-timeout 90 app
SH
```

Manba kodini ham qaytarish uchun installer chiqargan `i18n-upgrade-...` zaxira papkasini aniq ko‘rsating:

```bash
sudo python3 /home/devadmin/tsuull-i18n-update/install.py --root "$PWD" --rollback /ANIQ/ZAXIRA/PAPKASI --apply
```

Yangilanishdan keyin o‘zgargan fayl aniqlansa, rollback to‘xtaydi. Baza rollback qilinmaydi: til paketi biznes ma’lumotlarini o‘zgartirmaydi.

## Texnik kodlar nomlari — v2 tuzatish

`PER_STUDENT`, `PER_GROUP`, `PER_EVENT`, `FIXED_HOURS`, yaxlitlash usullari,
me’yor birliklari, import holatlari va audit amallari to‘rtta tilda tushunarli
nom bilan ko‘rsatiladi. Bazaga yoziladigan qiymatlar va import shartnomasi o‘zgarmaydi.

`tsuull-i18n-labels-v2.zip` avvalgi `16fb6fa249a8` til paketining ustiga
qo‘llanadi. Yangilanish faqat o‘zgargan frontend fayllarini oladi. Oldingi
paketni qayta yuklab o‘rnatish o‘rniga aynan v2 arxivini alohida papkaga oching:

```bash
python3 -m zipfile -e /home/devadmin/tsuull-i18n-labels-v2.zip /home/devadmin/tsuull-i18n-labels-v2
sudo bash /home/devadmin/tsuull-i18n-labels-v2/update-app.sh /home/devadmin/tsuull-main
```

Ishlayotgan ilovaning eski tasviri va manba kodi zaxiralanadi. Boshqa mahalliy
o‘zgarish aniqlansa, o‘rnatish almashtirishdan oldin to‘xtaydi. v2 rollback uchun
shu yangi paket papkasidagi `previous-image.txt` va installer chiqargan yangi
zaxira papkasidan foydalaning.
