# 12. Arxitektura va biznes oqim sxemalari

## 12.1. Umumiy hisoblash zanjiri (Mermaid)
```mermaid
flowchart TD
    SA[SuperAdmin: normativ loyihasi] --> RV[Akademik tasdiq va versiya]
    RV --> RE[Rule Engine va parametrlar]
    EX[Excel import / katalog] --> CV[O‘quv reja generatori]
    RE --> CV
    CV --> VA[Reja validatsiyasi va tasdiq]
    VA --> CH[Fan kreditlari va soatlari]
    RE --> CH
    CH --> SG[Guruh, potok, kichik guruh]
    SG --> DL[Kafedra yuklamasi]
    RE --> DL
    DL --> TA[O‘qituvchiga taqsimlash]
    TA --> AP[Yuklama tasdig‘i va freeze]
    AP --> AC[Fakt ijro va dalil]
    AC --> RP[Hisobotlar va Dashboard]
    AP --> RP
    DL --> RP
    VA --> RP
    RV --> AU[Audit / tarixiy qoida]
    VA --> AU
    AP --> AU
    RP --> AU
```

## 12.2. Normativ o‘zgarganda (Mermaid)
```mermaid
flowchart TD
    A[SuperAdmin draft qoida] --> B[Schema va normativ validatsiyasi]
    B --> C[What-if simulation va impact diff]
    C --> D{Vakolatli tasdiqladimi?}
    D -->|Yo‘q| A
    D -->|Ha| E[Yangi effective qoida versiyasi]
    E --> F{Obyekt holati}
    F -->|Draft| G[Avtomatik qayta hisoblash]
    F -->|Tasdiqlangan| H[Snapshot o‘zgarmaydi]
    H --> I[Kerak bo‘lsa yangi revision]
    G --> J[Compare, test, audit]
    I --> J
```

## 12.3. Excel migratsiya (Mermaid)
```mermaid
flowchart LR
    A[Original Excel] --> B[Arxiv, hash, scanning]
    B --> C[Format mapping]
    C --> D[Dry-run va validation]
    D --> E{Xatolar bormi?}
    E -->|Ha| F[Satr/katak xatolarini tuzatish]
    F --> D
    E -->|Yo‘q| G[Golden totals reconciliation]
    G --> H{Mosmi?}
    H -->|Yo‘q| F
    H -->|Ha| I[Idempotent commit]
    I --> J[Version+audit+source lineage]
```

## 12.4. Diagramma ma'nosi
Arizalar yoki Registrator ofisi ishtirok etmaydi. Bu yechim O‘quv bo‘limining ma’lumotlarni qabul qilish, rasmiy reja yaratish, o‘quv yuklamasini hisoblash, ijro va hisobot jarayonlarini bog‘laydi. Tasdiqlangan raqamlar o‘zgarmas snapshot; barcha me’yorlar versiya bilan.
