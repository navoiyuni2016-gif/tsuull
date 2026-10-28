# el.tsuull.uz server paketi — tekshirish holati

Maqsadli server: Proxmox VM 102 (`dev-server`), Ubuntu, `172.20.0.50`; login `devadmin`; ilova domeni `el.tsuull.uz`.

## Konfiguratsiya

- `APP_ORIGIN=https://el.tsuull.uz` — barcha rejimlarda bir xil. Production Secure/HttpOnly cookie va origin/CSRF tekshiruvi saqlanadi.
- Standalone/cert rejimida host portlari `172.20.0.50:80` va `172.20.0.50:443`ga bog‘lanadi. Testlarda faqat izolyatsiyalangan loopback portlari ishlatiladi.
- Proxy rejimida Caddy avtomatik ishga tushmaydi; app `127.0.0.1:8080`da. Boshqa VMdagi proxy kerak bo‘lsa `APP_BIND_ADDRESS`ni ataylab LAN manziliga sozlash va firewallni faqat proxy manbasiga cheklash lozim.
- `.env` o‘rnatishda uchta yangi tasodifiy kalit bilan 0600 rejimida yaratiladi. Takroriy ishga tushirish ularni almashtirmaydi. Default Superadmin paroli yo‘q.
- `.deploy-mode` tanlangan rejimni saqlaydi. `deploy/compose.sh` va `deploy/backup.sh` shu rejimdan foydalanadi.
- Offline to‘plam faqat toza Docker image’laridan tuzilgan; ishlayotgan konteyner, DB volume, `.env`, TLS private key yoki test bazasi arxivlanmagan.
- `images/runtime-images.sha256` load’dan oldin tekshiriladi. Obrazlar Linux amd64; boshqa arxitektura uchun online build kerak.

## Tekshiruvlar

`python3 tests/deployment_test.py` quyidagilarni alohida vaqtinchalik kataloglarda tekshiradi:

1. Proxy rejimida target origin va loopback porti; DB porti tashqariga ochilmasligi.
2. Uchta alohida 64-hex kalit, 0600 ruxsat va outputga qiymat chiqmasligi.
3. Takroriy prepare’da `.env`ning byte-for-byte saqlanishi; rejimni tasodifiy almashtirish bloklanishi.
4. Standalone’da target IP/80/443 va ACME email.
5. Universitet sertifikati uchun to‘g‘ri mount va config almashtirilishi.
6. Boshqa domenli mavjud `.env`ni himoyalash; public TLS uchun contact talab qilinishi.

`python3 tests/deployment_smoke.py` Docker daemon talab qiladi va faqat o‘zi yaratgan tasodifiy nomli lokal test stekini ishlatadi. Offline checksum/load, migratsiya, hostname tekshiruvi bilan HTTPS, Secure login va takroriy o‘rnatishdagi backup/kalit/account saqlanishini tekshiradi. Test sertifikati faqat shu lokal sinov uchun yaratiladi; uni foydalanuvchi serveriga tarqatmang.

## Real server holati

Bulut sessiyasida VPN konfiguratsiyasi va private `172.20.0.50:22` uchun TCP grant yo‘q. Shu sabab agent private VMga ulanmagan, server fayllarini o‘zgartirmagan va real domen sertifikatini chiqarmagan. SSH buyruq berilishi tarmoq yo‘li yoki autentifikatsiya mavjudligini isbotlamaydi. Real SSH host-key, tarmoq marshruti, DNS/NAT va TLS yakuniy tekshiruvlari universitet tarmog‘ida bajariladi.

Ubuntu Docker o‘rnatish helperi rasmiy HTTPS repository va kutilgan Docker GPG fingerprintini tekshiradi. U bu sessiyada Ubuntu VMning o‘zida bajarilmagan; mavjud Docker o‘rnatishini yoki Proxmox hostini almashtirishga urinmaydi.
