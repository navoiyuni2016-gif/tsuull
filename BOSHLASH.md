# el.tsuull.uz — VM 102 ichiga o‘rnatish

**Manzil:** `172.20.0.50` · **SSH:** `devadmin@172.20.0.50` · **Domen:** `el.tsuull.uz`

Bu paket Proxmox panelining o‘ziga emas, uning ichidagi **102 (dev-server) Ubuntu VM**ga o‘rnatiladi. Skrinshotdagi Proxmox boshqaruv manzili ilova serveri emas. Avval Ubuntu o‘rnatilishi tugab, VM normal login holatiga kelsin.

## 1. Paketni ko‘chirish

Kompyuteringizdagi terminal/PowerShell orqali:

```powershell
scp .\TSUULL_el_tsuull_uz_SERVER.tar.gz devadmin@172.20.0.50:~/
ssh devadmin@172.20.0.50
```

Birinchi ulanishda SSH fingerprintni Proxmox VM konsolidagi quyidagi natija bilan solishtiring:

```sh
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

SSH yoki sudo parolini chatga yubormang. Ular faqat o‘zingizning SSH terminalingizga kiritiladi.

VM terminalida:

```sh
tar -xzf TSUULL_el_tsuull_uz_SERVER.tar.gz
cd TSUULL_el_tsuull_uz
```

## 2. Docker

Agar Docker va Compose v2 o‘rnatilmagan bo‘lsa:

```sh
sudo bash deploy/install-docker-ubuntu.sh
```

Bu qadam internetdan rasmiy Docker/Ubuntu paketlarini oladi, TLS va GPG imzosini tekshiradi. Docker oldindan tayyor bo‘lsa, qadamni o‘tkazing. To‘liq internetdan uzilgan yangi Ubuntu VMga Docker Engine/Compose’ni tizim administratori oldindan o‘rnatishi kerak. Offline paket **ilova, PostgreSQL va Caddy obrazlarini** o‘z ichiga oladi; OS paketlari emas. Offline obrazlar Linux amd64/x86_64 uchun.

## 3. Ishga tushirish

```sh
sudo bash deploy/install.sh --offline
```

Skript HTTPS variantini so‘raydi:

1. **Shu VMda avtomatik HTTPS:** tashqi DNS va router/NAT 80/443 trafikni `172.20.0.50`ga olib kelishi kerak. Sertifikat uchun haqiqiy email so‘raladi. Caddy sertifikatni internet orqali oladi.
2. **Mavjud Nginx/proxy orqali:** mavjud HTTPS proxy `el.tsuull.uz`ni `127.0.0.1:8080`ga uzatadi. `deploy/nginx-location.conf` namunasi berilgan; skript mavjud Nginx saytlarini o‘zgartirmaydi. Agar proxy boshqa VMda bo‘lsa, `.env`da `APP_BIND_ADDRESS=172.20.0.50` belgilang va 8080 portini faqat proxy IPsi uchun ruxsat qiling. Proxy upstreami `http://172.20.0.50:8080` bo‘ladi.
3. **Universitetning sertifikati:** ishga tushirishdan oldin `deploy/certs/fullchain.pem` va `deploy/certs/privkey.pem`ni xavfsiz joylashtiring. Private key’ni chatga yoki Gitga yubormang. Skript domen, amal qilish muddati va key mosligini tekshiradi. Sertifikat zanjiri foydalanuvchi qurilmalarida ishonchli bo‘lishi kerak.

Agar qaysi variant ekanini bilmasangiz, universitet tarmoq administratoridan **el.tsuull.uz TLS qayerda tugashini** aniqlang. `172.20.0.50` xususiy manzil bo‘lgani uchun DNSni unga yozishning o‘zi tashqi internetdan ulanish yaratmaydi.

Skript:

- maxfiy `.env`ni serverning o‘zida yaratadi, uchta alohida tasodifiy kalit chiqaradi;
- mavjud `.env` va baza volume’larini saqlaydi; ishlayotgan eski bazani migratsiyadan oldin zaxiralaydi;
- offline obraz SHA256 nazoratini tekshiradi va `docker load` qiladi;
- PostgreSQL, migratsiya va ilovani ishga tushiradi, readiness’ni tekshiradi;
- HTTPS rejimiga mos Caddy yoki proxy upstreamini tayyorlaydi;
- hali bo‘lmasa, **Superadmin email, ism va yashirin parol** kiritishni so‘raydi.

Standart parol yo‘q. Superadmin parolini eslab qoling; u arxivga yoki logga yozilmaydi.

## 4. Tekshirish

```sh
sudo bash deploy/compose.sh ps
sudo bash deploy/compose.sh logs --tail=60 app migrate
```

Serverga mos tarmoqdan brauzerda `https://el.tsuull.uz`ni oching. `/health/ready` `{"status":"ready"}` qaytarishi kerak. Ilova/baza tayyorligi **tashqi DNS va sertifikat ishlashini o‘z-o‘zidan isbotlamaydi**.

Login → **Superadmin profili** → universitet ma’lumotlari va me’yorlarini kiriting. [Qo‘llanma](docs/17-SUPERADMIN-QOLLANMA.md). Maxsus qiymatlar oldindan qonuniy standart sifatida qo‘yilmagan.

Superadmin yaratish keyinroq kerak bo‘lsa:

```sh
sudo bash deploy/create-admin.sh
```

Zaxira:

```sh
sudo bash deploy/backup.sh
```

`.env`ni ham alohida shifrlangan joyga zaxiralang: undagi MFA kaliti yo‘qolsa, bazadagi MFA seedlarini ochib bo‘lmaydi.

## Internetli kichik paket

Agar faqat manba ZIPni olgan bo‘lsangiz, unda offline obrazlar yo‘q. `sudo bash deploy/install.sh` deb ishlating (`--offline`siz): server Docker/npm registrlariga chiqa olishi kerak.

## Mavjud sozlamalarni o‘zgartirish

`.deploy-mode` rejimni saqlaydi; oddiy qayta ishga tushirish uni almashtirmaydi. Rejimni ataylab o‘zgartirishda `.env` va `.deploy-mode`ni xavfsiz tahrirlang, eski proxy portlari va sertifikatlarni tekshiring. **`docker compose down -v` ishlatmang** — bu bazani yo‘qotadi. Portlar boshqa sayt tomonidan band bo‘lsa, o‘sha servisni avtomatik to‘xtatmang.

Haqiqiy serverga ushbu paketni agent bu muhitdan yuklamagan: private tarmoqqa VPN/TCP yo‘li va SSH autentifikatsiyasi berilmagan. Paket lokal, alohida Docker muhitida tekshirilgan; real DNS/TLS yakuniy sinovi sizning server tarmog‘ingizda bajariladi. Ilovaning funksional chegaralari [release hujjati](docs/16-RELEASE-STATUS.md)da saqlangan.
