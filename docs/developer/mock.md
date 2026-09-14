# Arendaja-mock ja testimine

## Käivitamine

Tavapärases lokaalses süsteemis:

```bash
docker compose up -d --build ruuter frontend
curl --fail http://localhost:3001/developer/health/ready
```

Mock on projektis `DSL/Ruuter/xtee-mock`. Dockerfile kopeerib selle olemasolevasse Ruuteri pilti ja Compose mountib selle sama instantsi kõrvale.
Nginx suunab välise `/developer/` prefiksi sisemisele `/xtee-mock/` prefiksile, jättes ülejäänud tee alles.

Dev-keskkonnas mountitav frontend ConfigMap asendab pildi `nginx.conf` faili. Avalikuks juurutuseks peab sama `/developer/` reegel sisalduma ka keskkonna Nginxi konfiguratsioonis. Rakenduse PR üksi ei lisa seda mountitud konfiguratsiooni.

Avalik tervisekontroll:

```bash
curl --fail https://dev.liiklusvalve.ee/developer/health/ready
```

Edukas vastus on `{"status":"OK","mock":true}`. HTML-vastus või 404 ei ole töötav mock.

## Testtunnused

Allpool kirjeldatud andmeväljad asuvad lahtiparsitud `response` sisus. Teenuste HTTP-keha säilitab päris teenuste Ruuteri ümbrise; klient loeb seda `JSON.parse(body.response)` abil. Tervisekontroll tagastab otse JSON-objekti.

| Tunnus | Tulemus |
|---|---|
| `isikukood=60001019906` | Isiku- ja ettevõttepäring tagastavad kaks sünteetilist kirjet |
| Muu vormingult korrektne isikukood, nt `60001019907` | Tühi kontrollide loend, HTTP 200 |
| `alates=2026-06-01`, `kuni=2026-06-30` | Kaks erakorralise ülevaatuse kirjet |
| Vahemik, mis ei sisalda 14.–15.06.2026 | Tühi sõidukite loend |
| `inspection_id=900001` või `900002` | Kinnitamine õnnestub; salvestamist ei toimu |
| Muu `inspection_id`, nt `999999` | HTTP 404 `NOT_FOUND` |
| `kontrolli_id=900001` | Sünteetiline töökontroll; kõik lepingule vastavad ID-d saavad sama eduka vastuse |
| `userCode=60001019906` ja sama `X-Road-UserId` | Kolm fikseeritud AJ kasutuskirjet |
| Muu `userCode` ja sama `X-Road-UserId` | Tühi AJ vastus |
| `X-Road-Client: ee-dev/GOV/70000000/denied` | POST puhul HTTP 403, mocki keelatud tarbija |
| `X-Mock-Scenario: empty` | Lugemisteenustel tühi tulemus; `usagePeriod.periodStart=null` |
| `X-Mock-Scenario: server-error` | Taustapäringuga teenustel HTTP 500 `SERVER_ERROR`; `heartbeat` jääb 200 |

`X-Mock-Scenario` ei jäta valideerimist ega päisekontrolli vahele. Kirjutamisteenused ignoreerivad `empty` stsenaariumi.

Esimene sõidukikirje sisaldab kõiki kaardistatud välju ja kõiki täiendusvalikuid. Teine sisaldab null-väärtusi ja tühje massiive.
Päris mapper väljastab need vastuseväljad alati: nende kunstlikku puudumist mock ei tekita. Valikuliste **päringuväljade puudumist** näitab v3 minimaalne testjuht.

## AJ leheküljestus

Pollimist LJVIS-i pakutavates teenustes ei ole. `findUsage` toetab `offset`, `limit` (vaikimisi 0 ja 1000, ülempiir 1000) ning `periodStart`/`periodEnd` filtreid.
Kirjed on ajaliselt kahanevas järjekorras. Lehekülgede 0, 1 ja 2 päringuks kasuta `limit=1`, seejärel `offset=3` annab tühja lehe.
Praegune päris SQL kasutab `COUNT(*) OVER ()`: kui leht on tühi, annab mapper **`totalUsages=0`**, mitte varasemate lehtede koguarvu. Mock matkib ka seda käitumist.
Negatiivsete/mittearvuliste offset/limit väärtuste ning vigaste kuupäevade SQL-tasemel vigade detailset käitumist mock ei emuleeri; kasuta kehtivaid väärtusi.

```bash
curl --fail 'http://localhost:3001/developer/xroad/v2/findUsage?userCode=60001019906&offset=1&limit=1' \
  -H 'X-Road-UserId: 60001019906'
```

## Testid ja lepingu sünkroonimine

```bash
python3 scripts/generate-xtee-mock.py --check
python3 tests/contract/check_xtee_mock.py
bash scripts/test-xtee-mock.sh
```

Generaator kopeerib ainult üheksa lubatud pakutava teenuse valideerimise ja kaardistamise töövoogu. Kõik `http.*` sammud, sh audit, asendatakse mälus olevate vastustega.
Päris lepingu muutmisel käivita `python3 scripts/generate-xtee-mock.py` ja vaata genereeritud diff üle.

Testid käivad päris Ruuteri `dsl-test` runtime'is, kirjutuskaitstud failidega, ilma välisvõrguta ja ilma `constants.ini` või keskkonnafailide mountimiseta.
CI kontrollib ka seda, et mock ei sisalda `call`, `template` ega päristeenuste konstante. Mõlemad CI torud käivitavad sama testiskripti.

## Piirangud

- Ei ole eraldi instants: mock jagab Ruuteri protsessi ja ressursse päris avaliku rakendusega. Projekti eraldamine ei ole konteineri- ega võrguisolatsioon.
- Mocki DSL ei tee ühtegi väljaminevat päringut. Ühise Ruuteri globaalset outbound-poliitikat ei muudeta, sest rakendus vajab oma taustateenuseid.
- Salvestamist, auditikirjete loomist, tegelikke õigusi ega pärisandmeid ei ole; korduspäring on deterministlik, mitte andmebaasi idempotentsuse test.
- Päris kinnitusteenus töötleb SQL-uuendused järjestikku. Mock ei tõenda andmebaasitehingu atomaarsust ega rollback'i.
- Turvaserveri mTLS-i, sõnumipäiseid, signatuure ja turvaserveri enda veakehasid mock ei emuleeri.
- Valideerimine lähtub olemasolevast rakenduse DSL-ist, mitte täielikust X-tee või JSON Schema validaatorist.
