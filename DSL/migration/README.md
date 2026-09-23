# LJVIS 1 → LJVIS 2: administraatori migratsioonijuhend

**Seis 22.09.2026: tootmisse üleminek on blokeeritud.** Ekstraktimine ja proovilaadimine
on testitavad, kuid osa äriväljade vastendusi on lõpetamata. Tavakäivitus peatub enne
`forms.*` laadimist, kui leiab blokeeriva puuduse. `--rehearsal` lubab osalist tulemust
**ainult ühekordses proovibaasis** ja tagastab koodi **2**, mitte eduteate.

Puuduvad veel muu hulgas koondkontrollide kokkupanek, haagise/teise juhi suunamine,
rikkumiste ja menetluste täielik vastendus, ADR-i detailandmed ja manuste ülekanne.
Lähteandmete säilitamine `migration.source_snapshot` tabelis ei tähenda, et kõik need
andmed oleksid juba rakenduses kasutatavad. Vajalikud sisendid:
[administraatori päringud](../../docs/migration/migration-guidelines.md).

## Administraatorile antav komplekt

See kaust sisaldab ainult migratsiooni käivitamiseks ja kontrollimiseks mõeldud faile:
`run.sh`, `migrate.py`, `extract/`, `sql/`, `requirements.txt`, `.env.example` ja see juhend.
`.gitignore` välistab paroolid, lokaalse Pythoni keskkonna ja jooksude aruanded.
**Docker Compose ei ole selle migratsiooniskripti eeltingimus.** Skript ühendub DBA
ettevalmistatud allika- ja sihtbaasidega; sihtskeemi Liquibase changelog kuulub rakendusse.

Arendaja sünteetilised andmed, Docker-stend ja testid on eraldi `tests/migration/`
kaustas. Seda kausta ei ole administraatorile vaja kopeerida ega käivitada.
Administraatori jooks loob vaikimisi oma `runs/` aruanded siia; neid ei lisata Giti.

## 1. Eeltingimused

- Python **3.11+**, Bash ja paigaldatud [requirements.txt](requirements.txt) sõltuvused.
  `run.sh` ei paigalda käivitamise ajal pakette. `psql` on vajalik ainult käsitsi SQL-päringuteks.
- SQL Serveri ja RavenDB **sama ajahetke taastatud/seisatud koopiad**, muutmata kogu
  katse jooksul. SQL Serveri kasutajal piisab vajalike tabelite lugemisõigusest.
  Vaikimisi kasutatakse `SNAPSHOT` isolatsiooni: DBA lubab `ALLOW_SNAPSHOT_ISOLATION`
  taastatud baasil. Alternatiiv on `SERIALIZABLE` seisatud koopial.
- Sihtbaasile on rakendatud selle ljvis-2 versiooni täielik Liquibase changelog.
  Migreerijal on `CREATE` õigus skeemide loomiseks, tabelite/sequence'ide kasutus- ja
  kirjutusõigused `forms`, `staging`, `migration` skeemides. Rakenduse tavakasutajale
  ei ole vaja anda õigusi migratsiooni tõendusandmetele.
- Võrguühendus koopia ja sihtbaasiga: turvaline haldusvõrk/VPN/tunnel; PostgreSQL-i
  ja RavenDB sertifikaadid vastavalt keskkonnale. SQL Serveri TLS/FreeTDS seadistus
  leppida kokku DBA-ga; internetti avatud teenused pole nõutud.
- Enne päris üleminekut: sihtbaasi varukoopia **koos sequence'idega**, taastamise katse,
  piisav kettaruum snapshot'ide ja PostgreSQL WAL-i jaoks, hooldusaken.
  Peatada rakenduse kirjutajad ja välisteadete/X-tee/e-toimiku ajastatud tööd.
  Transaktsioon lukustab vormitabelid, kuid see ei peata väliste süsteemide töid.

```bash
cd DSL/migration
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
chmod 600 .env
```

## 2. Seaded ja ulatus

Täida [.env.example](.env.example) järgi `.env`. Fail kasutab Bash-süntaksit;
paroolid kirjuta ülakomadesse. Prooviseaded ei tohi osutada tööbaasile.

| Muutujad | Tähendus |
|---|---|
| `SOURCE_MSSQL_HOST/PORT/USER/PASSWORD/DB` | SQL Serveri koopia ühendus; port vaikimisi 1433 |
| `SOURCE_MSSQL_ISOLATION` | `SNAPSHOT` (vaikimisi) või `SERIALIZABLE` |
| `SOURCE_MSSQL_QUERY_TIMEOUT` / `EXTRACT_BATCH_SIZE` | Päringu ajalimiit 300 s; partiis 2000 rida |
| `RAVENDB_MODE` | `required` või **DBA kinnitatud** `absent-confirmed` |
| `RAVENDB_ABSENCE_REASON` | Kohustuslik puudumise kinnituse põhjus/viide; salvestatakse käivituslogisse |
| `SOURCE_RAVENDB_URL/DATABASE` | REST-ühendus taastatud RavenDB-ga |
| `SOURCE_RAVENDB_V1_COLLECTION/V2_COLLECTION` | Vaikimisi `JobInspections` / `JobInspectionV2s`; kinnitada tegelikud nimed |
| `SOURCE_RAVENDB_CERT/KEY/CA` | Valikulised PEM-kliendisertifikaat, privaatvõti ja serveri CA |
| `SOURCE_RAVENDB_TIMEOUT` | Lugemise ajalimiit, vaikimisi 120 s |
| `TARGET_PG_HOST/PORT/DB/USER/PASSWORD` | Sihtbaas; port vaikimisi 5432 |
| `TARGET_PG_SSLMODE` | Mallis `verify-full`; libpq toetab ka `PGSSLROOTCERT`, `PGSSLCERT`, `PGSSLKEY`, `PGPASSFILE` |
| `CUTOFF` | **Viimased 3 aastat**, fikseeritud kuupäev tegeliku ülemineku jaoks; näide 22.09.2026 korral `2023-09-22` |
| `SOURCE_LABEL` | Kohustuslik täpse SQL Serveri + RavenDB koopiapaari tunnus |
| `SOURCE_FROZEN` | `yes` pärast allikakoopiate kirjutajate peatamist |
| `TARGET_DISPOSABLE` | `yes` ainult ühekordsel proovibaasil; vajalik `--rehearsal` jaoks |
| `CONNECT_TIMEOUT` | Ühenduse ajalimiit, vaikimisi 30 s |
| `RUN_ID` | Valikuline uus UUID; tühi väärtus genereerib uue. Vana UUID-d ei taaskasutata |
| `MIGRATION_LOG_DIR` | Vaikimisi selle kausta `runs`; iga käivitus oma UUID-alamkaustas |
| `PYTHON` / `MIGRATION_ENV_FILE` | Valikuline Pythoni binaar ja alternatiivne env-fail |

SQL Serveri piir on **`ControlForm.CreatedDate >= CUTOFF`**, mitte `ControlledDate`.
`CreatedDate` ei ole usaldusväärne loomisaeg: vana FormController kirjutab sinna
õnnestunud kuupäevaparssimisel kontrolli kuupäeva koos `ControlledDate`-ga. Teatud
`InspectionDate.DateValue` NULL-harus kasutatakse salvestamise hetke; muus vigase
teksti harus võivad senised kuupäevad jääda muutmata. Seetõttu tähendab piir
**salvestatud CreatedDate väärtust**, mitte garanteeritud loomise aega. Hilisem
muutmine võib muuta ka ajapiiri kuulumist. EAV kontrollkuupäeva puudumisel kasutatakse
esmalt `ControlledDate`, alles siis `CreatedDate`; asendused ja vastuolud raporteeritakse.

NULL-kuupäevaga read säilitatakse ja märgitakse lahendamata ulatusena. Migreeritavad
staatused on `Confirmed` ja `Published`. Muude staatuste, tundmatute vormitüüpide,
FuelSample'i ja NULL-kuupäevade saatus on näha `migration.disposition` tabelis.

RavenDB-s puudub usaldusväärne loomise kuupäev. Piiriks kasutatakse V1 `kontrolli_kp` /
V2 `InspectionDate` kuupäeva. `@last-modified` säilib toorandmetes, kuid **ei ole loomise
kuupäev ega migratsiooni ajapiir**. V1-l pole staatust: rehearsal käsitleb ajapiiri sisse
jäävat V1 dokumenti lõppaktina **esialgse, veel kinnitamata reegli alusel**. `eligible`
on tehnilise valiku tulemus, mitte andmeomaniku heakskiit. Ajapiirist vanema dokumendi
põhjus on `excluded_before_cutoff`; staatuse järgi V1 dokumente välja ei jäeta.
V2-st võetakse `Confirmed`/`Published`; sihttabeli olek on `confirmed`. V1 lõppakti
reegli ja RavenDB ajapiiri kinnitab andmeomanik enne üleminekut.

RavenDB `.ravendbdump` tuleb enne taastada ühilduvasse RavenDB instantsi. Skript ei loe
seda failivormingut otse. Dokumendi ID võib olla number või väline tunnus — ekstrakt
loeb kollektsiooni liikmesust, mitte ID prefiksit. Kui mõlemad kollektsioonid puuduvad,
käik peatub; seda ei tõlgendata vaikimisi tühja allikana.

## 3. Käivitamine ja tulemuse lugemine

```bash
./run.sh                  # kontrollitud käik; puudulik vastendus blokeerib forms.* laadimise
./run.sh --rehearsal      # ainult taastatav proovibaas; osaline tulemus vajab ülevaatust
./run.sh --verify         # viimase käigu ainult-lugemine kontroll
# Konkreetse käigu kontroll: sea RUN_ID selle käigu UUID-ks .env failis.
```

Ära käivita SQL-transforme eraldi: `migrate.py` korraldab ühise transaktsiooni,
käivitusluku, eelkontrollid, numbrite kontrolli ja korduskatse. `--no-recheck` jätab
ainult automaatse teise transformipassi vahele; seda ei kasutata esimesel proovikäigul.

| Exit code / `migration.run.status` | Administraatori tegevus |
|---|---|
| `0` / `succeeded` | Tehnilised kontrollid läbitud; enne avamist vajalik allpool kirjeldatud äriline vastuvõtt |
| `2` / `blocked` | Blokeerijad salvestatud; vorme ei laaditud. Anna raport arendajale/andmeomanikule |
| `2` / `needs_review` | Proovilaadimine tehtud, kuid tulemus **ei sobi tootmisse üleminekuks** |
| `1` / `failed` | Viga ühenduses, SQL-is, idempotentsuses või tervikluses; vaata sammu ja vealogi |

Iga käigu juures on:

- `summary.json`: kuupäevapiir, koopia tunnus, koodi hash, staatus, lähte- ja sihtvormide
  katvus ilma koondvormidest tekkiva topeltloenduseta, leiud ja arhiveeritud ridade arvud;
- `finding.csv`: blokeerija/hoiatus koos algse vormi ID-ga;
- `disposition.csv`: iga ekstraheeritud vormi kaasamise/väljajätmise põhjus;
- `quality_report.csv`: rakendatud vaikeväärtused ja lahendamata vastendused;
- ekstraktorite `.log` failid; vea korral `failure.json` ja andmebaasis `current_step/error_message`.

Vormi algandmete leidmine (asenda UUID ja lähtevormi ID):

```sql
SELECT legacy_form_code,target_table,target_key,target_form_number
FROM migration.form_link WHERE legacy_source='ControlForm' AND legacy_id='123';
SELECT source_table,source_key,payload
FROM migration.source_snapshot
WHERE migration_run_id='<RUN_ID>'::uuid
  AND ((source_table='raw_control_form' AND source_key='123')
    OR (source_table='raw_control_form_value' AND payload->>'control_form_id'='123'));
```

Raportid võivad sisaldada isikuandmeid: kaust luuakse piiratud õigustega, ei lähe Giti.
Katkenud/käsitsi tapetud protsess võib jätta staatuse `running`: kontrolli protsessi ja
sihtbaasi enne uut käivitust. Sama baasi paralleelne ETL peatub advisory-luku tõttu.

## 4. Korduskäivitus ja taastamine

Kõik `forms.*` lisamised, `form_link` kirjed ja transformi kvaliteedikirjed on **ühes
transaktsioonis**. Hiline viga tühistab need kõik. Sequence'ide vahed pärast rollback'i
on PostgreSQL-is normaalsed. Ekstrakt, toorandmete snapshot ja käivituse seis säilivad
vea uurimiseks. Võrdsed ridade arvud ei asenda koopia seiskamist.

Sama muutumatu allika korduskäivitus uue RUN_ID-ga ei loo uusi vorme. Muutunud juba
migreeritud lähtevorm, vahetatud koopiatunnus/piir või katkenud sihtseos peatab käigu.
See tööriist ei ole muudatusi sünkrooniv delta-migratsioon ega paranda vanu vigaseid
sihtkirjeid automaatselt.

**`--reset` on eemaldatud.** Ära kustuta `migration.form_link`-i ega kogu `migration`
skeemi, jättes vormid alles — nii kaob idempotentsus ja tekivad duplikaadid. Pärast
vastenduse muutmist alusta puhtast sihtbaasi varukoopiast. Kui osaline tulemus on juba
kasutusse võetud, vajab parandamine eraldi kontrollitud plaani.

Säilita `migration.*`, käigulogid ja algsed varukoopiad. `source_snapshot` säilitab
**ekstraktori loetud veerud ja read**, mitte kogu vana infosüsteemi ega manuste faile.
`staging.*` on ajutine; seda võib eemaldada alles pärast vastuvõttu ja tõendusandmete
varundamist. Vana SQL/Raven/maakataloogi koopiat see snapshot ei asenda.

## 5. Vastuvõtt enne kasutajatele avamist

Kontrollida tuleb iga vormipere katvust, iga väljajätmise põhjendust ja kõiki blokeerijaid
(ka üks kadunud vorm või vale otsus on oluline). Võrrelda vana/uue rakenduse välju,
rikkumisi, osavorme, koondkontrolli seoseid, staatust, kuupäevi, autoreid ja numbreid;
kontrollida otsingut, vaatamist, PDF-i ja õigusi. Kinnitada manuste ning V1 aktide reeglid.
Kui teisendus vajab parandamist, taastada proovibaas ja korrata täielikku katset.

Sünteetiline roheline test kinnitab mehhanismi; pärisandmete vastuvõttu see ei asenda.
Arendaja korduv katse ja kaetus on eraldi [tests/README.md](tests/README.md).

## Kinnitatud tekstiasendused ja lahendamata andmed

Omanik kinnitas 23.09.2026 puuduva teksti asendamise `'-'` märgiga. Täpne lubatud
väljade ja põhjuste loend on `migration.approved_text_default` funktsioonis
`sql/00-staging-schema.sql`; kinnituse viide kirjutatakse `quality_report.approval_basis`
väljale. Üldist „ignoreeri kõik kvaliteedivead” lülitit ei ole. Kuupäevad, tulemused,
tundmatud klassifikaatorid, puuduvad rikkumised ja vormide marsruutimine ei kuulu
selle kinnituse alla. GoodRepute puuduva tunnistuse riigi `'-'` ei ole enam iseseisev
production-blokeerija; muud lahendamata probleemid jäävad blokeerima.

Puuduv või mitmene `otsus` saab eraldi `unmapped_control_result` blokeerija sõltumata
üldisest mapping-loendist. Rehearsal-tabelis võib endiselt olla märgistatud tehniline
`ok` vaikeväärtus, sest sihtskeemis puudub neutraalne unknown väärtus; **seda ei tohi
käsitleda tegeliku kontrollitulemusena ega production-andmetena**. Lubatud tekstiasendus
ei kinnita seda. Mitme otsuse kokkuliitmine vajab eraldi andmemudeli lahendust.

Rehearsal võib peatuda preflight'is, kui on trailer/teammate, scalar multi-value või
tundmatu Sobivus. `finding.csv` ja `disposition.csv` väljastatakse ka siis. See on
teadlik tervikliku ülekande kaitse; vaikimisi ei jäeta vigu sisaldavaid vorme kõrvale.
`Sobivus` vea juures on allika ID ja algne väärtus. Liiga pika teksti viga nimetab
allika ID, sihttabeli/veeru ning lubatud/tegeliku pikkuse; kogu transformatsioon tühistub.
Raven kuupäeva aastaga <1000 käsitletakse puuduva ajapiirina, mitte vana aktina.

## Toorandmete säilitamine

`staging` ja iga jooksu `migration.source_snapshot` sisaldavad ka Saved/Deleted
vorme ja kasutajate isikukoode. Need on isikuandmed, mitte ainult tehnilised logid.
DBA peab piirama ligipääsu migratsiooni rollile, määrama enne live-andmetega proovi
säilitamise tähtaja ja vastutaja ning kooskõlastama puhastamise pärast vastuvõttu.
Sama kehtib varukoopiatele ja jooksude failidele. ETL ei määra ise suvalist tähtaega
ega kustuta tõendusmaterjali automaatselt; source_snapshot ei ole tähtajatu arhiiv.
