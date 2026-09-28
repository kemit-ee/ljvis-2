# LJVIS 1 → LJVIS 2: administraatori järgmised sammud

**Seis: 25.09.2026.** SQL Serveri backup on saadud ja taastatud eraldi proovikeskkonnas.
Varasemaid Q0–Q19 SQL-päringuid **ei ole vaja administraatoril käsitsi käivitada**:
arendus käivitas need taastatud baasil. Tulemused ja andmeid sisaldavad logid jäävad
piiratud ligipääsuga proovikeskkonda.

## Migreeritavate vormide valik

Ajapiir on **viimased kolm aastat** kokkulepitud ülemineku kuupäevast; täpne
kuupäev fikseeritakse `.env` failis (`CUTOFF`) ja seda ei muudeta jooksu ajal.
SQL Serverist valitakse `ControlForm.CreatedDate` järgi vormid staatusega
`Confirmed` ja `Published`. Sama kontrolli ülejäänud osad loetakse kontekstina,
kuid need ei satu selle tõttu migreeritavate hulka.

Iga vormi kaasamise või väljajätmise põhjus on jooksu `disposition.csv` failis.
Mahud sõltuvad andmebaasist: testkoopia arvud ei ennusta LIVE-i.

Jooks kontrollib ka korduskäivitust (sihtkirjed ei muutu ega dubleeru), eraldi
puhast sihtbaasi ning lähte- ja sihtväljade vastavust. **Loodud sihtvormide arv ei
tähenda, et kõik äriväljad, rikkumised või manused on kasutamiseks vastu võetud.**
Ootuspärane tulemus on `needs_review` / exit **2**, mitte exit 0.

Rikkumiste ja puuduste vastenduste hetkeseis on eraldi arendusdokumendis
[violation-mapping-status.md](violation-mapping-status.md). Administraatoril ei ole
seda migratsiooni käivitamiseks vaja: puudulik vastendus kajastub jooksu aruandes.

## Mida haldurilt ja andmeomanikult veel vaja on

| Vajalik sisend või otsus | Miks |
|---|---|
| Maskeerimata lähtekoopia lõplikuks üleminekuks | Andmetes on `*********` maskid. Hea maine sünnikuupäeva ei saa neist taastada; kuupäevade asendamine ei ole heaks kiidetud |
| RavenDB backup/eksport või halduri selgesõnaline kinnitus, et tööinspektsiooni akte ei ole | SQL `.bak` ei sisalda eraldi RavenDB andmeid. Ligipääsu või faili puudumine ei tõenda aktide puudumist |
| `Paths.FormDocuments` failikataloog koos säilitatud kaustastruktuuriga või kokkulepitud loetav arhiiv | Vormidel on viide failikaustale, kuid failide nimekirja andmebaasis ei ole; ilma kataloogita ei saa kontrollida failide olemasolu ega neid üle kanda |
| Kehtiva `Control`-seoseta SP-vormide käsitlus | Sellised vormid säilivad eraldi koondkontrollina; lõplik seos vajab kinnitust või lähteandmete parandust. Leiud on `finding.csv` failis |
| Eri staatustega osadest koosnevate kontrollide käsitlus | Osa sama kontrolli vorme jääb staatusereegli tõttu välja. Kinnitada valitud osade ja koondvormi lõppolek |
| Põlvkonnata `soidumeerik=arukas` väärtuste käsitlus | `arukas-2` viiakse `smart_2` alla; ilma numbrita vana väärtuse põlvkonda ei oletata |
| Vanade rikkumiste, tehniliste puuduste ja ADR-/katkestamisandmete lõplik vastendus | Osa lähteandmeid säilib praegu tõendusandmetes, kuid ei ole veel rakenduse vastavates äriväljades. Vastenduse koostab arendus, tähenduse kinnitab valdkonna omanik |

Konkreetsete vormide tunnused on privaatsetes `finding.csv` / `quality_report.csv`
aruannetes. Isikuandmeid ega tervet backup'i ei lisata Git'i, piletisse või avalikku kirja.
Puuduva teksti asendaja `-` on lubatud; see ei kehti kuupäevade, otsuste ja rikkumiste kohta.

## Kuidas administraator proovimigratsiooni käivitab

Üksikasjalikud env-seaded on [käivitusjuhendis](../../DSL/migration/README.md) ja
[.env.example](../../DSL/migration/.env.example). Administraatori komplekt on `DSL/migration/`.

1. Taastada SQL Serveri backup eraldi baasi. Hoida allikas muutumatuna; lubada taastatud
   baasil `ALLOW_SNAPSHOT_ISOLATION`, nagu README kirjeldab.
2. Luua eraldi **tühi LJVIS 2 proovibaas** ja rakendada selle tarkvaraversiooni Liquibase
   changelog. See ei tohi olla kasutuses olev rakenduse andmebaas.
3. Paigaldada README järgi Python-sõltuvused. Kopeerida `.env.example` → `.env`, täita
   lähte- ja sihtühendused, fikseeritud `CUTOFF`, koopia tunnus `SOURCE_LABEL`,
   `SOURCE_FROZEN=yes` ja ainult proovibaasi jaoks `TARGET_DISPOSABLE=yes`.
4. Kui antud on ainult SQL backup, käivitada:

   ```bash
   cd DSL/migration
   ./run.sh --rehearsal --sql-only
   ./run.sh --verify
   ```

   `--sql-only` on lubatud **ainult** `--rehearsal` korral. Aruandes on RavenDB
   `not-provided`; see ei ole `absent-confirmed`. Exit 2 tähendab, et tulemus vajab
   ülevaatust. Exit 1 tähendab tehnilist viga; uurida `failure.json` ja sammu logi.
5. Edastada arendusele koondaruanne `summary.json` kokkulepitud turvalises kanalis.
   Detailaruanded võivad sisaldada isikuandmeid ja jäävad piiratud ligipääsuga keskkonda.

Sama koodi, allika ja ajapiiriga korduskäivitus on toetatud. Pärast mappingu muutmist
alustada uuesti puhtast proovibaasist; `form_link` või tõendusandmete käsitsi kustutamine
olemasolevate vormide kõrvalt ei ole lubatud.

## Arendaja üks käsk backup'ist kontrollitud proovini

See on **valikuline arendaja Docker-stend**, mitte administraatori tööbaasi käsk.
Vajalikud on Docker ja `DSL/migration/requirements.txt` Python-sõltuvused.
Käivitada repo juurest:

```bash
python3 tests/migration/backup_review.py /turvaline/tee/ljvistest_250926.bak --cutoff 2023-09-25
```

Käsk taasloob ainult eraldi Docker-projekti `ljvis-backup-trial`, taastab `.bak` read-only
allikaks, rakendab LJVIS 2 skeemi, täidab Q0–Q19, käivitab migratsiooni, korduskäivituse,
read-only kontrolli ja uue puhta sihtbaasi katse. Kohalikud pordid: SQL **14359**, PG **55459**.
Väljund on `tests/migration/runs/backup-*/review.json` ning privaatsed detailaruanded.
Exit **2** koos `technical_checks_passed=true` kinnitab tehnilise proovi, mitte ärilist vastuvõttu.

## Enne lõplikku üleminekut

Lahendada kõik blokeerijad, saada puuduvad allikad ning kinnitada väljade/otsuste/
rikkumiste ja manuste vastuvõtt. Leppida kokku allikate ühine ajahetk, ajavöönd,
hooldusaken, sihtbaasi varundus/taastamine, välisteadete peatamine ning staging'u,
logide ja backup'ide säilitamise tähtaeg. Lõplik käik tehakse puhtale kinnitatud sihile
README tavakäsuga `./run.sh`, ilma `--rehearsal` ja `--sql-only` lippudeta.
