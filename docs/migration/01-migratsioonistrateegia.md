# Migratsioonistrateegia (cutover / rollback)

**Dokumendi eesmärk:** kirjeldada, kuidas LJVIS 1 kontrollvormide andmed viiakse LJVIS 2-sse,
kuidas üleminekuhetk (cutover) toimub ja kuidas vajaduse korral tagasi pöördutakse (rollback).
**Seotud:** HD4 Lisa 6 p.10; [andmekaardistus](02-andmekaardistus.md);
[andmekvaliteet](03-andmekvaliteet.md); ETL-i käivitusjuhend [`DSL/migration/README.md`](../../DSL/migration/README.md).

## 1. Ulatus

| Küsimus | Otsus |
|---|---|
| Allikad | LJVIS 1 SQL Server (`ControlForm`, `ControlFormValue`, `Control`, `ControlToFormBinding`, `ControlDecision`, `User`, `Versions`) ja RavenDB (tööinspektsiooni aktid V1/V2) |
| Sihtkoht | LJVIS 2 PostgreSQL, skeem `forms` (koondvorm + alamvormid, iseseisvad vormid) |
| Vormitüübid | `RoadControlCard2012`, `Roadworthiness2012`, `DangerousDelivery2012`, `TransportInterruption`, `ForeignViolate`, `GoodRepute`, RavenDB `JobInspection`/`JobInspectionV2` |
| Välja jäävad | `FuelSample` (LJVIS 2-s vastet ei ole); `Saved` mustandid; vana auditi sisu ja versioonide ajalugu; kasutajakontod |
| Staatused | `Confirmed` ja `Published` (RavenDB V1-l staatust ei ole, vt kaardistus) |
| Ajapiir | `CUTOFF` kuupäev `.env` failis; skeemis `ControlForm.ControlledDate >= CUTOFF`. Sama kontrolli vanemad `Confirmed`/`Published` osad kaasatakse |
| Manused | Eraldi ülekanne S3-sse: [s3/README.md](s3/README.md); inventuur: [files/README.md](files/README.md) |

Ajapiiri väärtus on avatud otsus (vt peatükk 9).

## 2. Lähenemine

**Ühekordne kontrollitud ülekanne („big bang") külmutatud koopialt.** LJVIS 1 tootmisandmebaasi
ei kirjutata ega lugeda tootmiskoormuse all: ETL töötab SQL Serveri ja RavenDB
**sama ajahetke taastatud koopial**. Põhjused:

- LJVIS 1 ja LJVIS 2 vormimudelid erinevad (EAV → relatsiooniline); paralleelne töö oleks
  topeltsisestus;
- ülekantavad andmed on lõppseisus (`Confirmed`/`Published`), muudatuste ajalugu ei migreerita;
- koopialt töötamine võimaldab proovijooksu piiramatu arvu kordi.

Ülekanne on **kolmeetapiline ETL**: *extract* (lugemine staging-skeemi) → *transform*
(SQL-teisendused ühes transaktsioonis) → *verify* (terviklikkuse ja katvuse kontrollid).
Kõik `forms.*` lisamised, lähte-siht seosed (`migration.form_link`) ja kvaliteedikirjed
tehakse **ühes transaktsioonis**: viga tühistab kõik.

## 3. Etapid ja väravad

| # | Etapp | Sisu | Värav järgmisele (exit-kriteerium) |
|---|---|---|---|
| 0 | Sisendid | Lähteandmete päringud, koopia saamine, RavenDB seis ([migration-guidelines.md](migration-guidelines.md)) | Koopiad kätte, `SOURCE_LABEL` fikseeritud |
| 1 | Vastenduste kinnitamine | Klassifikaatorid, rikkumised, puudused ([violation-mapping-status.md](violation-mapping-status.md)) | Avatud (L1–L3) vastendusi on 0 või iga nende kohta on kirjalik otsus |
| 2 | Proovijooks (rehearsal) | `./run.sh --rehearsal` ühekordsel sihtbaasil | Jooks lõpeb ilma blokeerijateta; aruanne läbi vaadatud |
| 3 | Migratsioonitest | Täielik proovijooks + [kvaliteedikriteeriumid](03-andmekvaliteet.md) + andmeomaniku valimkontroll | [Migratsioonitesti raport](04-migratsioonitesti-raport.md) allkirjastatud |
| 4 | Cutover | Hooldusaken, lõplik jooks, vastuvõtt | Kõik vastuvõtukriteeriumid täidetud |
| 5 | Stabiliseerimine | Järelvalve, parandused | Lõppraport esitatud ([05](05-lopliku-migratsiooni-raport.md)) |

Etapi 3 ja 4 vahel on **go / no-go** otsus, mille teeb andmeomanik (Transpordiamet/KEMIT
vastutaja) kirjalikult.

## 4. Cutover (üleminek)

Kõik sammud tehakse hooldusaknas. Vastutajad täidetakse enne akent (lahtrid allpool).

| Samm | Tegevus | Vastutaja | Kontroll |
|---|---|---|---|
| T-7 p | Kinnitada ajapiir (`CUTOFF`), hooldusaken, vastutajad, go/no-go koosoleku aeg | projektijuht | protokoll |
| T-3 p | Viimane täisprooov uue külmutatud koopiaga; aruanne läbi | arendus + andmeomanik | prooviraport |
| T-1 p | Teavitada kasutajaid hooldusaknast; kinnitada ligipääsud (VPN, õigused) | projektijuht | kinnitused |
| T-0 h | Peatada LJVIS 1 kirjutused ja LJVIS 2 välisteated: X-tee/e-toimiku/ERRU ajastatud tööd (CronManager `enabled`), kasutajate sisselogimine | DevOps | LJVIS 1 vaba kirjutustest |
| T+0 | Võtta LJVIS 1 SQL Serveri ja RavenDB koopiad (või kinnitada külmutatud koopia); fikseerida `SOURCE_LABEL`, `SOURCE_FROZEN=yes` | DBA | koopia tunnus kirjas |
| T+0 | **LJVIS 2 sihtbaasi varukoopia koos sequence'idega** + taastekatse | DBA | taastekatse õnnestus |
| T+1 | `./run.sh` (tavakäik, mitte `--rehearsal`) | arendus | exit 0, `succeeded` |
| T+2 | `./run.sh --verify`; lugeda `summary.json`, `finding.csv`, `disposition.csv`, `quality_report.csv` | arendus | blokeerijaid 0 |
| T+3 | Vastuvõtt: valimkontroll uues UI-s (peatükk 6) | andmeomanik | allkirjastatud kontrollnimekiri |
| T+4 | **Go / no-go.** Go → avada kasutajatele, käivitada välisteadete ajastatud tööd. No-go → rollback (peatükk 5) | andmeomanik | kirjalik otsus |
| T+5 | Manuste ülekanne S3-sse ja kontroll | DevOps | [s3](s3/README.md) aruanne |

Ajavöönd on kõikjal `Europe/Tallinn`. LJVIS 1 jääb **kirjutuskaitsega kättesaadavaks** vähemalt
kokkulepitud stabiliseerimisperioodi lõpuni (vt peatükk 9) ja on tagasipöördumise allikas.

## 5. Rollback (tagasipöördumine)

ETL on projekteeritud nii, et **enne cutover'i punkti (go-otsus) on tagasipöördumine odav**:
LJVIS 1 ei ole kunagi muudetud, LJVIS 2 uus seis on taastatav varukoopiast.

| Olukord | Tegevus | Andmekadu |
|---|---|---|
| ETL jooks ebaõnnestub (exit 1, `failed`) | Transaktsioon on tühistatud, `forms.*` ei muutunud. Paranda põhjus, korda jooksu. Sequence'i vahed on normaalsed | Puudub |
| ETL jooks blokeeritud (exit 2, `blocked`/`needs_review`) | Vorme ei laaditud (`blocked`) või laaditi proovibaasi (`needs_review`). Anna aruanne arendajale ja andmeomanikule; **ära ava kasutajatele** | Puudub |
| Vastuvõtt ebaõnnestub enne go-otsust | **Rollback:** taasta LJVIS 2 sihtbaas T+0 varukoopiast (koos sequence'idega); kontrolli, et `forms.*` ridade arv ühtib T+0 seisuga; jätka LJVIS 1 kasutamist | Puudub (LJVIS 2-s ei olnud enne go-d uusi kasutajaandmeid) |
| Probleem tuleb välja **pärast go-otsust** (kasutajad on LJVIS 2-s juba sisestanud) | Ei rolli täielikult tagasi. Selle asemel: peata vigased vormid, paranda andmed kontrollitud parandusskriptiga (kooskõlastatud andmeomanikuga) või tee `soft delete` + uus ülekanne konkreetsetele vormidele. Täielik rollback on võimalik ainult koos pärast cutover'it sisestatud andmete kaotusega ja vajab andmeomaniku otsust | Sõltub |
| Vigane `CUTOFF` / vale koopia | Taasta sihtbaas puhta varukoopiast, alusta uuesti uue `RUN_ID`-ga | Puudub |

**Keelatud:** `migration.form_link`-i või `migration` skeemi kustutamine, jättes vormid alles
(kaob idempotentsus, tekivad duplikaadid); `--reset` on eemaldatud. Pärast vastenduse
muutmist alustatakse alati puhtast sihtbaasi varukoopiast.

**Rollbacki otsuspunkt:** *go-otsus* (T+4). Selle järel loetakse LJVIS 2 andmete allikaks.

## 6. Vastuvõtt (valimkontroll)

Peale tehniliste kontrollide ([03](03-andmekvaliteet.md)) kontrollib andmeomanik käsitsi:

1. kõigi vormitüüpide katvus (vana vs uus arv, [disposition.csv](../../DSL/migration/README.md));
2. igast vormitüübist ≥ 10 juhuslikku vormi + kõik „probleemvormid" (client-review tabel):
   väljad, rikkumised, osavormid, koondkontrolli seosed, staatus, kuupäevad, autor, number;
3. otsing, vaatamine, PDF-väljaprint, õigused (asutuse piirang);
4. manuste olemasolu valimil.

## 7. Roll ja vastutus

| Roll | Ülesanne |
|---|---|
| Andmeomanik (Transpordiamet / KEMIT vastutaja) | Ulatuse, klassifikaatorite vastenduste, V1 aktide reegli ja ajapiiri kinnitus; go/no-go; vastuvõtt |
| LJVIS 1 haldur / DBA | Koopiad, päringute käivitamine, RavenDB taastamine |
| DevOps | Hooldusaken, ajastatud tööde peatamine, sihtbaasi varukoopia/taastekatse, manuste ülekanne |
| Arendus (täitja) | ETL, proovijooksud, raportid, parandused |
| Projektijuht | Ajakava, kommunikatsioon, otsuste dokumenteerimine |

## 8. Riskid

| Risk | Mõju | Maandus |
|---|---|---|
| Avatud rikkumiste vastendused (L1–L3) | Äriväljad jäävad täitmata, ETL blokeerib | Kinnitused andmeomanikult enne proovijooksu; ajaloolised klassifikaatorid (`LJVIS1_OLD_VIOLATION`) |
| LIVE skeem erineb koopia skeemist | Ekstrakt ei tööta / väljad kaovad | Skeemi DDL küsitakse ette (migration-guidelines p.11); preflight-kontrollid |
| Isikuandmed stagingus | Andmekaitse | Piiratud ligipääs; säilitustähtaeg ja vastutaja kokku leppida; `staging.*` puhastatakse pärast vastuvõttu |
| V1 tööinspektsiooni akti staatuse puudumine | Valesti migreeritud staatus | Andmeomaniku kinnitus reegli kohta |
| Ajapiir (3 vs 5 aastat) | Hanke mittevastavus või liigne maht | Otsus peatükis 9 |
| Hooldusakna ületamine | Teenus pikalt kättesaamatu | Proovijooksuga mõõdetud kestus; rollback-kriteerium: aken ületab kokkulepitud aja |

## 9. Avatud otsused

| # | Otsus | Kelle otsustada | Märkus |
|---|---|---|---|
| D-1 | **Ajapiir: 3 või 5 aastat** | Tellija | Hange: „mitte vanemad kui viis aastat"; ETL ja 22.09.2026 kinnitus: kolm. 5 aasta korral `CUTOFF` = 5 aastat tagasi; maht ja proovijooks tuleb uuesti hinnata |
| D-2 | Mustandid (`Saved`) | Tellija | Praegu välja jäetud |
| D-3 | V1 tööinspektsiooni aktid: lõppakt-reegel | Tellija | ETL käsitleb V1 dokumenti lõppaktina (esialgne reegel) |
| D-4 | Manuste ulatus ja S3 sihtkoht | Tellija + DevOps | [files/](files/README.md), [s3/](s3/README.md) |
| D-5 | LJVIS 1 säilitusaeg kirjutuskaitsega pärast cutover'it | Tellija | Soovitus: ≥ 3 kuud |
| D-6 | Staging-andmete säilitustähtaeg ja vastutaja | Andmekaitse / KEMIT | `staging.*` ja `migration.source_snapshot` sisaldavad isikukoode |
| D-7 | Hooldusakna pikkus ja aeg | Projektijuht | Mõõdetakse proovijooksul |
