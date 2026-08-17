# Töölaud

Töölaud on süsteemi avaleht pärast sisselogimist. Sellelt saab kiiresti alustada levinud tegevusi.

## Töövoo algus

```mermaid
flowchart LR
    A[Töölaud] --> B[Uus kontrollakt]
    A --> C[Viimased tegevused]
    A --> D[Otsing]
    B --> E[Vali vormi tüüp]
    E --> F[Täida vorm]
```

## Võimalikud komponendid

- **Kiirlingid uute vormide juurde** — näiteks "Uus liitvorm", "Uus välisrikkumise akt".
- **Viimased tegevused** — nimekiri viimati salvestatud või vaadatud vormidest.
- **Hoiatused ja märkused** — võimalikud tõrked või infomärkused.

## Töölaud erinevate rollide jaoks

- **Ametnikule** kuvatakse peamiselt vormide lingid.
- **Administraatorile** võidakse kuvada täiendavaid linke kasutajate ja auditilogi halduseks.
