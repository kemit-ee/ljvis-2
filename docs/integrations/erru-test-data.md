# ERRU MOVEHUB testandmete laadimine

See juhend kirjeldab Euroopa Komisjoni MOVEHUB ERRU 3.5 konformsustesti
andmete laadimist LJVIS 2 test- või demokeskkonda.

Testandmed põhinevad paketil **MS Test Pack 3.19**. Kasuta testandmeid ainult
testimiseks. Ära laadi neid toodangukeskkonda.

## Andmestiku sisu

Fail `DSL/Liquibase/test/20261015090000-erru-movehub-test-data.sql` sisaldab
kahte andmehulka:

1. Kõik 59 ametlikku testjuhtumit failist
   `Templates/ERRU3.5 Member State Test Cases version 1.00.xlsx`:
   CGR 18, CTUD 11, NCR 11, NU 11 ja RSI 8 testjuhtumit.
2. 2161 sünteetilist sissetulevat NCR-kirjet. Kirjed põhinevad faili
   `Simulated Test Data/ErruTestData.xml` elementidel
   `RoadTransportUndertaking`, `RoadTransportInfringements` ja
   `RoadTransportPenalties`.

SQL-fail on idempotentne. Kui andmebaasis on `MOVEHUB-` prefiksiga kirjed,
jätab skript impordi vahele.

## Eeltingimused

- Käivita LJVIS 2 Docker Compose'i keskkond.
- Rakenda enne importi rakenduse Liquibase'i migratsioonid.
- Veendu, et käsu sihtandmebaas on test- või demokeskkonna andmebaas.

## Testandmete laadimine

Käivita käsk repositooriumi juurkaustas:

```bash
docker compose exec -T database psql -U ljvis -d ljvis_db \
  < DSL/Liquibase/test/20261015090000-erru-movehub-test-data.sql
```

Fail asub Liquibase'i `test`-kataloogis, kuid Liquibase ei rakenda seda
automaatselt. `docker compose up`, `liquibase update` ja CI `bootstrap` ei
laadi seda andmestikku. Käivita fail ainult käsitsi.

## Impordi kontrollimine

Kontrolli kõigi moodulite kirjete arvu:

```sql
SELECT 'CGR' AS message_type, count(*) AS row_count
FROM erru.cgr_request WHERE business_case_id LIKE 'MOVEHUB-%'
UNION ALL
SELECT 'CTUD', count(*)
FROM erru.ctud_request WHERE business_case_id LIKE 'MOVEHUB-%'
UNION ALL
SELECT 'NCR', count(*)
FROM erru.ncr_message WHERE business_case_id LIKE 'MOVEHUB-%'
UNION ALL
SELECT 'NU', count(*)
FROM erru.nu_message WHERE business_case_id LIKE 'MOVEHUB-%'
UNION ALL
SELECT 'RSI', count(*)
FROM erru.rsi_message WHERE business_case_id LIKE 'MOVEHUB-%';
```

Kontrolli sünteetiliste sissetulevate NCR-kirjete arvu:

```sql
SELECT count(*)
FROM erru.ncr_message
WHERE business_case_id LIKE 'MOVEHUB-NCR-INFR-%';
-- Oodatav tulemus: 2161
```

## MTR mock

MTR mock kasutab staatilisi vastuseid järgmistes Ruuteri marsruutides:

- `DSL/Ruuter/ljvis/POST/v1/erru/mock/mtr/check-community-licence.yml`
- `DSL/Ruuter/ljvis/POST/v1/erru/mock/mtr/check-transport-manager-good-repute.yml`

Hea maine mock valib vastuse nime ja sünniaja või kutsetunnistuse numbri järgi.
Tegevusloa mock valib vastuse `businessCaseId`, ettevõtja nime või tegevusloa
tõestatud koopia numbri järgi. Mock ei loe vastuse koostamiseks andmebaasi.

Staatilised vastused katavad järgmised Test Packi nõuded:

- `Found` ja `NotFound` tulemused;
- nime ja kutsetunnistuse põhised hea maine päringud;
- mitmeosalised ja sidekriipsuga nimed;
- kreeka ja kirillitsa tähemärgid;
- ühe veokorraldaja mitu veoettevõtjat;
- tegevusloa olekud `Active`, `Withdrawn`, `Suspended`, `LostOrStolen`,
  `Returned` ja `Expired`;
- nime, tegevusloa numbri ja sõiduki kombinatsioonid;
- juhtum, kus ettevõtja nimi ja tõestatud koopia number kuuluvad eri
  veoettevõtjatele.

Test Packi `Timeout` ja `NotAvailable` juhtumid kirjeldavad HUB-i käitumist.
Neid juhtumeid teenindab testimisel mock-Hub (`docker/erru-hub-mock`), mis vastab
väljaminevatele CGR, CTUD, NU ja NCR päringutele asünkroonselt. MTR mock ei
tekita HUB-i olekuid.

Mock säilitab CI kontrollväärtused `Mart Tamm`, `EE-CPC-2020-00111` ja
`AS EESTI VEOD`. Muude sisendite korral tagastab mock tulemuse `NotFound`.

### Staatiliste vastuste valimine

Hea maine vastuse valimiseks kasuta järgmist kutsetunnistuse numbrit või nime
ja sünniaega:

| Testjuhtum | Sisend | Põhitulemus |
|---|---|---|
| CGR_01 | `Leah`, `Brauer`, `1931-05-06` | Found |
| CGR_02 | `Nicolai`, `Johansson`, `1933-09-23` | Found |
| CGR_03 | `CPC002848` | Found |
| CGR_04 | `CPC001678` | Found |
| CGR_05 | `NotFound1`, `NotFound2`, `1983-10-11` | NotFound |
| CGR_06 | `NotFound` | NotFound |
| CGR_07 | `Stanislava Ivana`, `Bogatin`, `1979-12-13` | Found |
| CGR_08 | `Simon-Joe`, `Krakovsky-Warshavsky`, `1990-01-31` | Found |
| CGR_11 | `NotFound2`, `NotFound1`, `2000-03-13` | NotFound |
| CGR_12 | `Reymond`, `Nordhagen`, `1959-08-23` | Found |
| CGR_13 | `Αισωπος`, `Μερση`, `1944-11-19` | Found |
| CGR_14 | `Фатима`, `Аксакова`, `1974-11-13` | Found |
| CGR_15 | `CPC001133` | Found, Withdrawn |
| CGR_16 | `CPC000395` | Found, Suspended |
| CGR_17 | `CPC002281` | Found, Active |
| CGR_18 | `Milada`, `Nešporová`, `1974-10-28` | Found, mitu ettevõtjat |

Tegevusloa vastuse valimiseks kasuta `businessCaseId` väärtust `CTUD_01` kuni
`CTUD_11`. `CTUD_04` ja `CTUD_05` on HUB-i juhtumid. Otsepäringu jaoks saab
kasutada ka järgmisi otsinguväärtusi:

| Testjuhtum | Ettevõtja või loa number | Põhitulemus |
|---|---|---|
| CTUD_01 | `Sun Foods` või `CL997078-0001` | Found, Active |
| CTUD_02 | `Auto Works` või `CL148368` | Found, Withdrawn |
| CTUD_03 | `ABC` | NotFound |
| CTUD_06 | `Polk Brothers` või `CL779832` | Found, Active |
| CTUD_07 | `Gas Legion` või `CL961576` | Found, Suspended |
| CTUD_08 | `H.C. Bohack` või `CL762910` | Found, LostOrStolen |
| CTUD_09 | `The Original House of Pies` või `CL86719` | Found, Returned |
| CTUD_10 | `Harmony House` või `CL180620` | Found, Expired |
| CTUD_11 | `CL546110-0002` | Found; loa number määrab ettevõtja |

Sissetulevad ERRU CGR- ja CTUD-vood kasutavad eraldi MTR lookup-marsruute
kaustas `DSL/Ruuter.internal/ljvis/POST/erru/`. Keskkonna konstandid määravad,
kas voog kasutab päris MTR-i või mock-marsruuti.
