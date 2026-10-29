# O‘quv reja ustaxonasi va universitetdagi mahalliy AI

## Foydalanuvchi oqimi — Excel talab qilinmaydi

1. Fakultet, kafedra va yilni, so‘ng fanlar katalogini tizimning o‘zida kiriting. Fanlar kreditini rasmiy manbadan oling va akademik tasdiqlating.
2. Superadmin rasmiy hisoblash parametrlarini kiritadi; boshqa akademik hisob tasdiqlaydi. Hech qanday normativ qiymat oldindan qo‘yilmaydi.
3. `O‘quv reja ustaxonasi` → `Yangi o‘quv reja`: dastur, yil, kafedra, daraja, shakl, manba hujjat identifikatori, tasdiqlangan me’yor va hisob sanasini tanlang. Fayl yuklash shart emas; manba identifikatoriga tasdiqlangan qaror/reja kodi yoziladi.
4. Rejani tanlang; tasdiqlangan fan va semestrlarni jadvalga qo‘shing. Semestrni o‘zgartirish, fan qo‘shish/olib tashlash mumkin. Kredit katalogdan, soat tasdiqlangan me’yordan olinadi.
5. Tizim jami kredit, talaba jami/auditoriya/mustaqil soatlarini, har bir fan mashg‘ulotlari va semestr kredit yig‘indisini hisoblaydi. Bu raqamlar guruhlar bo‘yicha ko‘paytirilgan kafedra talabi yoki o‘qituvchi yuklamasi emas.
6. `Qoida asosida semestrlarga joylash` deterministik tavsiya beradi. Mahalliy model ulangan bo‘lsa, `AI tavsiya tayyorlasin` ham ishlaydi. Ikkala usul uchun dastur jami kreditiga mos to‘liq fanlar tanlovi va yetarli semestrlar kerak.
7. AI javobi alohida ko‘rsatiladi. `Tekshirdim — jadvalga o‘tkazish` faqat brauzer jadvalini o‘zgartiradi. `Loyihani saqlash` serverga atomar yozadi. Qisman to‘ldirilgan reja ham loyiha sifatida saqlanadi; yakuniy kredit/prerequisite talablari tasdiqlashda majburiy.
8. `Hujjat va tasdiqlash` → `Ko‘rib chiqishga yuborish`. Boshqa akademik hisob tekshiradi va tasdiqlaydi. Yuborilgan va tasdiqlangan rejaning fanlari tahrirlanmaydi.
9. Guruh/teacher yuklamasi uchun `Guruh bo‘yicha yuklama hisobi`dan mavjud `Me’yor bo‘yicha hisob` jarayoniga o‘ting. Qo‘shimcha ishlar, fakt va hisobotlar mavjud modullarda yuritiladi. AI bu yozuvlarni avtomatik tasdiqlamaydi.

Saqlash vaqtida maydonlar bloklanadi. Boshqa xodim yoki eski oynadan o‘zgarish bo‘lsa, 409 qaytadi: sahifani yangilab, o‘zgarishlarni solishtiring. Olib tashlangan qator DBdan o‘chirilmaydi: `_excluded=true`, yangi tarixiy versiya va audit bilan saqlanadi. Yangi versiyaga faqat faol qatorlar ko‘chiriladi.

## Arxitektura va haqiqiy ulanish holati

Tanlangan variant: **ERP — VM 102, 172.20.0.50, 2 vCPU / 3 GB; AI — alohida universitet serveri**. Hozirgi ERP VM ichida model ishga tushirish talab qilinmaydi. AI serverining aniq IP, resurslari va modeli berilmaguncha haqiqiy AI ulanishi sozlanmagan hisoblanadi.

Brauzer → ERP API → ichki Ollama `/api/chat`. Tashqi AI xizmatiga API kalit kerak emas. Yuboriladigan kontekst: foydalanuvchi tanlagan tasdiqlangan fan ID/kod/nom/kredit/prerequisite, semestrlar va kredit limitlari, yozilgan topshiriq. O‘qituvchi/talaba shaxsiy ma’lumotlari, parollar va fayllar avtomatik yuborilmaydi. Xodim topshiriq matniga shaxsiy yoki maxfiy ma’lumot yozmasin.

AI faqat berilgan fanlar semestrlarini tavsiya qiladi. U yangi fan, kredit, rasmiy koeffitsiyent yoki soat ixtiro qila olmaydi. Javob serverda fanlar ro‘yxati, takrorlanish, prerequisite, semestr limiti va dastur jami kreditiga tekshiriladi. Noto‘g‘ri javob 502 bilan rad etiladi; biznes yozuvlari o‘zgarmaydi. Alohida akademik tasdiq saqlanadi.

## Alohida AI serverini tayyorlash

Administrator CPU/RAM/disk/GPUga mos **mahalliy** modelni tanlaydi. Kichik kvantlangan model bilan boshlash mumkin; model sifati va tezligi universitetning sinov rejasida tekshiriladi. 8 GB RAM boshlang‘ich sinov uchun reja sifatida ko‘rilishi mumkin, lekin yetarlilik model va kontekstga bog‘liq. Bu paket GPU passthrough yoki model vaznlarini o‘z ichiga olmaydi.

`deploy/ollama.compose.yaml` faqat AI serveri uchun. Uning yonida `.env.ai` fayl yarating:

```dotenv
OLLAMA_IMAGE=ollama/ollama:REVIEWED_VERSION_OR_DIGEST
AI_BIND_ADDRESS=REAL_AI_SERVER_LAN_IP
OLLAMA_MEMORY_LIMIT=6g
OLLAMA_CPUS=2
```

Bu yerda katta harfli placeholderlarni haqiqiy qiymatlarga almashtiring. Tasvir versiyasini administrator tanlaydi; Ollama JSON-schema `format` va `/api/chat`ni qo‘llashi kerak. Ishlatilgan image digest va model digestini ishga tushirish protokolida qayd eting.

```bash
docker compose --env-file .env.ai -f ollama.compose.yaml up -d
# REAL_LOCAL_MODEL o‘rniga tanlangan mahalliy model nomi:
docker compose --env-file .env.ai -f ollama.compose.yaml exec ollama ollama pull REAL_LOCAL_MODEL
docker compose --env-file .env.ai -f ollama.compose.yaml exec ollama ollama list
```

Obraz va modelni birinchi yuklashda internet kerak; keyingi inference mahalliy modeldan bajariladi. `OLLAMA_NO_CLOUD=true`; cloud modellardan foydalanmang. ERP konfiguratsiyasi cloud nomli modellarni ham rad etadi. API portini internetga NAT qilmang. Ollama API autentifikatsiyasiz bo‘lgani uchun AI hosti/hypervisor firewallida 11434/TCPga faqat ERP VM `172.20.0.50`dan ruxsat bering; boshqa manbalarni bloklang. Docker chop etgan portlar UFWni chetlab o‘tishi mumkin: Docker-aware firewall yoki Proxmox/network firewall bilan tekshiring. HTTPS ishlatilsa, universitet ishonchli CA sertifikatini Node trust store’iga qo‘shing; TLS tekshiruvini o‘chirmang.

## ERP VMda ulash

Yangi kod o‘rnatilgandan keyin ERPning mavjud `.env` fayliga uchta qiymatni qo‘shing yoki mavjud bo‘lsa tahrirlang. Parollar, DB va MFA kalitlarini almashtirmang:

```dotenv
LOCAL_AI_URL=http://REAL_AI_SERVER_LAN_IP:11434
LOCAL_AI_MODEL=REAL_LOCAL_MODEL
LOCAL_AI_NO_PROXY=REAL_AI_SERVER_LAN_IP,db,localhost,127.0.0.1
```

URL faqat ichki IPv4, `localhost` yoki Docker ichki `ollama` nomi; credential, qo‘shimcha path, query va redirect qabul qilinmaydi. Alohida server uchun uning ichki IPv4 manzilini ishlating. Bu qiymatlar server konfiguratsiyasidir, xodim so‘rovi orqali o‘zgarmaydi.

```bash
sudo bash deploy/compose.sh up -d --no-deps --force-recreate app
sudo bash deploy/compose.sh ps
```

`/studio` javobidagi `ai.configured=true` faqat konfiguratsiya borligini bildiradi; haqiqiy model sog‘lomligini emas. Brauzerda tasdiqlangan fanlarni tanlab, bir marta AI tavsiya so‘rab tekshiring. Ko‘rinadigan model nomi, natija, kredit/prerequisite nazorati va auditni tekshiring. 502 bo‘lsa model nomi, yuklanganligi, xotira va ERPdan ichki portga ulanishni tekshiring. 503 — ulanish sozlanmagan; 429 — model band yoki foydalanuvchi limiti; 409 — reja yoki yil holati o‘zgargan.

Bir vaqtning o‘zida bitta AI ish bajaradi; foydalanuvchiga 10 daqiqada 4 so‘rov. So‘rov 90 soniyada tugatiladi, javob 128 KiB bilan cheklangan. Model sifati, tezligi va ishonchliligi haqiqiy mahalliy modelda alohida baholanadi. Javob rad etilsa, qo‘lda rejalashtirish va deterministik tavsiya ishlaydi.

## Yangilash va qaytarish

Yangi koddan oldin `sudo bash deploy/backup.sh` bilan bazani saqlang; eski ilova obrazini alohida tag/arxiv bilan saqlang. Mavjud `.env`, `.deploy-mode`, sertifikat va ma’lumotlar volume’larini saqlang. Yangi manba ustidan build va `deploy/install.sh` orqali mavjud HTTPS rejimida yangilang; `down -v` ishlatmang. SQL schema o‘zgarmaydi, yangi holat mavjud JSONB yozuvlarida saqlanadi.

AIni o‘chirish: `.env`dagi `LOCAL_AI_URL` va `LOCAL_AI_MODEL`ni bo‘shating va appni qayta yarating. Reja ustaxonasi ishlashda davom etadi.

**Eski kodga qaytish cheklovi:** eski versiya `_excluded`ni tushunmaydi. Qator olib tashlash ishlatilganidan keyin eski kodni yolg‘iz qaytarmang: bu eski qatorlarni qayta faol ko‘rsatishi mumkin. Mos kod bilan davom eting yoki administrator kelishilgan tiklash rejasi asosida yangilashdan oldingi backupni alohida bazada tekshirib tiklasin. Backupdan keyingi yangi ma’lumotlar yo‘qolishini oldindan hisobga oling.

## Tekshirish

```bash
node tests/plan-studio.test.mjs
node --env-file=/secure/path/test.env tests/studio.integration.mjs
python3 tests/ui_studio.py /secure/path/studio-ui.env
```

Integration va UI sinovlaridagi AI xizmati sintetik Ollama API javob serveridir. Bu haqiqiy model yuklangani, sifati yoki universitet tarmog‘ida ulanish ishlashini isbotlamaydi. Haqiqiy IP/model berilmaguncha model bilan yakuniy sinov — **BLOCKED**.
