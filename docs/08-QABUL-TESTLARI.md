# 08. Qabul sinovlari va yuqori xavfli test holatlari

Quyidagi IDlar Codex issue/PRlarida test nomi sifatida ishlatilsin.

## A. Hisoblash va balans
- **CALC-001:** 6 kredit × 30 soat → fan jami 180; auditoriya 40% → 72; mustaqil 108.
- **CALC-002:** 72 auditoriya = 36 ma’ruza + 36 amaliy; 1 potok+3 guruh → 36+(36×3)=144 bazaviy o‘qitish soati, mustaqil 108 bu 144 ga qo‘shilmaydi.
- **CALC-003:** kontakt + mustaqil = jami har bir fan/term/revision uchun.
- **CALC-004:** barcha activity breakdown summasi auditoriya jami bilan mos.
- **CALC-005:** 25 soat/kredit, turli daraja/shakl/foiz va rounding policy qayta ishlaydi.
- **CALC-006:** Decimal 0.1+0.2 aniq; float differensiyasi ma’lumot bazasiga o‘tmaydi.
- **CALC-007:** mustaqil ta’lim o‘qituvchi o‘quv dars yuklamasiga bevosita qo‘shilmaydi.
- **CALC-008:** 0 guruh / 0 capacity / 0 denominator uchun `N/A` va izoh, `NaN` emas.
- **CALC-009:** potok bir necha guruhdan iborat bo‘lsa ma’ruza necha potokligi bo‘yicha hisoblanadi; guruh soniga ikki marta ko‘paymaydi.
- **CALC-010:** lab kichik guruhga bo‘linganda qoida va ro‘yxat ID bilan qayta hisoblaydi.
- **CALC-011:** professor-o‘qituvchi shaxsiy yuklama yig‘indisi kafedra tomonidan tasdiqlangan allocation bilan mos; bo‘sh yuklama alohida.
- **CALC-012:** tasdiqlangan ish turining vaqt me’yori source rule bilan aniq bog‘langan.

## B. Versiya va normativ
- **RULE-001:** SuperAdmin draft yaratadi, lekin alohida vakolatli akademik tasdiqsiz effective qilolmaydi.
- **RULE-002:** overlapping scope/effective rule bloklanadi.
- **RULE-003:** effective rule o‘zgarsa oldingi `APPROVED` curriculum snapshot byte-for-byte o‘zgarmaydi.
- **RULE-004:** what-if old/yangi natija diff va object impact list ko‘rsatadi; production bazasini mutatsiya qilmaydi.
- **RULE-005:** rule ID, version, legal basis, effective_at, actor, input hash, calculation trace har natijada mavjud.
- **RULE-006:** tarixiy o‘quv yilidagi reja o‘sha paytdagi qoidalar bilan qayta chiqariladi.
- **RULE-007:** bir xil normativni bir vaqtning o‘zida ikki admin o‘zgartirganda optimistic lock ishlaydi.

## C. Curriculum va prerequisites
- **CUR-001:** majburiy/tanlov kreditlari va semestr/yil balansi tekshiriladi.
- **CUR-002:** fanlar prerequisite cikli bloklanadi, tegishli fan noto‘g‘ri oldingi semestrga tushmaydi.
- **CUR-003:** tasdiqlanmagan fan katalogidan final reja tasdiqlanmaydi.
- **CUR-004:** revision compare har fan/credit/contact/term farqini aniq ko‘rsatadi.
- **CUR-005:** approved revision update/delete emas; yangi revision yaratiladi.
- **CUR-006:** rasmiy andozaga Excel/PDF export, total va semestr satrlari mos.

## D. Yuklama taqsimlash
- **LOAD-001:** o‘qituvchi tegishli fan kompetensiyasisiz assign qilinsa warning/block.
- **LOAD-002:** ikki o‘qituvchiga bir line ortiqcha ajratilsa blok.
- **LOAD-003:** limitdan oshsa sabab va review bilan ko‘rsatiladi; jim tasdiqlanmaydi.
- **LOAD-004:** guruh/potok duplicatelari aniqlanadi.
- **LOAD-005:** manual lock optimizer tomonidan o‘zgartirilmaydi.
- **LOAD-006:** tasdiqlangan shaxsiy load immutable; farq faqat yangi revision.
- **LOAD-007:** fakt soati dalilsiz `VERIFIED` bo‘la olmaydi.

## E. Excel
- **XLS-001:** real anonymized golden Excel’da barcha asosiy total va satrlar parity.
- **XLS-002:** xato `sheet!cell` va sabab bilan ko‘rsatiladi.
- **XLS-003:** bir fayl ikki marta import qilinsa dublikat bo‘lmaydi (idempotent).
- **XLS-004:** macro/external links hech qachon execute qilinmaydi.
- **XLS-005:** wrong locale decimal detected; silent rounding yo‘q.
- **XLS-006:** dry-run hech qanday production biznes jadvallarini o‘zgartirmaydi.
- **XLS-007:** source SHA256, mapping version, import user, timestamps va row lineage saqlanadi.
- **XLS-008:** report eksportida csv formula injection oldini olish.

## F. Hisobot, ijro va boshqaruv
- **REP-001:** approved report snapshot keyinchalik underlying draft o‘zgarsa ham o‘zgarmaydi.
- **REP-002:** hisobotdagi ko‘rsatkich `as_of`, formula va source list bilan ko‘rsatiladi.
- **REP-003:** hudud fakultet filtri ichidagi satrlarning aggregationi universitet totaliga qayta tekshiriladi.
- **REP-004:** qaytarilgan kafedra reporti sababi bilan draftga qaytadi.
- **PLAN-001:** yillik vazifa muddatlari va deadline timezone to‘g‘ri.
- **PLAN-002:** faqat dalili va tekshiruvchisi bor vazifa `VERIFIED`.
- **PLAN-003:** preapproval work `verified_actual` sifatida hisoblanmaydi.

## G. Security va production
- **SEC-001:** kafedra A foydalanuvchisi B kafedra report, Excel export yoki API URL'iga kira olmaydi.
- **SEC-002:** superadmin auditni o‘chira/soxtalashtira olmaydi.
- **SEC-003:** API broken object-level authorization testlari o‘tadi.
- **SEC-004:** role escalation; mass assignment; excessive data exposure bloklanadi.
- **SEC-005:** TOTP/SSO MFA yuqori vakolatda ishlaydi.
- **SEC-006:** backup restore drill bilan tasdiqlangan sonlar va audit tiklanadi.
- **SEC-007:** OCR va remote AI’ga maxfiy Excel yuborilmaydi.
- **SEC-008:** logout/session expiry/CSRF/XSS/SQL injection/upload limitlari sinovdan o‘tadi.
- **A11Y-001:** WCAG 2.2 AA klaviatura/screenreader/kontrast testing.
- **OPS-001:** worker crash qayta ishga tushsa idempotent job va no duplicate.
- **OPS-002:** deployment rollback qilinganida DB forward/backward compatibility tekshiriladi.

## Qabul protokoli
Har bir testga `Given/When/Then`, real anonim input, expected output, test runner reference, tekshirgan shaxs va sana qo‘shiladi. *No green tests = no deploy*. **Haqiqiy huquqiy me’yorni tasdiqlovchi hujjat yo‘q** bo‘lsa, ushbu qism `BLOCKED` bo‘ladi; natijalarni rasmiy sifatida chiqarmaydi.

## H. Ikkinchi bosqich
- **TIME-001:** ikki mashg‘ulot bir o‘qituvchi/auditoriya/guruhga bir slotda belgilansa konflikt chiqadi.
- **TIME-002:** xona sig‘imi guruh talabalar sonidan kichik bo‘lsa warning/block policy.
- **METH-001:** sillabus versiyasi tasdiqlangan o‘quv reja fan/soatlari bilan bog‘langan.
- **METH-002:** eski metodik hujjat o‘zgartirilmaydi, yangi versiya yaratiladi.
- **PRAC-001:** amaliyot kredit va soatlari qoidaga mos, ish turiga asossiz ko‘paytirilmaydi.
- **QUAL-001:** kuzatuv xulosasi va tuzatish vazifasi dalil bilan tekshiriladi.
- **FORE-001:** kelgusi yil yuklama prognozi rasmiy shtat/ish haqi qaroriga aylantirilmaydi.
