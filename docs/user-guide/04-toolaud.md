# Töölaud

Töölaud on süsteemi avaleht pärast sisselogimist. Ametniku töölaualt saab alustada uue
kontrollkaardi täitmist.

![Ametniku töölaud](images/04-toolaud/01-toolaud.png)

Nupp **+ Lisa** avab loetelu kontrollkaartidest, mida Teil on õigus luua. Alamvormid on
näidatud oma põhivormi all taandega.

![Nupu „+ Lisa" rippmenüü](images/04-toolaud/02-lisa-rippmenyy.png)

## Kodaniku töölaud

Kodaniku vaates kuvatakse **Minu ettevõtted** (esindatavate ettevõtete kontrollid ja
riskitase) ning **Minu protokollid** (vormid, kus olete osaline).

![Kodaniku töölaud](images/04-toolaud/03-kodaniku-toolaud.png)

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
