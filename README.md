# TSUULL — O‘quv bo‘limi ERP v3

**GitHub’dan yuklab olish va serverga o‘rnatish:** [GITHUBDAN_ORNATISH.md](GITHUBDAN_ORNATISH.md). GitHub manba paketida internetli `deploy/install.sh` ishlatiladi; `--offline` emas.

Serverda ishlaydigan, Superadmin tomonidan sozlanadigan akademik boshqaruv platformasi. Universitetning me’yoriy qiymatlari dasturga oldindan qo‘yilmagan: Superadmin ularni interfeysda kiritadi, alohida akademik tasdiqlovchi tekshiradi.

**Excel ishlatmasdan reja tuzish va alohida mahalliy AI serverini ulash:** [O‘quv reja ustaxonasi](docs/19-REJA-USTAXONASI-VA-AI.md).

**Interfeys tillari va mavjud serverni ehtiyotkor yangilash:** [O‘zbekcha, ruscha, inglizcha va moslashtirilgan lotin yozuvi](docs/12-TILLAR.md).

**Shaxsiy ranglar va kunduzgi/tungi ko‘rinish:** [Interfeys sozlamalari](docs/20-INTERFEYS-SOZLAMALARI.md).

## Ishlaydigan oqim

Universitet profili → fakultet/kafedra/yil → fan/guruh/o‘qituvchi → qo‘lda kiritilgan hisoblash me’yori → akademik tasdiq → reja generatori → yuklama → dalilli fakt → o‘zgarmas hisobot snapshoti → XLSX/CSV yoki brauzer orqali PDF.

- Oq-ko‘k desktop/mobil interfeys, qidiruv, bildirishnomalar, shaxsiy profil va Superadmin paneli.
- PostgreSQL, server sessiyalari, parol tiklash/yangilash, TOTP MFA va bir martalik tiklash kodlari.
- Universitet/fakultet/kafedra/yil doirasidagi server ruxsatlari; o‘zgarmas audit va versiyalar.
- Typed me’yorlar, fixed-point hisob, kredit/prerequisite tekshiruvi, semestr tavsiyasi, yuklama kompetensiya/til/limit nazorati.
- Qo‘shimcha ish turlarining qo‘lda kiritiladigan birligi va koeffitsiyenti; yillik limit nazorati.
- Reja/fakt, hujjat dalillari, yilni yopish, tarixni saqlab yangi loyiha versiyasi ochish.
- XLSX andoza, ustun mapping, dry-run, xatolar, jami sonlar, atomar commit va idempotent kvitansiya. Makro/formula/tashqi link importda bajarilmaydi; bunday fayllar rad etiladi.
- Dalil fayllarini serverda saqlash va vakolat bilan yuklab olish; backup tarkibiga fayllar ham kiradi.
- Docker Compose, HTTPS uchun Caddy, cheklangan DB roli, healthcheck va backup/restore yo‘riqnomasi.

## O‘rnatish va boshlash

**[Serverga o‘rnatish](docs/15-SERVERGA-ORNATISH.md)** · **[Superadmin yo‘riqnomasi](docs/17-SUPERADMIN-QOLLANMA.md)** · **[Imkoniyatlar va chegaralar](docs/16-RELEASE-STATUS.md)**

Docker Engine/Compose, haqiqiy domen va `.env.example` asosidagi maxfiy konfiguratsiya kerak. Standart parol va avtomatik demo me’yorlar yo‘q. `public/index.html`ni alohida fayl sifatida ochmang — ilova Node server API bilan ishlaydi. `prototype/` asl v1 arxividir va v3 serveri tomonidan tashqariga berilmaydi.

## Tekshirish

```sh
npm ci --ignore-scripts
node packages/domain/tests/core.test.mjs
node tests/academic.test.mjs
# TEST_DATABASE_URL faqat alohida *_test bazaga ko‘rsatsin:
node --env-file=/secure/path/test.env tests/server.test.mjs
node --env-file=/secure/path/test.env tests/extended.test.mjs
# Python Playwright va Chromium; faqat izolyatsiyalangan sinov serveri:
python3 tests/ui_server.py /secure/path/ui.env
python3 tests/ui_v3.py /secure/path/ui.env
```

`TEST_DATABASE_URL` export qilinganida `npm test` barcha to‘rtta test to‘plamini bajaradi. Testdagi raqamlar faqat sun’iy fixture; productionga seed qilinmaydi.

Haqiqiy universitet ma’lumotlaridagi yakuniy qabul, maxsus rasmiy Excel maketining mosligi va ommaviy serverga joylash ushbu lokal tekshiruvdan alohida. Tashqi HEMIS/SSO integratsiyalari ruxsat va API berilmaguncha avtomatik ulanmaydi. To‘liq TTZning barcha istisnolari bajarilgan degan da’vo yo‘q; aniq chegaralar release hujjatida yozilgan.

## el.tsuull.uz / VM 102 uchun tayyor paket

`172.20.0.50`, `devadmin` va `el.tsuull.uz` uchun moslangan o‘rnatish: **[BOSHLASH.md](BOSHLASH.md)**.

To‘liq server arxivida Linux amd64 uchun tekshirilgan app/PostgreSQL/Caddy obrazlari bor. Ubuntu guest VM ichida `sudo bash deploy/install.sh --offline` ishlatiladi. HTTPS turi interaktiv tanlanadi: shu VMda ACME, mavjud TLS proxy yoki universitet sertifikati. Mavjud `.env`, parollar va ma’lumotlar avtomatik almashtirilmaydi. Proxmox hostida ishlatmang.
