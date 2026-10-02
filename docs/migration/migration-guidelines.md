# LJVIS 1 → LJVIS 2: administraatori järgmised sammud

**Seis: 02.10.2026.** SQL Serveri backup on saadud ja taastatud eraldi proovikeskkonnas.
Varasemaid Q0–Q19 SQL-päringuid **ei ole vaja administraatoril käsitsi käivitada**:
arendus käivitas need taastatud baasil. Tulemused ja andmeid sisaldavad logid jäävad
piiratud ligipääsuga proovikeskkonda.

## Migreeritavate vormide valik

Ajapiir on **viimased kolm aastat** kokkulepitud ülemineku kuupäevast; täpne
kuupäev fikseeritakse `.env` failis (`CUTOFF`) ja seda ei muudeta jooksu ajal.
Kinnitatud valikureegel: viimase kolme aasta kontrollide juurde kaasatakse ka
sama kontrolli vanemad `Confirmed` ja `Published` osad. `Saved` mustandeid
**ei migreerita**, ka siis, kui need sisaldavad andmeid või kuuluvad kaasatud kontrolli.

Algvalik kasutab nüüd `ControlledDate` välja. Sama kontrolli vanemad
kinnitatud/avaldatud osad kaasatakse; põhjus on `disposition.inclusion_basis` väljas.
Puuduvat kontrollkuupäeva ei asendata loomiskuupäevaga.

Iga vormi kaasamise või väljajätmise põhjus on jooksu `disposition.csv` failis.
Mahud sõltuvad andmebaasist: testkoopia arvud ei ennusta LIVE-i.

Jooks kontrollib ka korduskäivitust (sihtkirjed ei muutu ega dubleeru), eraldi
puhast sihtbaasi ning lähte- ja sihtväljade vastavust. **Loodud sihtvormide arv ei
tähenda, et kõik äriväljad, rikkumised või manused on kasutamiseks vastu võetud.**
Ootuspärane tulemus on `needs_review` / exit **2**, mitte exit 0.

Rikkumiste ja puuduste vastenduste hetkeseis on eraldi arendusdokumendis
[violation-mapping-status.md](violation-mapping-status.md). Administraatoril ei ole
seda migratsiooni käivitamiseks vaja: puudulik vastendus kajastub jooksu aruandes.

## Kinnitatud otsused ja teostamata tööd

- Mustandid jäetakse välja; seotud kontrolli vanemad kinnitatud/avaldatud osad kaasatakse.
- Vana auditi sisu ja eraldi ajaloo vaade on ulatusest eemaldatud (02.10.2026). Migreeritakse vormide vajalikud äriandmed.
- Puuduva täpse vastega vanad rikkumised lisatakse ajalooliste klassifikaatoriväärtustena
  (`old-classifiers` migratsioonikomplekt). Need peavad vanal vormil nähtavad olema,
  kuid uue vormi valikus mitteaktiivsed. Säilitada algne kood, nimetus ja eristatav tähendus;
  määrata `valid_from`/`valid_until`. Teadmata ajaloolist kehtivust ei esitata tõendatud
  õigusliku kehtivusajana. Klassifikaatorikomplekt on lisatud Liquibase’i: [old-classifiers.md](old-classifiers.md). Vormide rikkumisväljade seosed ja kuvamine vajavad veel teostust; eraldi algandmete arhiivi ei looda.
- Algset vorminumbrit ei muudeta taustateenuse suurendatud `FormVersion` järgi.

### Konkreetsete probleemvormide ülevaatus

Käivitada [01-problem-forms.sql](client-review/01-problem-forms.sql) tervikuna LJVIS1 SQL Serveris. Määrata `@AsOf` kokkulepitud ülemineku kuupäevaks; arvutatud ajapiir peab kattuma ETL-i `CUTOFF` väärtusega.

[Lihtne juhend](client-review/README.md) selgitab nelja tulemusetabelit ja kliendi otsuseid. Iga juhtumi kohta saab arvu ning vormi numbri, tüübi, staatuse, kontrollkuupäeva ja tehnilise ID. Sama kontrolli osad väljastatakse eraldi kontekstina.

Klient märgib iga vajaliku vormi kohta **MIGREERI / EI_MIGREERI / SELGITADA**, põhjuse, otsustaja ja kuupäeva. Probleemi leidmine ei tähenda luba andmeid välja jätta. Otsused ei rakendu ETL-is automaatselt.

Päring on kontrollitud taastatud testkoopial ja sünteetilises baasis. LIVE-i probleemvormide arv selgub selle päringu käivitamisel; testkoopia arvud ei kirjelda LIVE-i.

## Mida haldurilt ja andmeomanikult veel vaja on

| Vajalik sisend või otsus | Miks |
|---|---|
| RavenDB ja failide olemasolu ning ligipääs | SQL-koopia on olemas; allpool nimetatud lisallikad pole veel üle antud. LJVIS1 tahtlikult maskeeritud andmeid ei taastata automaatselt |
| RavenDB backup/eksport või halduri selgesõnaline kinnitus, et tööinspektsiooni akte ei ole | SQL `.bak` ei sisalda eraldi RavenDB andmeid. Ligipääsu või faili puudumine ei tõenda aktide puudumist |
| `Paths.FormDocuments` failikataloog koos säilitatud kaustastruktuuriga või kokkulepitud loetav arhiiv | Vormidel on viide failikaustale, kuid failide nimekirja andmebaasis ei ole; ilma kataloogita ei saa kontrollida failide olemasolu ega neid üle kanda |
| Kehtiva `Control`-seoseta SP-vormide käsitlus | Sellised vormid säilivad eraldi koondkontrollina; lõplik seos vajab kinnitust või lähteandmete parandust. Leiud on `finding.csv` failis |
| Korduvate vorminumbrite ja puuduvate seoste kontroll | Käivitada [ülevaatuse SQL](client-review/01-problem-forms.sql) ning täita otsused [juhendi järgi](client-review/README.md) |
| Põlvkonnata `soidumeerik=arukas` väärtuste käsitlus | `arukas-2` viiakse `smart_2` alla; ilma numbrita vana väärtuse põlvkonda ei oletata |
| Vanade rikkumiste, tehniliste puuduste ja ADR-/katkestamisandmete lõplik vastendus | Osa lähteandmeid säilib praegu tõendusandmetes, kuid ei ole veel rakenduse vastavates äriväljades. Vastenduse koostab arendus. Puuduva sobiva klassifikaatori korral lisatakse mitteaktiivne ajalooline väärtus; puuduv kirjeldus täpsustatakse hiljem ega vaja enne migratsiooni kliendi kinnitust |

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

## Enne lõplikku üleminekut

Enne üleminekut tuleb lahendada ülal loetletud sisendid ja otsused ning lõpetada
rikkumiste ja teiste äriväljade vastendus. Proovijooksu terviklikkuse kontroll
ei tähenda täielikku kasutajaliidese ega äriandmete vastuvõttu.
