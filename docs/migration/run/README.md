# LJVIS1 varukoopia → uus LJVIS2 proovibaas

Üks käsk taastab `.bak` ajutisse SQL Serverisse, loob LJVIS2 andmebaasiskeemi
ning teeb viimase kolme aasta andmete migratsiooni proovi.

**See ei ole päris üleminek.** See on proov, mille tulemuse põhjal me näeme,
mis andmetega veel tegeleda tuleb. Manused ja RavenDB ei kuulu siia käivitusse.

## Mida on vaja

- Töötav Docker (Windows/macOS: Docker Desktop). Docker peab saama alla laadida
  SQL Server 2022 ja Liquibase 4.29 konteineripildid.
- Python 3.11 või uuem.
- LJVIS1 varukoopia (`.bak`) kettal, mida Docker saab lugeda.
- **Uus tühi PostgreSQL andmebaas**, mille lõite ainult selle proovi jaoks.
  Kasutajal peab olema õigus luua skeeme ja tabeleid. Olemasolevate andmetega
  andmebaasi skript ei puutu — ta keeldub tööd alustamast.
- Kogu kokkulepitud versiooni repositoorium. Ainult selle kausta kopeerimisest ei
  piisa: skript kasutab ka `DSL/migration` ja `DSL/Liquibase` faile. Kaustade
  omavahelist asukohta ei tohi muuta.

## Kolm sammu

**1.** Avage terminal kaustas `docs/migration/run` ja käivitage:

```sh
python3 -m pip install -r requirements.txt
cp .env.example .env
```

Windowsis kirjutage `python` ja `copy .env.example .env`.

**2.** Avage fail `.env` tekstiredaktoris ja täitke **kuus rida**: tee
varukoopiani ja PostgreSQL ühendus. Rohkem ei ole vaja midagi muuta.

**3.** Käivitage:

```sh
./migreeri.sh
```

Windowsis tehke topeltklõps failil `migreeri.bat`.

Käivitus võib võtta tunni või rohkem — suurema osa sellest võtab varukoopia
taastamine. Skript näitab vahepeal, mis etapis ta on.

## Kui töö on valmis

Selles kaustas tekib fail **`ljvis-migratsioon-*.log`**. **Saatke see fail
meile.** Seal on etapid ja kokkuvõtlikud arvud, mitte teie andmete sisu.
Vaadake fail enne saatmist üle.

Logi lõpus on rida `Seis:`.

- **`ülekanne tehtud`** — proov jõudis lõpuni.
- **`ülekanne EI JÕUDNUD lõpuni`** — proov peatus andmeprobleemi või tehnilise vea
  tõttu; vaadake logis viimast sammu ja saatke logi meile.

SQL-only proovi **väljumiskood 2 on ootuspärane ka lõpuni jõudnud proovil**:
see tähendab läbivaatamist vajavat tulemust, mitte automaatselt tehnilist viga.
RavenDB kohta võib olla `source_not_provided`; see ei takista SQL Serveri proovi.
SQL-i enda `mapping_incomplete`, `unmapped_eav` ja teised leiud tuleb siiski läbi
vaadata. `ülekanne tehtud` ei kinnita kõigi äriväljade täielikku vastendust.

Koondlogis võrreldakse lähte-, loetud ja staging-ridade arve ning valitud vorme
tegelike sihtkirjetega. Puuduv vorm või lahknev arv vajab uurimist. Privaatkaustas
on `reconciliation.csv` iga vormi kohta ja `owner-decisions.csv` otsuste enne/pärast
väärtustega; ärge saatke neid koos avaliku koondlogiga.
Peatumise põhjuste uurimiseks avage privaatkaustas `findings-detailed.csv`:
vormi number, väli, algväärtus ja põhjus on samal real; `context` sisaldab
konfliktis vorme, kontrolle või välja pikkuse limiiti. Fail võib sisaldada isikuandmeid.

Ajutine SQL Server eemaldatakse automaatselt. PostgreSQL proovibaas jääb alles.

## Kui midagi läheb valesti

Skript ütleb enamasti otse, mis on puudu — näiteks et Docker ei tööta või et
andmebaas ei ole tühi. Tehke seal öeldu ja käivitage uuesti.

Uueks täisprooviks looge **uus tühi andmebaas**. Skript olemasolevat andmebaasi
ei tühjenda ega kirjuta üle.

Kui te ei saa viga ise lahendada, saatke meile `ljvis-migratsioon-*.log`.
Ärge käivitage töötava rakenduse andmebaasis parandus- ega puhastuskäske.

## Mida mitte saata

Kaustad `private/` ja `runs/` sisaldavad detailset tehnilist väljundit ning
võivad sisaldada isikuandmeid. **Ärge saatke neid ega faili `.env`.**
Saatke ainult `ljvis-migratsioon-*.log`.
