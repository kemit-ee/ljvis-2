# LJVIS 1 → LJVIS 2: administraatori migratsioonijuhend

**Seis 20.10.2026: SQL Serveri varukoopiaga migratsiooniproov on tehtud; tootmisse üleminek on blokeeritud.** Andmete eraldamine ja proovilaadimine
on testitavad, kuid osa äriväljade vastendusi on lõpetamata. Tavakäivitus peatub enne
`forms.*` laadimist, kui leiab blokeeriva puuduse. `--rehearsal` lubab osalist tulemust
**ainult ühekordses proovibaasis** ja tagastab koodi **2**, mitte eduteate.

Koondkontrollide ühendamine ning selge `true` või `1` tunnusega haagise ja teise juhi andmete suunamine
on rakendatud. Lõpetada tuleb rikkumiste, puuduste ja kõigi menetlusvariantide vastendus,
ADR-i detailandmed ning manuste ülekanne. 19.10 kliendi otsuste rakendus ja allesjäänud
piirangud: [otsuste ülevaade](../../docs/migration/owner-decisions-2026-10-19.md). Saadud testvarukoopia sisaldab ka maskeeritud andmeid.
Lähteandmete säilitamine `migration.source_snapshot` tabelis ei tähenda, et kõik need
andmed oleksid juba rakenduses kasutatavad. Vajalikud sisendid:
[administraatori järgmised sammud](../../docs/migration/migration-guidelines.md).

Sisukord: [komplekt](#administraatorile-antav-komplekt) · [eeltingimused](#1-eeltingimused) ·
[seaded](#2-seaded-ja-ulatus) · [käivitamine](#3-käivitamine-ja-tulemuse-lugemine) ·
[korduskäivitus](#4-korduskäivitus-ja-taastamine) · [vastuvõtt](#5-vastuvõtt-enne-kasutajatele-avamist).

Selles juhendis on ADR ohtliku veose kontrollvorm ja SP sõidu- ja puhkeaja kontrollvorm.
RavenDB V1 ja V2 tähistavad tööinspektsiooni aktide kahte andmevormingut.

## Administraatorile antav komplekt

See kaust sisaldab ainult migratsiooni käivitamiseks ja kontrollimiseks mõeldud faile:
`run.sh`, `migrate.py`, `enrich.py`, `decisions.py`, `identifiers.py`, `evidence.py`, `diagnostics.py`, `extract/` (sh `extract/config.py`), `sql/`, `requirements.txt`, `.env.example` ja see juhend.
`.gitignore` välistab paroolid, lokaalse Pythoni keskkonna ja käivituste aruanded.
**Docker Compose ei ole selle migratsiooniskripti eeltingimus.** Skript ühendub andmebaasiadministraatori (DBA)
ettevalmistatud lähte- ja sihtbaasidega. Sihtskeemi Liquibase’i muudatuste loend kuulub rakendusse.

Arendaja sünteetilised andmed, Dockeri testkeskkond ja testid hoitakse praegu väljaspool
seda repositooriumi. Administraatoril ei ole neid vaja kopeerida ega käivitada.
Administraatori käivitatud migratsioon salvestab aruanded vaikimisi selle kausta `runs/` alamkausta. Neid aruandeid ei lisata Giti.

## 1. Eeltingimused

- Python **3.11+**, Bash ja paigaldatud [requirements.txt](requirements.txt) sõltuvused.
  `run.sh` ei paigalda käivitamise ajal pakette. `psql` on vajalik ainult käsitsi SQL-päringuteks.
- Täismigratsiooniks SQL Serveri ja RavenDB **sama ajahetke koopiad**, mis on taastatud ja mille andmeid
  katse ajal ei muudeta. SQL Serveri kasutajal piisab vajalike tabelite lugemisõigusest.
  Vaikimisi kasutatakse `SNAPSHOT`-isolatsioonitaset: DBA lubab `ALLOW_SNAPSHOT_ISOLATION`
  taastatud baasil. Alternatiiv on `SERIALIZABLE`-isolatsioonitase muutumatul koopial.
- Sihtbaasile on rakendatud selle LJVIS 2 versiooni täielik Liquibase’i muudatuste loend.
  Migreerijal on `CREATE` õigus skeemide loomiseks, tabelite ja arvujadade kasutus- ning
  kirjutusõigused skeemides `forms`, `staging` ja `migration`. Rakenduse tavakasutajale
  ei ole vaja anda õigusi migratsiooni tõendusandmetele.
- Võrguühendus koopia ja sihtbaasiga: turvaline haldusvõrk/VPN/tunnel; PostgreSQL-i
  ja RavenDB sertifikaadid vastavalt keskkonnale. Leppige SQL Serveri TLS-i ja FreeTDS-i seadistus
  kokku DBA-ga. Teenused ei pea olema internetist ligipääsetavad.
- Enne päris üleminekut: sihtbaasi varukoopia **koos arvujadadega**, taastamise katse,
  piisav kettaruum hetktõmmiste ja PostgreSQL-i tehingulogi (WAL) jaoks ning hooldusaken.
  Peatage andmeid muutvad rakenduse protsessid ning välisteadete, X-tee ja e-toimiku ajastatud tööd.
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

`--rehearsal --sql-only` korral ei ole `RAVENDB_MODE`, `RAVENDB_ABSENCE_REASON` ega
`SOURCE_RAVENDB_*` vajalikud; RavenDB jääb sel juhul selgesõnaliselt kontrollimata.

Täitke fail `.env` faili [.env.example](.env.example) järgi. Fail kasutab Bashi süntaksit.
Kirjutage paroolid ülakomadesse. Prooviseaded ei tohi osutada kasutuses olevale andmebaasile.

| Muutujad | Tähendus |
|---|---|
| `SOURCE_MSSQL_HOST/PORT/USER/PASSWORD/DB` | SQL Serveri koopia ühendus; port vaikimisi 1433 |
| `SOURCE_MSSQL_ISOLATION` | `SNAPSHOT` (vaikimisi) või `SERIALIZABLE` |
| `SOURCE_MSSQL_QUERY_TIMEOUT` / `EXTRACT_BATCH_SIZE` | Päringu ajalimiit 300 s; partiis 2000 rida |
| `RAVENDB_MODE` | `required` või **DBA kinnitatud** `absent-confirmed` |
| `RAVENDB_ABSENCE_REASON` | Kohustuslik puudumise kinnituse põhjus/viide; salvestatakse käivituslogisse |
| `SOURCE_RAVENDB_URL/DATABASE` | REST-ühendus taastatud RavenDB-ga |
| `SOURCE_RAVENDB_V1_COLLECTION/V2_COLLECTION` | Vaikimisi `JobInspections` / `JobInspectionV2s`; kinnitage tegelikud nimed |
| `SOURCE_RAVENDB_CERT/KEY/CA` | Valikuline PEM-vormingus kliendisertifikaat, privaatvõti ja serveri sertifitseerimiskeskuse (CA) sertifikaat |
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
| `PYTHON` / `MIGRATION_ENV_FILE` | Valikuline Pythoni käivitusfail ja alternatiivne keskkonnamuutujate fail |

SQL Serveri algvalik on **`ControlForm.ControlledDate >= CUTOFF`**.
`CreatedDate` ei kasutata ajapiiri varuvariandina. Sama kehtiva `Control` vanemad
`Confirmed`/`Published` osad kaasatakse; `Saved` ei kaasata ka seotud osana.
`migration.disposition.inclusion_basis` eristab `within_window` ja
`included_control_peer`. NULL-kuupäev jääb lahendamata (`missing_scope_date`),
mitte väljamõeldud kuupäevaks. Muud väljajätmised jäävad faili `disposition.csv`.
EAV-andmete (olemi, atribuudi ja väärtuse kirjetena salvestatud andmete) kuupäevavastuolud esitatakse eraldi.

RavenDB-s puudub usaldusväärne loomise kuupäev. Piiriks kasutatakse V1 `kontrolli_kp` /
V2 `InspectionDate` kuupäeva. `@last-modified` säilib toorandmetes, kuid **ei ole loomise
kuupäev ega migratsiooni ajapiir**. V1-l pole staatust: proovirežiim käsitleb ajapiiri sisse
jäävat V1 dokumenti lõppaktina **esialgse, veel kinnitamata reegli alusel**. `eligible`
on tehnilise valiku tulemus, mitte andmeomaniku heakskiit. Ajapiirist vanema dokumendi
põhjus on `excluded_before_cutoff`; staatuse järgi V1 dokumente välja ei jäeta.
V2-st võetakse `Confirmed`/`Published`; sihttabeli olek on `confirmed`. V1 lõppakti
reegli ja RavenDB ajapiiri kinnitab andmeomanik enne üleminekut.

RavenDB `.ravendbdump` tuleb enne taastada ühilduvasse RavenDB instantsi. Skript ei loe
seda failivormingut otse. Dokumendi ID võib olla number või väline tunnus. Andmete eraldamisel
valitakse dokumendid kollektsiooni kuulumise, mitte ID eesliite järgi. Kui mõlemad kollektsioonid puuduvad,
käivitus peatub; seda ei tõlgendata vaikimisi tühja allikana.

## 3. Käivitamine ja tulemuse lugemine

```bash
./run.sh                  # kontrollitud käik; puudulik vastendus blokeerib forms.* laadimise
./run.sh --rehearsal      # ainult taastatav proovibaas; osaline tulemus vajab ülevaatust
./run.sh --rehearsal --sql-only  # ainult SQL backup; RavenDB jääb kontrollimata
./run.sh --verify         # viimase käigu ainult-lugemine kontroll
# Konkreetse käigu kontroll: sea RUN_ID selle käigu UUID-ks .env failis.
```

`--sql-only` nõuab `--rehearsal` ja ühekordset sihtbaasi; tavakäivitus keeldub sellest.
See ei kinnita RavenDB puudumist. `summary.json` sisaldab ka varasemate seotud
käivituste leide ja kvaliteediridu: korduskatse ei kustuta nende läbivaatamise vajadust.

Ärge käivitage SQL-teisendusi eraldi: `migrate.py` korraldab ühise transaktsiooni,
käivitusluku, eelkontrollid, numbrite kontrolli ja korduskatse. `--no-recheck` jätab
ainult automaatse teise teisenduse vahele; seda ei kasutata esimesel proovikäivitusel.

| Väljumiskood / `migration.run.status` | Administraatori tegevus |
|---|---|
| `0` / `succeeded` | Tehnilised kontrollid läbitud; enne avamist vajalik allpool kirjeldatud äriline vastuvõtt |
| `2` / `blocked` | Blokeerijad salvestatud; vorme ei laaditud. Andke aruanne arendajale või andmeomanikule |
| `2` / `needs_review` | Proovilaadimine tehtud, kuid tulemus **ei sobi tootmisse üleminekuks** |
| `64` / käivitust ei loodud | Vigane käsurida; parandage käsureaparameetrid. See ei ole andmetest tingitud takistus |
| `1` / `failed` | Viga ühenduses, SQL-is, korduskäivituse ohutuses või tervikluses; vaadake ebaõnnestunud sammu ja vealogi |

Iga käivituse kohta koostatakse järgmised failid:

- `summary.json`: kuupäevapiir, koopia tunnus, koodi räsi, staatus, lähte- ja sihtvormide
  katvus ilma koondvormidest tekkiva topeltloenduseta, leiud ja arhiveeritud ridade arvud;
- `finding.csv`: praeguse ja seotud varasemate käivituste blokeerivad puudused ja hoiatused koos vormi ID ja käivituse ID-ga;
- `disposition.csv`: iga eraldatud lähtevormi kaasamise või väljajätmise põhjus;
- `quality_report.csv`: rakendatud vaikeväärtused ja lahendamata vastendused;
- andmeid eraldavate skriptide `.log` failid; vea korral `failure.json` ja andmebaasis `current_step/error_message`.

Lisaks on käivituse kaustas:

- `source-counts.json`: enne kopeerimist samas SQL Serveri hetktõmmisega transaktsioonis loetud
  lähtetabelite mahud ning loetud ridade ja skeemi `staging` jõudnud ridade arvud. Loendus käib
  andmete eraldamise valiku, mitte kogu vana infosüsteemi kohta. `--verify` võrdleb
  andmebaasis säilitatud `extraction_manifest` loendust ka `source_manifest`-iga.
- `reconciliation.csv`: iga eraldatud lähtevormi ID ja number, valikupõhjus, sihtvorm
  ja tulemus. Valitud vormil peab olema nii link kui ka tegelik sihtrida.
  Mustandid ja muud kokkulepitud väljajätmised on eraldi; ühine koondvorm ei
  suurenda alamvormide loendust. Vormide olemasolu ei tõenda kõigi väljade vastendust.
- `unmapped-fields.json`: iga täidetud, deklareerimata EAV-sisendi võti, lähterea
  ID, vormi ID ja number ja algväärtus. `mapping_incomplete` jääb eraldi sisulise
  katvuse blokeerijaks ka siis, kui võtme nimi esineb teisenduskoodis.
- `findings-detailed.csv` / `.json`: praeguse käivituse leiud koos vormi numbri,
  välja, algväärtuse ja põhjusega. Numbrikonflikti korral on `context` veerus
  kõik konfliktis vormid; liiga pika teksti korral väärtus, pikkus ja limiit;
  mitme kontrolliseose korral kontrollide ID-d. Otsuse või menetluse probleemidel
  eristatakse puuduvat välja, tühja väärtust ja mitut väärtust.
  Sama info säilib `events.jsonl` ja `attempt/finding.json` failides.
- `field-coverage.csv`: täidetud EAV-ridade ja vormide arv välja ja vormitüübi kaupa,
  deklareerimata sisendite arv. Deklareeritud sisend ei tähenda automaatselt
  kontrollitud sihtväärtust; lahendamata ärivastendused jäävad blokeerima.
- `owner-decisions.csv` / `.json`: otsuse viide, väli, algväärtused ja uued väärtused
  (sh P12 arvude lühendamine). Kehtivat kellaaega ei asendata 00:00-ga.
- `events.jsonl`: ainult lisamist lubav sündmuslogi väljaspool sihtbaasi tehingut;
  `attempt/` sisaldab viimast nähtud tehingusisest diagnostikat. SQL-i iga
  lause järel salvestatakse leiud; hilisem viga ei kustuta neid logidest.
- `integrity_problems.json`: kontrollide lahknevused koos seotud ID-de ja väljadega.
  Nurjunud teisenduse kontrollid säilivad `attempt/integrity_problems.json` failis.

**Tagasipööratud katse pole tehtud ülekanne.** `events.jsonl` lõpus olev
`run_outcome` ja otsuselogi `target_transaction` eristavad `committed`,
`rolled_back` ning ühenduse kaotuse korral `unknown_check_database`. Viimase korral
kontrollige sihtbaasi enne uut katset. Katkenud protsessil võib lõppsündmus puududa;
ka see ei tähenda õnnestumist. `summary.json`/`reconciliation.csv` näitavad pärast
tagasipööramist püsivat seisu; `attempt/` kirjeldab nurjunud katset.

Detailfailid sisaldavad algväärtusi ja võivad sisaldada isikuandmeid. Hoidke neid
piiratud ligipääsuga keskkonnas. Ärge lisage neid Giti ega avalikku veateatesse. Jagamiseks mõeldud
administraatori koondlogi sisaldab ainult koode ja arve.

Vormi algandmete leidmiseks asendage näites UUID ja lähtevormi ID:

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
Katkenud või käsitsi peatatud protsess võib jätta staatuse `running`: kontrollige protsessi ja
sihtbaasi enne uut käivitust. Sama baasi paralleelse migratsiooni peatab rakenduse juhitav andmebaasilukk (`advisory lock`).

## 4. Korduskäivitus ja taastamine

Kõik `forms.*` lisamised, `form_link` kirjed ja teisenduse kvaliteedikirjed on **ühes
transaktsioonis**. Hiline viga tühistab need kõik. Arvujadade lüngad pärast transaktsiooni tagasipööramist
on PostgreSQL-is tavapärased. Eraldatud andmed, toorandmete hetktõmmis ja käivituse seis säilivad
vea uurimiseks. Võrdsed ridade arvud ei asenda koopia seiskamist.

Sama muutumatu allika korduskäivitus uue `RUN_ID` väärtusega ei loo uusi vorme. Muutunud juba
migreeritud lähtevorm, vahetatud koopiatunnus/piir või katkenud sihtseos peatab käivituse.
See tööriist ei ole muudatusi sünkrooniv delta-migratsioon ega paranda vanu vigaseid
sihtkirjeid automaatselt.

**`--reset` on eemaldatud.** Ärge kustutage `migration.form_link`-i ega kogu `migration`
skeemi, jättes vormid alles. Nii võib korduskäivitus luua duplikaate. Pärast
vastenduse muutmist alustage puhtast sihtbaasi varukoopiast. Kui osaline tulemus on juba
kasutusse võetud, vajab parandamine eraldi kontrollitud plaani.

Säilitage `migration.*`, käivituslogid ja algsed varukoopiad. `source_snapshot` säilitab
**andmete eraldamisel loetud veerud ja read**, mitte kogu vana infosüsteemi ega manuste faile.
`staging.*` on ajutine; seda võib eemaldada alles pärast vastuvõttu ja tõendusandmete
varundamist. See hetktõmmis ei asenda SQL Serveri, RavenDB ega failikataloogi koopiat.

## 5. Vastuvõtt enne kasutajatele avamist

Kontrollige iga vormitüübi andmete ülekannet, iga väljajätmise põhjendust ja kõiki blokeerivaid puudusi.
Ka üks puuduv vorm või vale otsus vajab lahendust. Võrrelge vana ja uue rakenduse välju,
rikkumisi, alamvorme, koondkontrolli seoseid, staatust, kuupäevi, autoreid ja numbreid.
Kontrollige otsingut, vormide vaatamist, PDF-väljundit ja õigusi. Kinnitage manuste ning V1 aktide reeglid.
Kui teisendus vajab parandamist, taastage proovibaas ja korrake täielikku katset.

Edukalt läbitud sünteetiline test kinnitab migratsiooni tehnilist toimimist; pärisandmete vastuvõttu see ei asenda.
Arendaja kontrollib korduskäivitust ja andmete katvust eraldi testkeskkonnas, mida selles
repositooriumis ei hoita.

## Kinnitatud tekstiasendused ja lahendamata andmed

Omanik kinnitas 23.09.2026 puuduva teksti asendamise `'-'` märgiga. Täpne lubatud
väljade ja põhjuste loend on `migration.approved_text_default` funktsioonis
`sql/00-staging-schema.sql`; kinnituse viide kirjutatakse `quality_report.approval_basis`
väljale. Üldist „ignoreeri kõik kvaliteedivead” lülitit ei ole. Kuupäevad, tulemused,
tundmatud klassifikaatorid, puuduvad rikkumised ja vormide marsruutimine ei kuulu
selle kinnituse alla. Hea maine vormi (`GoodRepute`) teisendus loeb olemasolevat `AmetialasePadevuseTunnistuseValjastanudRiik` välja. Puuduva tunnistuse väljastanud riigi `'-'` ei ole enam iseseisev
tootmisse ülemineku takistus; muud lahendamata probleemid jäävad blokeerima.

Puuduv või mitmene `otsus` saab eraldi `unmapped_control_result` blokeerija sõltumata
üldisest vastenduste loendist. Proovirežiimi sihttabelis võib endiselt olla märgistatud tehniline
`ok` vaikeväärtus, sest sihtskeemis puudub neutraalne tundmatut tulemust tähistav väärtus; **seda ei tohi
käsitleda tegeliku kontrollitulemusena ega tootmiskeskkonna andmetena**. Lubatud tekstiasendus
ei kinnita seda. Mitme otsuse kokkuliitmine vajab eraldi andmemudeli lahendust.

Proovirežiimi käivitus võib peatuda eelkontrollis, kui haagise või teise juhi tunnus on ebaselge,
ühe väärtusega väljal on mitu lähteväärtust või välja `Sobivus` väärtus on tundmatu. Samuti peatavad ülekande vigane vorminumber või puuduv või vigane `FormVersion`, korduv baasnumber samas sihttüübis, vastuoluline ühine päis ja tuvastatud
liiga pikad tekstiväljad. Numbreid ei muudeta ega probleemseid vorme vaikselt välja jäeta.
`finding.csv` ja `disposition.csv` väljastatakse ka siis. See on
teadlik tervikliku ülekande kaitse; vaikimisi ei jäeta vigu sisaldavaid vorme kõrvale.
`Sobivus` vea juures on allika ID ja algne väärtus. Liiga pika teksti viga nimetab
allika ID, sihttabeli ja veeru ning lubatud ja tegeliku pikkuse; kogu teisenduse transaktsioon pööratakse tagasi.
RavenDB kuupäeva aastaga alla 1000 käsitletakse puuduva ajapiirina, mitte vana aktina.

`--verify` kontrollib lisaks vormide numbritele/seostele ka säilitatud lähteandmeid:
`source_manifest` hoiab skeemi `staging` ridade arvu ja sisu kontrollsummat iga lähtetabeli
kohta; `source_snapshot` peab nendega kattuma. Vea annab ka EAV-andmete muutmine ilma ridade arvu muutuseta või
lähterea kustutamine. See on terviklikkuse kontroll, mitte digiallkiri ega
kinnitus, et ajaloolised redaktsioonid on LJVIS 2 kasutajaliideses nähtavad.
Kehtiva tekstilise päevade arvu asendumine aegunud välja `IntValue` väärtusega tuvastatakse eraldi.
Vanadel käivitustel, millel lähteandmete loend ja kontrollsummad puuduvad, ei saa uut kontrolli tagantjärele kinnitada:
tehke uus proov algsest muutumatust allikast. Ärge arvutage tõendit kontrollitavast hetktõmmisest.

## Toorandmete säilitamine

`staging` ja iga käivituse `migration.source_snapshot` sisaldavad ka staatusega `Saved` ja `Deleted`
vorme ja kasutajate isikukoode. Need on isikuandmed, mitte ainult tehnilised logid.
DBA peab piirama ligipääsu migratsiooni rollile, määrama enne tootmisandmetega proovi
säilitamise tähtaja ja vastutaja ning kooskõlastama puhastamise pärast vastuvõttu.
Sama kehtib varukoopiatele ja käivituste failidele. Migratsioon ei määra ise suvalist tähtaega
ega kustuta tõendusmaterjali automaatselt; `source_snapshot` ei ole tähtajatu arhiiv.


`summary.json.findings` sisaldab praeguse käivituse ja juba laaditud vormide varasemaid
leide, identsed leiud loetakse üks kord. Sama kehtib `--verify` kohta.
`inherited_findings` näitab lisaks päritolu; seda ei pea koguarvule juurde liitma.
Konfliktse ühise päise korral vormide transaktsioon tühistatakse; vormi või rühma tunnused
säilivad `finding.csv` ja `failure.json` failides.

25.09.2026 varukoopia 77 valitud vormis on **3093 mittetühja tekstilist EAV-väärtust**.
Kõigi väärtuste äriline ülekanne ei ole veel tõendatud: SP rikkumiste massiivid ja
tehniliste puuduste detailid on puudulikud. Koodist võtmenime leidmine ei tõenda
väärtuse ülekannet; protsenti „68% üle kantud” ei kasutata vastuvõtukriteeriumina.
Toorväärtuse säilimine hetktõmmises ei asenda rakenduse välja ega kinnita väljajätmist.
Ka tehniliseks peetud võtmeid ei loeta automaatselt lubatud kustutuseks.

### Lähtevormide numbrid ja versioonid

SQL Serverist pärit vormide algsed LJVIS 1 tunnused säilivad. Sünteetiline näide
`th-2099-90001/4` salvestatakse kujul `sub_form_number = 'th-2099-90001'`, `version = 4`.
Kasutajaliides ühendab need väljad. Uued andmebaasivõtmed ei tohi asendada ajaloolisi vorminumbreid.
Migratsiooni juhtskript rakendab seda reeglit kõigile imporditud `ControlForm`-i vormitüüpidele.
Juhtskript säilitab kuvatava versioonisufiksi lähteväljast `FormVersion` sõltumatult.
Toetamata või puuduv tunnus ning korduv sihtnumber peatavad käivituse. Skript ei nummerda vorme ümber.
`template_version` tähistab malli versiooni, mitte vormi versiooni. Genereeritud `koond-*` numbrid
tähistavad uusi koondvorme. Need ei asenda algseid vorminumbreid.

Enne transaktsiooni kinnitamist suurendab skript vorminumbrite genereerimiseks kasutatavaid
loogiliste võtmete arvujadasid üle olemasolevate vorminumbrite arvuliste sufiksite.
Skript ei vähenda arvujadade väärtusi. Nurjunud transaktsioonid võivad jätta arvujadadesse lünki.
Käivitage migratsioon eespool kirjeldatud hooldusaknas, kui andmeid muutvad protsessid on peatatud.
Ümbernummerdatud vormidega varasemad proovilaadimised ei läbi tunnuste kontrolli.
Kasutage parandatud juhtskriptiga uut sihtbaasi. Ärge parandage tootmiskeskkonna vorminumbreid
käsitsi ega käsitlege varasemat proovi vastuvõetud tulemusena. RavenDB dokumentide tunnuseid
tuleb kontrollida eraldi tegeliku lähteandmestiku alusel. Seda andmestikku ei ole veel üle antud.

### Migratsiooni ulatus ja vana audit

LJVIS 1 välja `Versions.Data` sisu ega eraldi ajaloo kasutajaliidest ei migreerita. `forms.legacy_record`
muudatuste loend on enne kasutuselevõttu eemaldatud. `Versions`-metaandmeid kasutatakse
skeemis `staging` ainult autori varuallikana; vana versiooni sisu ei kopeerita.

Alles jäävad lähte-sihtkirjete seosed, algsed numbrid, valiku põhjused,
lähteandmete kontrolljälg ja `--verify`. Need on migratsiooni tööandmed, mitte
rakenduse ajalooarhiiv. Puudulik äriväljade ja rikkumiste vastendus jääb blokeerivaks;
skeemis `staging` säilitamine ei tähenda edukat ülekannet LJVIS 2 äriväljadesse.

Ajaloolised mitteaktiivsed klassifikaatorid jäävad vajalikuks. Nende sidumine
vormide rikkumisväljadega vajab lõpetamist; klassifikaatori olemasolu üksi ei piisa.
Vana proovibaasi ei kustutata automaatselt. Kasutage uue koodiga puhast proovibaasi
ja uut väljavõtet. Varasema proovikäivituse täielikkuse kontroll ei asenda uue tulemuse vastuvõttu.
