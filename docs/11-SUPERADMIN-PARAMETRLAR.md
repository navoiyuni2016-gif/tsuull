# 11. SuperAdmin uchun to‘liq parametrlar katalogi

**Asosiy dizayn:** SuperAdmin parametrlari **qiymat + birlik + qo‘llanish doirasi + kuchga kirish davri + manba + versiya + akademik tasdiq** ko‘rinishida saqlansin. 'Qiymatni o‘zgartirdim — barcha tarixiy hisobotlar bir zumda o‘zgardi' holatiga yo‘l qo‘yilmaydi.

Har parametr uchun majburiy metadata:
`code`, `display_name`, `data_type`, `unit`, `value`, `min`, `max`, `scope`, `effective_from`, `effective_to`, `source_document_id`, `source_clause`, `rule_version`, `status`, `created_by`, `approved_by`, `reason`, `rounding_policy`, `dependencies`.

## A. Akademik struktura
| Parametr kodi | Nimani boshqaradi? | Kim tasdiqlaydi? |
|---|---|---|
| `ACADEMIC_YEAR_START/END` | yilning boshi/oxiri | akademik vakolatli |
| `TERM_COUNT` | semestrlar soni | akademik vakolatli |
| `TERM_TEACHING_WEEKS` | o‘qitish haftalari | akademik vakolatli |
| `TERM_EXAM_WEEKS` | nazorat haftalari | akademik vakolatli |
| `DEGREE_LEVEL` | bakalavr/magistr turi | akademik vakolatli |
| `STUDY_MODE` | kunduzgi, sirtqi va boshqa turlar | akademik vakolatli |
| `PROGRAM_DURATION` | o‘qish davomiyligi | akademik vakolatli |
| `PROGRAM_CREDIT_REQUIREMENT` | dastur bo‘yicha umumiy kredit | akademik vakolatli |
| `TERM_CREDIT_TARGET` | semestr kredit maqsadi | akademik vakolatli |
| `ELECTIVE_CREDIT_REQUIREMENT` | tanlov bloki kreditlari | akademik vakolatli |
| `PRACTICE_CREDIT_REQUIREMENT` | amaliyot kreditlari | akademik vakolatli |

## B. Fan soatlari
| Parametr kodi | Nimani boshqaradi? | Izoh |
|---|---|---|
| `HOURS_PER_CREDIT` | 1 kredit akademik soati | normativ+OTM tasdig‘i |
| `CONTACT_RATIO` | auditoriya ulushi | daraja/shaklga bog‘liq |
| `SELF_STUDY_RATIO` | mustaqil ish ulushi | 1 - auditoriya bilan mos |
| `LECTURE_CONTACT_SHARE` | ma’ruza ulushi | fan/shablon |
| `PRACTICE_CONTACT_SHARE` | amaliy ulushi | fan/shablon |
| `SEMINAR_CONTACT_SHARE` | seminar ulushi | fan/shablon |
| `LAB_CONTACT_SHARE` | laboratoriya ulushi | fan/shablon |
| `INDIVIDUAL_CONTACT_SHARE` | individual mashg‘ulot ulushi | fan/shablon |
| `HOURS_ROUND_INCREMENT` | yaxlitlash qadam/juftlik | explicit rounding |
| `ROUND_REMAINDER_POLICY` | qoldiqni qay bir turga berish | explicit, audit |
| `LESSON_DURATION` | akademik soat davomiyligi | reglament bilan |
| `WEEKLY_HOUR_LIMIT` | fan/hafta rejalash cheklovi | universitet bo‘yicha |

## C. Guruh, potok va resurs
| Parametr kodi | Nimani boshqaradi? | Izoh |
|---|---|---|
| `PRACTICE_GROUP_MAX` | amaliy guruh sig‘imi | norma/istisno |
| `LECTURE_STREAM_MAX` | ma’ruza potogi sig‘imi | norma/istisno |
| `LAB_SUBGROUP_MAX` | laboratoriya kichik guruh sig‘imi | fan bo‘yicha |
| `LANGUAGE_SUBGROUP_MAX` | til kichik guruhi chegarasi | fan bo‘yicha |
| `ALLOWED_CROSS_FACULTY_STREAMS` | fakultetlararo potok | vakolatli tashkiliy |
| `MIN_GROUP_SPLIT_THRESHOLD` | guruh ajratish qoidasi | explicit |
| `ROOM_CAPACITY_BUFFER` | xona sig‘imi xavfsiz zaxira | operational |
| `TIMETABLE_SLOT_LENGTH` | juftlik davomiyligi | operational |
| `TEACHER_ROOM_TIME_CONFLICT_POLICY` | jadval to‘qnashuvi qoidasi | scheduling |

## D. Professor-o‘qituvchi ish turlari va yuklamalar
| Parametr kodi | Nimani boshqaradi? |
|---|---|
| `WORK_TYPE_TIME_NORM[*]` | har ish turi uchun birlik/vazn / me’yor |
| `STAFF_POSITION_LOAD_CAP[*]` | lavozim/toifa kesimida tasdiqlangan capacity |
| `TEACHER_EMPLOYMENT_FTE` | ishga biriktirilgan FTE (faqat tasdiqlangan manbadan) |
| `WORK_TYPE_ALLOWED_DEGREE[*]` | ish turi qaysi darajada qo‘llanadi |
| `LECTURE_ELIGIBILITY_POLICY` | ma’ruza o‘tish vakolati |
| `CROSS_DEPT_ASSIGNMENT_POLICY` | kafedralararo yuklama |
| `MAX_OVERALLOCATION_POLICY` | limit oshsa blok/warning |
| `EXAM_NORM[*]` | imtihon/yakuniy nazorat turi uchun me’yor |
| `COURSEWORK_SUPERVISION_NORM[*]` | kurs ishi rahbarligi me’yori |
| `PRACTICE_SUPERVISION_NORM[*]` | amaliyot rahbarligi me’yori |
| `FINAL_ATTESTATION_NORM[*]` | attestatsiya ishi me’yori |
| `INSTRUCTOR_ASSIGNMENT_WEIGHT[*]` | optimizer soft-preference (taklif) |

**Muhim:** bu katalog normativ turini sanaydi; real sonlar huquqiy hujjat/OTM kengashi qaroridan olinadi. Ko‘p ish turlarining me’yori `per_student/per_group/per_event/per_hour` kabi turlicha; barchasini bir xil soatga ko‘paytirish xato.

## E. Yillik ish reja, ijro va hisobot
| Parametr kodi | Nimani boshqaradi? |
|---|---|
| `ANNUAL_PLAN_TEMPLATE_VERSION` | yillik ish rejasi shakli |
| `TASK_ESCALATION_DAYS` | kechiksa kimga signal yuboriladi |
| `EVIDENCE_REQUIRED_BY_WORK_TYPE[*]` | qaysi ishda dalil zarur |
| `REPORT_DEADLINES[*]` | kafedra/fakultet hisobot muddatlari |
| `REPORT_SCHEMA_VERSION[*]` | hisobot ustunlari va hisoblash formulasini versiyalash |
| `ACTUAL_VERIFICATION_POLICY` | bajarilgan soat tasdiqlash tartibi |
| `ACADEMIC_YEAR_LOCK_POLICY` | yil yopilganda qanday cheklovlar |
| `EXCEL_TEMPLATE_VERSION[*]` | export/import shablonlari |

## F. Texnik konfiguratsiya (normativlardan alohida)
UI til, sessiya muddati, MFA majburiyligi, import fayl max hajmi, eksport ruxsatlari, notification kanali, SSO sozlamasi, backup intervali, audit retention, integratsiya secrets. **Texnik konfiguratsiyani akademik me’yorlar bilan bitta jadvalda ixtiyoriy aralashtirmaslik.**

## Parametr kiritish oynasining amaliy oqimi
1. SuperAdmin `Qoida paketi yaratish` tugmasini tanlaydi va daraja/shakl/dastur/yil doirasini belgilaydi.
2. Parametr nomi, qiymati, birligi, amaldagi me’yor bandi va kuchga kirish sanasini kiritadi.
3. Tizim turlarni/foiz yig‘indisini/qoida ustuvorligi va eski versiyalar bilan to‘qnashuvni tekshiradi.
4. `Impact simulation` fan → potok → kafedra → o‘qituvchi → hisobot darajasida old/yangi delta chiqaradi.
5. Vakolatli akademik tasdiqlovchi tasdiqlaydi yoki sabab bilan qaytaradi.
6. Yangi qoida faqat belgilangan akademik davr va tegishli draft hisoblarga ta’sir qiladi.
7. Audit va `rule_set_version` barcha hisoblangan natijada qoladi.
