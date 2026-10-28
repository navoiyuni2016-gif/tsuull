# Serverga o‘rnatish — v3

## Talablar

Linux server, Docker Engine va Compose v2, boshlang‘ich tavsiya sifatida 2 CPU / 2 GB RAM, doimiy disk. Haqiqiy hajm va bir vaqtdagi foydalanuvchilar uchun yuklama sinovi alohida kerak. DNS A/AAAA haqiqiy serverga qarasin. 80 va 443 tashqaridan ochiq bo‘lsin; PostgreSQL va Node portlarini tashqariga ochmang. Ishlayotgan boshqa sayt bo‘lsa, uning proxy va portlarini almashtirmang — mavjud reverse proxyga moslashtiring.

## 1. Konfiguratsiya

Loyihani serverdagi alohida katalogga ko‘chiring. Quyidagi ishlar shu katalogdan bajariladi:

```sh
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Hosil bo‘lgan **uchta turli** qiymatni xavfsiz tahrirlovchi orqali `.env`dagi `DB_OWNER_PASSWORD` va `APP_DB_PASSWORD`ga, uchinchisini `MFA_ENCRYPTION_KEY`ga kiriting. Bu generatsiya natijalarini chatga yoki Gitga yubormang. `ERP_DOMAIN` — faqat hostname, masalan `erp.university.uz`; `ACME_EMAIL` — sertifikat uchun haqiqiy email. `APP_DB_PASSWORD` 48–128 ta hex belgi bo‘lishi kerak.

DB egasi migratsiya uchun, `erp_app` esa ilova uchun ishlatiladi. Ilovaning runtime roli audit va tarix jadvallarini UPDATE/DELETE/TRUNCATE qila olmaydi. Domen va parol bo‘sh bo‘lsa Compose ishga tushmaydi.

## 2. Obraz, baza va migratsiya

```sh
docker compose config --quiet
docker compose build
docker compose up -d db migrate app
docker compose ps
docker compose logs --tail=60 migrate app
```

`migrate` bir martalik jarayon sifatida 0 bilan yakunlanishi kerak; `app` healthy bo‘lsin. Ma’lumotlar `postgres_data` volume’da saqlanadi. `docker compose down -v` ishlatmang: u bazani yo‘qotadi.

Cloud proxy CA talab qiladigan build muhitida:

```sh
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t tsuull-erp:3.0.0 .
docker compose up -d --no-build db migrate app
```

Oddiy serverda qo‘shimcha CA secret kerak emas. TLS tekshiruvini o‘chirmang.

## 3. Birinchi hisob

Standart login/parol va avtomatik demo ma’lumotlar yo‘q. Bash terminalida maxfiy qiymatni ekranga chiqarmay oling:

```bash
read -r -p 'Administrator email: ' USER_EMAIL
read -r -p 'F.I.Sh.: ' USER_NAME
read -r -s -p 'Kamida 14 belgili parol: ' USER_PASSWORD
printf '\n'
export USER_EMAIL USER_NAME USER_PASSWORD
export USER_ROLE=ADMIN
docker compose exec -T -e USER_EMAIL -e USER_NAME -e USER_PASSWORD -e USER_ROLE app node server/create-user.mjs
unset USER_EMAIL USER_NAME USER_PASSWORD USER_ROLE
```

Kirgandan so‘ng `Foydalanuvchilar`dan mutaxassis, akademik tasdiqlovchi va auditor hisoblarini yarating. Hisobning fakultet/kafedra/o‘quv yili doirasini `Rol / doira / parol` oynasida belgilang. Bo‘sh doira umumiy vakolatni anglatadi. Hisobni xodimga berishdan oldin doirasini cheklang. Me’yor hujjatini administrator kiritadi va boshqa `APPROVER` hisob tasdiqlaydi.

## 4. HTTPS

```sh
docker compose up -d caddy
docker compose ps
docker compose logs --tail=60 caddy
```

Caddy haqiqiy domen uchun TLS sertifikat oladi va HTTPni HTTPSga yo‘naltiradi. DNS va ACME ishlashi ushbu lokal tekshiruvda isbotlanmagan; serverda tekshiring. `/health/live` va `/health/ready` JSON holat qaytaradi. Haqiqiy domeningiz orqali login, yozuv yaratish, boshqa brauzerdan ko‘rish va logoutni tekshiring. Production sessiyasi Secure, HttpOnly, SameSite=Strict cookie’da bo‘ladi. IP manzilli oddiy HTTPda production login ishlashi kutilmaydi.

## 5. Zaxira va tiklash

```sh
./deploy/backup.sh
```

Backup `backups/`ga owner-only ruxsat bilan yoziladi. Jadvalga qo‘ying, shifrlangan holda boshqa serverga ko‘chiring, retention siyosatini belgilang. Backupda foydalanuvchi ma’lumotlari bor.

Avval **alohida sinov bazasida** tiklash:

```sh
docker compose exec -T db createdb -U erp_owner erp_restore_test
docker compose exec -T db pg_restore -U erp_owner -d erp_restore_test --exit-on-error < backups/TANLANGAN-FAYL.dump
```

`TANLANGAN-FAYL`ni haqiqiy backup nomiga almashtiring. Yozuvlar, foydalanuvchilar, versiyalar va audit sonlarini manba bilan solishtiring. Ishlayotgan bazaga tiklashdan oldin maintenance rejimi, alohida backup va DBA tasdig‘i talab qilinadi. Mazkur ko‘rsatma mavjud production bazani almashtirmaydi.

## 6. Yangilash

Avval backup va staging sinov. Joriy image IDni yozib qo‘ying. Yangi versiyaga alohida tag bering, `docker compose build`, so‘ng migratsiyani bir marta bajaring va appni qayta yarating. Ushbu v3 migratsiyalari qo‘shimcha jadvallar yaratadi; kelajakdagi o‘zgarishlar uchun oldingi image bilan DB mosligini alohida tekshirish shart. Noma’lum DB migratsiyasini oddiy image rollback bilan avtomatik qaytarib bo‘lmaydi.

`APP_DB_PASSWORD`ni shunchaki `.env`da almashtirish mavjud PostgreSQL rol parolini yangilamaydi. Parol rotatsiyasini DBA bilan alohida bajaring. Sessiyalar PostgreSQL’da 8 soat amal qiladi, parol o‘zgarsa barcha sessiyalar bekor qilinadi.

## Dastlabki ma’lumot kiritish

Fakultet → kafedra → akademik yil → fan / guruh / o‘qituvchi → reja / yuklama / vazifa tartibida kiriting. Bazaga hech qanday taxminiy normativ seed qilinmaydi. Hisoblash uchun Superadmin profilidan typed me’yorlarni kiriting va akademik tasdiqlating. Import markazidan XLSX andozani oling yoki ustunlarni qo‘lda moslashtiring. Haqiqiy ma’lumot bilan qabul sinovini yakunlang.

## MFA va dalil fayllari

`MFA_ENCRYPTION_KEY` 32 bayt hex kalit bo‘lsin. Uni `.env` bilan birga xavfsiz zaxiralang; bazadagi MFA seedlari shu kalit bilan shifrlanadi. Kalitni shunchaki almashtirish mavjud MFA seedlarini ochib bo‘lmaydigan qiladi. Parollar, seedlar va recovery kodlarini logga yozmang.

Dalil fayllari PostgreSQL bytea maydonlarida turadi: `pg_dump` ularni ham oladi. Yangi backupni tekshirishda `portal.files`, `portal.settings`, `portal.imports`, `portal.settings_history` va `portal.year_locks`ni ham solishtiring. `.env`/MFA kalitini alohida, shifrlangan va cheklangan kirishli joyda saqlang.

Upload limiti 5MB, JSON/proxy limiti 8MB; XLSX importi 1000 qator. Katta importni modullar bo‘yicha qismlarga bo‘ling. Faqat birinchi varaq o‘qiladi; kerakli varaqni alohida XLSXga olib, formulalarni qiymatga aylantiring. Dastur buning universitetdagi rasmiy blankaga mosligini o‘zi taxmin qilmaydi.
