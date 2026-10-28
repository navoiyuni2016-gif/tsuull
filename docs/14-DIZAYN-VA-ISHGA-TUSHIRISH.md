# Interfeys yangilanishi

Bu nashr interaktiv frontend demo. Production ERP yakunlangani yoki WCAG sertifikatidan o‘tgani da’vo qilinmaydi.

## Ishga tushirish

Python 3 va Node.js mavjud. Tashqi frontend paketlar, shriftlar yoki CDN kerak emas.

```sh
cd /workspace/tsuull
python3 -m http.server 3000 --bind 0.0.0.0 --directory prototype
```

Demo kiritmalari `oquv-erp-demo-v2` localStorage kalitida saqlanadi. Bu umumiy server bazasi yoki himoyalangan audit emas. Faqat sun’iy ma’lumot kiriting. Brauzer ma’lumotlarini o‘chirish bu yozuvlarni ham o‘chiradi.

## Amalga oshirilgan

- Yagona yashil/neytral dizayn, moslashuvchan desktop va mobil layout.
- Yil, semestr, fakultet filtrlari bilan namuna KPI va yuklama diagrammasi.
- Aynan tanlangan filtrlar bo‘yicha DEMO belgili CSV eksport.
- Klaviatura orqali Ctrl/Cmd+K qidirish, Escape bilan yopish, modal fokus boshqaruvi.
- Mavjud katalog shakllari, validatsiya, kalkulyator, parametr simulyatsiyasi, vazifalar va demo audit.
- Demo yozuvlar va parametrlarni brauzerda saqlash.
- TTZ modullariga kirish xaritasi; bajarilmagan modullar ochiq belgilanadi.

## Tekshiruvlar

```sh
node packages/domain/tests/core.test.mjs
node --check prototype/app.js
node --check prototype/workspace.js
# Server ishga tushganidan keyin, Python Playwright va /usr/bin/chromium mavjud muhitda:
python3 tests/ui_smoke.py
```

UI sinovi filtr, eksport, kalkulyator xatosi, katalog yaratish, takroriy kod, reload saqlash, qidirish, modullar, vazifa holati va 390px mobil kenglikni tekshiradi. Brauzer xatolari tekshiriladi. Sinov alohida brauzer kontekstida ishlaydi.

## Bajarilmagan / rasmiy ishga tushirishni bloklovchi qismlar

Server/API, PostgreSQL migratsiyasini real bazada tekshirish, login/MFA, server RBAC, himoyalangan audit, haqiqiy fayl importi, rasmiy XLSX/PDF andozalari, akademik tasdiqlash va tashqi integratsiyalar bajarilmagan. Jadval, sillabus, amaliyot, sifat va prognoz modullari hozircha talab ekranlari. Hisobotlar katalogi va o‘quv yili oynasi boshlang‘ich konsept bo‘lib qoladi. Haqiqiy rasmiy hisob uchun tasdiqlangan me’yor, vakolatli tasdiqlovchi va anonimlashtirilgan Excel namunalari kerak. Dashboarddagi sun’iy sonlar haqiqiy ma’lumot emas.
