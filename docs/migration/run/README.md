# LJVIS 1 varukoopia → uus LJVIS 2 proovibaas

Üks käsk taastab `.bak` ajutisse SQL Serverisse, loob LJVIS 2 andmebaasiskeemi
ning teeb viimase kolme aasta andmete migratsiooni proovi.

**See on migratsiooniproov.** Proovi tulemus näitab, millised andmeprobleemid tuleb
veel lahendada. Manused ja RavenDB andmed ei kuulu selle proovi ulatusse.

## Mida on vaja

- Töötav Docker (Windows/macOS: Docker Desktop). Docker peab saama alla laadida
  SQL Server 2022 ja Liquibase 4.29 konteineripildid.
- Python 3.11 või uuem.
- LJVIS 1 varukoopia (`.bak`) kettal, mida Docker saab lugeda.
- **Uus tühi PostgreSQL andmebaas**, mille lõite ainult selle proovi jaoks.
  Kasutajal peab olema õigus luua skeeme ja tabeleid. Olemasolevate andmetega
  andmebaasi korral keeldub skript tööd alustamast.
- Kogu repositoorium kokkulepitud versioonis. Ainult selle kausta kopeerimisest ei
  piisa: skript kasutab ka `DSL/migration` ja `DSL/Liquibase` faile. Kaustade
  omavahelist asukohta ei tohi muuta.

## Kolm sammu

**1.** Avage terminal kaustas `docs/migration/run` ja käivitage:

```sh
python3 -m pip install -r requirements.txt
cp .env.example .env
```

Windowsis kirjutage `python` ja `copy .env.example .env`.

**2.** Avage fail `.env` tekstiredaktoris ja täitke **kuus rida**: varukoopia asukoht
ning PostgreSQL-i host, port, andmebaasi nimi, kasutajanimi ja parool.
Vaikimisi on ajapiir kolm aastat enne käivitamise kuupäeva. Kui proovi jaoks on
kokku lepitud muu ajapiir, määrake see väljal `CUTOFF`.

**3.** Käivitage:

```sh
./migreeri.sh
```

Windowsis tehke topeltklõps failil `migreeri.bat`.

Käivitus võib võtta tunni või rohkem — suurema osa sellest võtab varukoopia
taastamine. Skript näitab käimasolevat etappi.

## Kui töö on valmis

Selles kaustas tekib fail **`ljvis-migratsioon-*.log`**. **Saatke see fail
arendajatele kokkulepitud kanali kaudu.** Logi sisaldab etappe ja kokkuvõtlikke arve.
Vaadake fail enne saatmist üle.

Logi lõpus on rida `Seis:`.

- **`ulekanne tehtud`** — proov jõudis lõpuni.
- **`ulekanne EI JOUDNUD lopuni`** — proov peatus andmeprobleemi või tehnilise vea
  tõttu; vaadake logis viimast sammu ja saatke logi arendajatele.

Ainult SQL Serveri andmetega proovi **väljumiskood 2 on ootuspärane ka lõpuni jõudnud proovil**:
see tähendab läbivaatamist vajavat tulemust, mitte automaatselt tehnilist viga.
RavenDB kohta võib olla `source_not_provided`; see ei takista SQL Serveri proovi.
SQL-i enda `mapping_incomplete`, `unmapped_eav` ja teised leiud tuleb siiski läbi
vaadata. `ulekanne tehtud` ei kinnita kõigi äriväljade täielikku vastendust.

Koondlogis võrreldakse lähte-, loetud ja skeemi `staging` ridade arve ning valitud vorme
tegelike sihtkirjetega. Puuduv vorm või lahknev arv vajab uurimist. Privaatkaustas
on `reconciliation.csv` iga vormi kohta ja `owner-decisions.csv` otsuste algväärtuste ja uute
väärtustega; ärge saatke neid koos avaliku koondlogiga.
Peatumise põhjuste uurimiseks avage privaatkaustas `findings-detailed.csv`:
vormi number, väli, algväärtus ja põhjus on samal real; `context` sisaldab
konfliktis vorme, kontrolle või välja suurimat lubatud pikkust. Fail võib sisaldada isikuandmeid.

Ajutine SQL Server eemaldatakse automaatselt. PostgreSQL-i proovibaas jääb alles.

## Kui midagi läheb valesti

Skript kuvab tõrke põhjuse, näiteks peatatud Dockeri või andmeid sisaldava
andmebaasi. Kõrvaldage logis kirjeldatud tõrge. Enne uut käivitust kontrollige,
et sihtbaas on tühi. Kui sihtbaasis on prooviandmed, looge uus tühi proovibaas.

Uueks täisprooviks looge **uus tühi andmebaas**. Skript olemasolevat andmebaasi
ei tühjenda ega kirjuta üle.

Kui te ei saa viga ise lahendada, saatke arendajatele `ljvis-migratsioon-*.log`.
Ärge käivitage töötava rakenduse andmebaasis parandus- ega puhastuskäske.

## Mida mitte saata

Kaustad `private/` ja `runs/` sisaldavad detailset tehnilist väljundit ning
võivad sisaldada isikuandmeid. **Ärge saatke neid ega faili `.env`.**
Saatke ainult `ljvis-migratsioon-*.log`.
