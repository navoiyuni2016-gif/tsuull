# GitHub orqali olish va VM 102 ga o‘rnatish

Repozitoriy: https://github.com/navoiyuni2016-gif/tsuull

GitHub sahifasida **Code → Download ZIP**ni tanlang. Bu manba kod paketi; katta offline Docker obrazlari GitHub’ga qo‘shilmagan. O‘rnatishda VM internet orqali Docker va npm registrlariga chiqa olishi kerak.

## Serverda to‘g‘ridan-to‘g‘ri olish

O‘z kompyuteringizdan:

```sh
ssh devadmin@172.20.0.50
```

Quyidagi buyruqlarni Proxmox hostida emas, **102 (dev-server) Ubuntu VM** ichida bajaring:

```sh
sudo apt-get update
sudo apt-get install -y git ca-certificates
git clone https://github.com/navoiyuni2016-gif/tsuull.git
cd tsuull
sudo bash deploy/install-docker-ubuntu.sh
sudo bash deploy/install.sh
```

`tsuull` katalogi oldindan mavjud bo‘lsa, uni o‘chirib yoki ustiga clone qilib yubormang; avval uning qaysi versiya va konfiguratsiyaga tegishli ekanini tekshiring.

Bu GitHub manba paketida **`--offline` ishlatmang**: obrazlar installer tomonidan quriladi/yuklab olinadi.

## So‘raladigan ma’lumotlar

- HTTPS qayerda ishlaydi: VMning o‘zida ACME / mavjud TLS proxy / universitet sertifikati.
- ACME tanlansa, haqiqiy sertifikat kontakt emaili.
- Birinchi Superadmin emaili, ismi va yashirin paroli. Standart parol yo‘q.

Domen `el.tsuull.uz`, target IP `172.20.0.50` qilib tayyorlangan. Xususiy IP uchun tashqi kirish DNS/NAT yoki universitet proxy marshrutiga bog‘liq. Ularni installer taxminan o‘zgartirmaydi.

O‘rnatilgach, `https://el.tsuull.uz` orqali kiring va Superadmin profilidan universitet ma’lumotlari hamda me’yorlarni kiriting.

Batafsil: [BOSHLASH.md](BOSHLASH.md), [Superadmin qo‘llanmasi](docs/17-SUPERADMIN-QOLLANMA.md), [funksional chegaralar](docs/16-RELEASE-STATUS.md).
