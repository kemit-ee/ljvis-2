# XTR: SOAP mõlemas suunas

Kasutame avaldatud `turnerrainer/xtr:0.5.0-rc` pilti. Olemasolevad väljuvate päringute DSL-id (`DSL/xtr`) jäävad kasutusse; SOAP-teenuste pakkumine lisandub samasse XTR-i.

## Kuidas see töötab

- **Sissetulev:** turvaserver → SOAP → XTR → JSON → Ruuter.internal → Resql → vastus sama ühenduse kaudu.
- **Väljuv:** LJVIS2 → JSON → XTR → SOAP → turvaserver / teenusepakkuja → JSON vastus LJVIS2-le.

WSDL kirjeldab sõnumite kuju ja operatsioone. Kõrval olev `.soap.yaml` määrab iga operatsiooni JSON-töötleja ja väljuva päringu sihtkoha. XTR loob HTTP-marsruudid automaatselt. WSDL ei kirjuta rakenduse äriloogikat ega andmebaasipäringuid.

```text
wsdl/ljvis/ljvis.wsdl
wsdl/ljvis/ljvis.soap.yaml
```

Kui WSDL kasutab kohalikke XSD-sid, tuleb need samuti kaasa panna. XTR ei laadi kaugeid XSD-sid internetist. Meie `ljvis.wsdl` pärineb muutmata kujul LJVIS1 lähtekoodi `Ljvis.XTeeService/ljvis.wsdl` failist. Selle kuus operatsiooni on IsikuKontroll, IsikuEttevoteKontrollid, ErakorralineYVquery, ErakorralineYVconfirm, RegisterJobInspection ja RegisterJobInspection_v2. REST v3 jääb eraldi REST-lepinguks.

## Millised senised teed jäävad vajalikuks?

- `DSL/Ruuter.internal/.../xroad/provide` JSON-töötlejad jäävad alles: XTR kutsub neid ning päringute SOAP-vastuse teisendaja kutsub omakorda olemasolevaid REST-päringuid. Neid ei tohi SOAP-i lisamisel kustutada.
- `RegisterJobInspection_v3` ja AJ `/ljvis/xroad/v2/*` ei kuulu sellesse WSDL-i; nende REST-lepingud ja OpenAPI jäävad kehtima. Olemasoleva REST-teenuse avaldamise lõpetamine vajab tarbijate ülemineku kinnitust.
- `LJVIS_XTR` ja `LJVIS_RUUTER_INTERNAL` jäävad kasutusse. Kasutamata `XROAD_SECURITY_SERVER` ja `XROAD_INSTANCE` Ruuteri konstandid on eemaldatud; vastavad XTR-i seaded on `security_server` ja `xroad_instance`.
- Compose'i `ruuter-internal` hostipordid `8089` / `9089` on endiselt kohalike REST-testide jaoks. Need ei ole uus SOAP-aadress. CI `xtr` mock teenindab muid väliseid sõltuvusi; eraldi `xtr-inbound` käivitab päris XTR-i SOAP-testid.

## Kordussaatmine ja samaaegsus (RegisterJobInspection, RegisterJobInspection_v2)

Akti identiteet on **leping + saatja ID**: tabel `forms.labour_inspection_external_ref` (`xroad-v1`, `xroad-v2`, `xroad-v3` + `kontrolli_id`). Sama numbriline ID eri lepingutes on eri akt. `forms.labour_inspection_form` on snapshot-tabel (mitu rida ühe akti kohta), seega unikaalsust seal ei kontrollita. Kirjutamine käib ühe atomaarse funktsiooniga `forms.register_external_labour_inspection`: kaotanud samaaegne päring ootab võitja commit'i ja leiab seejärel sama akti.

**Samaaegsed kirjutajad ühel aktil (UI, e-toimik, X-tee).** Kasutatakse kõigi vormide ühist kaitset (`revision`, unikaalne `(võti, revision)`, changeset `20261208100000`): iga kirjutaja lisab rea numbriga `latest.revision + 1`. Kui kaks kirjutajat lähtuvad samast seisust, salvestub ainult esimene. X-tee kordus püüab teise kirjutaja unikaalsusrikkumise kinni ja otsustab värske seisu pealt uuesti (nt vahepeal kinnitatud akt → 409). UI saab `409 form_modified` („vormi muutis vahepeal keegi teine“), e-toimik proovib järgmisel sünkroonimisel. Nii ei saa kinnitatud akt X-tee korduse tõttu tagasi `saved`-iks minna ega X-tee muudatus vaikselt vanade andmetega üle kirjutada.

| Olukord | v1 / v2 (SOAP ja REST v1) | REST v3 |
|---|---|---|
| Esimene päring | Uus akt, `confirmed`, versioon 1 | sama |
| Täpne kordus | `Success`, uut rida ei lisata | olemasolev akt |
| Muudetud sisu (akt on `confirmed` / `published` / `deleted`) | HTTP 409 → SOAP `Client` Fault, midagi ei salvestata | olemasolev akt |
| Akt on arhiveerimisel töö-baasist eemaldatud (`purge`) | täpne kordus `Success`; muudetud → 409 (`archived`), uut akti ei looda | olemasolev (arhiveeritud) akt |
| Samaaegsed päringud | üks akt; muudetud päringud rakendatakse järjest | üks akt |
| Samal ajal kinnitab/kustutab kasutaja UI-s | 409, kui UI jõudis enne; muidu salvestub X-tee muudatus ja UI saab `form_modified` | olemasolev akt |

**Erinevus LJVIS1-st:** LJVIS1 `RavenDbManager.StoreOrUpdateJobInspection(JobInspectionV2)` uuendas sama `InspectionId`-ga dokumenti igas staatuses ja määras staatuse (`Saved`, ilma menetluse viitenumbrita `Published`). LJVIS2 loob sissetulevad aktid alati `confirmed`-staatuses (nii saab e-toimiku sünkroonimine neid kohe töödelda, vt `apply_etoimik_decision.sql`) ja lukustatud akti X-tee kaudu ei muudeta: muudetud kordus tagastab 409. See on **mitte täielik ühilduvus** LJVIS1-ga, kus sama `InspectionId` uuendas dokumenti igas staatuses.

**Migratsioon:** LJVIS1 RavenDB V2 aktid seotakse `xroad-v2` + `InspectionId`-ga (`DSL/migration/sql/07-transform-labour-inspection.sql`), seega hilisem `RegisterJobInspection_v2` sama ID-ga leiab migreeritud akti (kinnitatud → 409, duplikaati ei teki). V1 Raven dokumendi ID on LJVIS1 sisemine järjenumber, mitte saatja `kontrolli_id`; V1 aktidele seost ei looda. Kui sama `InspectionId` on enne migratsiooni juba X-tee kaudu LJVIS2-sse saabunud, peatab eelkontroll jooksu leiuga `external_id_already_received`.

## Vead

| Ruuter.internal | SOAP-vastus (XTR) | Millal |
|---|---|---|
| 400 / 403 / 404 JSON | `Client` Fault, `faultstring` sisaldab HTTP koodi ja teadet | sisendi viga, puuduv `X-Road-Client` |
| 409 `CONFLICT` | `Client` Fault | muudetud kordus lukustatud aktile |
| 500 JSON | `Server` Fault | töötleja või andmebaasi viga |
| 502 `BACKEND_ERROR` | `Server` Fault | päringutöötleja vastas veaga ilma JSON-kehata |
| 502 `INVALID_BACKEND_RESPONSE` | `Server` Fault | päringutöötleja edukas vastus ei vasta WSDL-ile (puuduv kohustuslik kuupäev, tundmatu enum-väärtus, mitte-JSON) |

Päringuoperatsioonide adapterid (`DSL/Ruuter.internal/ljvis/POST/xroad/soap/isiku-kontroll.yml`, `isiku-ettevote-kontrollid.yml`, `erakorraline-yv-query.yml`) kutsuvad olemasolevat REST-töötlejat ja teisendavad vastuse WSDL-i kujule (camelCase → WSDL väljad, `soiduki_nimi`, `Kontrollid`, kuupäev → dateTime, täpsustusvalikute enum). Need asuvad teel, mida X-tee REST HTTPRoute (`/ljvis/xroad/provide/*`) ei ava, ning neil on oma `X-Road-Client` guard. Adapterid ei asenda puuduvaid kohustuslikke väärtusi ega jäta ridu vahele: osalist `Success`-i ei anta. 502 vead logitakse `xroad.xroad_integration_log`-i (`service_code = xroad.soap.<operatsioon>`) ainult operatsiooni, HTTP-koodi ja X-Road sõnumi ID-ga, ilma päringu/vastuse sisu ja isikuandmeteta. XTR ei lisa 5xx `faultstring`-i sisemisi üksikasju.

## Kohalik dev

`docker-compose.yml` kasutab uut pilti, olemasolevat turvaserveri konfiguratsiooni ning WSDL-kausta.

```bash
docker compose up -d xtr ruuter-internal
```

| Suund | Aadress |
|---|---|
| SOAP sisse | `http://localhost:9011/soap-in/ljvis/ljvis` |
| WSDL | `http://localhost:9011/soap-in/ljvis/ljvis?wsdl` |
| JSON välja | `http://localhost:9010/soap-out/ljvis/ljvis/IsikuKontroll` |
| Senine DSL-päring | `http://localhost:9010/mtr/checkCommunityLicence` jm |

```bash
curl -X POST http://localhost:9010/soap-out/ljvis/ljvis/IsikuKontroll \
  -H 'Content-Type: application/json' \
  -d '{"request":{"isikukood":"39001010001"}}'
```

Dev-is läheb väljuv päring seadistatud turvaserverisse; ligipääs eeldab kehtivat sertifikaati, turvaserveri ühendust ja teenuse kasutusõigusi. Teststendis on sihtkohaks kohalik SOAP-otspunkt.

## Teststend

Täisproov puhta CI andmebaasiga (olemasolev `run-all.sh` eemaldab CI projekti vanad konteinerid ja mahud):

```bash
# Vajalikud: Docker Compose, Python 3 + PyYAML, xmllint, Newman ja run-all.sh-i raportipluginad.
# XTR SOAP testid on osa tavalisest käigust (ka GitHub CI-s).
tests/postman/run-all.sh
```

Üksnes XTR-i testid olemasoleva CI teststendi kõrval:

```bash
docker compose -f docker-compose.ci.yml -p ljvis-ci up -d --build ruuter-internal resql-ljvis xtr-inbound

docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < tests/xtr/seed.sql

mkdir -p tests/postman/reports
newman run tests/postman/collections/xroad-soap-inbound.collection.json \
  -e tests/postman/ci-stack-environment.json -r cli,json \
  --reporter-json-export tests/postman/reports/xroad-soap-inbound.json

python3 tests/xtr/verify.py --report tests/postman/reports/xroad-soap-inbound.json \
  -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db
```

CI-stendi teenus `xtr-inbound` (`docker-compose.ci.yml`) on päris avaldatud XTR; teenus `xtr` on endiselt mock muude väliste sõltuvuste jaoks. Teststendi SOAP-port on `9095`; sisemine JSON-port on `9094`. CI `.soap.yaml` suunab väljuva päringu tagasi sama XTR-i sisenevale pordile. Testides kasutatakse päris avaldatud XTR-i, Ruuter.internal-i, Resql-i ning eraldi sünteetilist PostgreSQL-i; turvaserverit ei kutsuta.

Kontrollitakse kõigi kuue operatsiooni sisenevat SOAP-liidest ja väljuvat JSON → SOAP → LJVIS2 → SOAP → JSON ringi, päiseid, vigu, portide eraldatust ja kordussaatmist. `verify.py` valideerib edukate sisenevate kutsete päringud/vastused WSDL-i XSD järgi ja võrdleb salvestatud tööinspektsiooni andmeid saadetud loendurite, rikkumiste ja menetlusandmetega. SOAP päiste X-Road XSD import ei ole selle võrguühenduseta kehavalidatsiooni osa.

Kordussaatmise, samaaegsuse, migratsiooni ja vastuse teisendaja testid (käivitab ka `run-all.sh`):

```bash
C="docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db"

# Täpne/muudetud/lukustatud kordus, 16 samaaegset päringut, REST v3, v1 inspection_type,
# RavenDB V2 → ETL → SOAP kordus.
python3 tests/xtr/repeat_test.py --soap-url http://localhost:9095 --rest-url http://localhost:9089 \
  --resql-url http://localhost:9087/ljvis -- $C

# xroad/soap/* adapterid vigaste taustvastuste vastu (JSON 4xx/5xx, tühi ja tekstikeha, WSDL-ile mittevastav 200).
# Käivitab ajutise ruuter-internal konteineri, mille LJVIS_RUUTER_INTERNAL osutab kohalikule mockile.
python3 tests/xtr/bridge_test.py --image ljvis-ci-ruuter-internal --network ljvis-ci_ljvis-ci -- $C

# Samaaegsed kirjutajad ühel aktil (UI update.sql/delete.sql, e-toimik, X-tee kordus).
python3 tests/xtr/race_test.py -- $C
```

## Järgmise WSDL-i lisamine

1. Pane WSDL ja kohalikud XSD-d kausta `docker/xtr-inbound/wsdl/<grupp>/`.
2. Lisa sama nimega `.soap.yaml`:

```yaml
dsl: false
inbound:
  operations:
    SomeOperation:
      backend: http://ruuter-internal:8080/ljvis/path/to/handler
  payload: request
  request_pointer: /request
  response_pointer: /response
  response_wrap:
    request: request
    response: backend
outbound:
  # Kui puudub url, kasutatakse WSDL-i soap:address-i.
  # TURVASERVER asendatakse xtr.yaml-i security_server-iga.
  xroad_service:
    member_class: GOV
    member_code: "70001231"
    subsystem_code: ljvis2
```

`request_pointer` ja `response_wrap` on LJVIS-i lepingu jaoks; teise WSDL-i korral tuleb need kohandada selle sõnumistruktuurile. `xroad_service` peab kirjeldama tegelikku sihtteenuse pakkujat. Ilma sissetuleva backend-ita ei saa operatsioon ärilist vastust anda. Kui JSON-struktuurid erinevad, lisa väike teisendus Ruuterisse.

XTR järgib XSD struktuuri, kuid ei valideeri kõiki kohustuslikke välju ega enum-väärtusi. Rakenduse sisendikontroll ja lepingu testid jäävad vajalikuks.

## Tootmisse paigaldus

**Image.** `docker/xtr/Dockerfile` (GitLab `image-build`, nimi `xtr`) põhineb `turnerrainer/xtr:0.5.0-rc` digestil ning sisaldab `DSL/xtr` → `/DSL` ja `docker/xtr-inbound/wsdl` → `/wsdl` (failid loetavad mitte-root `xtr` kasutajale). Kontrolli pärast ehitamist, et XTR-i logis on `inbound SOAP endpoint registered … operations=[…6 operatsiooni…]`.

**`xtr.yaml` (paigalduskeskkonna konfiguratsioon, mitte see repo):**

```yaml
dsl_path: /DSL
wsdl_watch_dir: /wsdl
inbound:
  port: 8081
  public_base_url: https://<turvaserverile nähtav SOAP-aadress>   # ?wsdl soap:address
security_server:              # kohustuslik: ilma selleta XTR ei käivitu (WSDL-i aadress on TURVASERVER)
  url: https://<turvaserver>/
  keystore_path: …
  keystore_password_env: XTR_KEYSTORE_PASSWORD
  trust_ca_path: …             # TÄPSELT üks sertifikaat: turvaserveri oma või selle CA (XTR loeb ainult esimese)
xroad_instance: ee-dev | ee-test | ee
client_data: { member_class: GOV, member_code: "70001231", subsystem_code: ljvis2 }
```

`trust_ca_path` failis peab olema üks sertifikaat. XTR (`reqwest::Certificate::from_pem`) loeb ainult faili esimese sertifikaadi: 143 sertifikaadiga `ca-bundle-with-cammy.pem` (turvaserver viimasena) andis 05.10.2026 dev-is ja test-is TLS-vea kõigil radadel, `cammy-server.crt` / `urien-server.crt` töötasid (vana DSL, REST, `/soap-out`). Varasem `SSL_CERT_FILE` keskkonnamuutuja eemaldati — see asendas kogu protsessi usaldusloendi.

Tootmise `xtr.yaml`-is **ei tohi** olla `wsdl.allow_http_upstream: true` ega `wsdl.upstream_host_allowlist` kirjet `localhost` — need on ainult CI loopback'i jaoks (`docker/xtr-inbound/xtr.yaml`). Väljuv SOAP läheb ainult turvaserverisse (`https`, mTLS).

**Võrk.** Vt [võrguühendused](../architecture/vorguyhendused-network-policy.md):

- turvaserver (Traefik `xroad` Gateway) → `xtr:8081` — ainult `/soap-in/` ja `/health`. Eraldi Kubernetes Service ei ole kohustuslik; sobib ka olemasoleva Service'i teine port, kui sissepääs on piiratud.
- `xtr` → `ruuter-internal:8080` (`/ljvis/xroad/provide/*` kirjutavad töötlejad, `/ljvis/xroad/soap/*` päringute adapterid). `/ljvis/xroad/soap/*` ei tohi olla X-tee REST HTTPRoute'is.
- `ruuter`, `ruuter-internal` → `xtr:8080` (senised väljuvad päringud). Port 8080 ei tohi olla turvaserverile ega avalikult nähtav; `XTR_INTER_SERVICE_TOKEN` piirab `/:group/:service` tee.

XTR kopeerib X-Road päised SOAP-ist, kuid ei autentiseeri saatjat ise; Ruuteri `.guard` kontrollib `X-Road-Client` vormingut. Päisele saab tugineda ainult siis, kui port 8081 on kättesaadav üksnes turvaserverile.

**Turvaserver.** Registreeri `?wsdl` aadressilt SOAP-teenuse kirjeldus ja anna õigused konkreetsetele tarbijatele. Enne sisselülitamist sõelu üle tegelik registreering (subsystem, teenusekoodid ja versioonid, sh olemasolevad REST-teenused samade koodidega), tarbijate õigused, mTLS ja avalik SOAP-aadress. Säilinud SOAP-struktuur ei tähenda LJVIS1 muutumatut aadressi ega teenuse ID-d; olemasolevaid REST-publikatsioone ei eemaldata enne tarbijate ülemineku kinnitust.

Kohalik ringtest kinnitab sõnumite teisenduse ja rakenduse töötlemise. Päris turvaserveri mTLS, registreerimine ja kasutusõigused vajavad eraldi keskkonnatesti.

## Kontrollitud tulemus

05.10.2026: avaldatud pildiga eraldi `ljvis-xtr-review` teststendis läbis SOAP-kollektsioon 118 kontrolli ilma vahelejäetud testideta. Kümme edukat SOAP-päringu/vastuse paari valideeriti XSD-ga; viis salvestatud tööinspektsiooni näidet kontrolliti andmebaasist. V1/v2 kordussaatmine ei loonud duplikaate. Olemasolevad REST-pakkujate kollektsioonid läbisid 41 + 42 kontrolli. Varasem käsitsi kirjutatud MTR `checkCommunityLicence` DSL renderdas päringu ja dekodeeris vastuse sama XTR-pildiga kohaliku SOAP mocki vastu.

Parandatud lepinguerinevused: Resql-i camelCase → vana WSDL-i väljad, `soiduki_nimi`/`soiduki_perekonnanimi`, suur algustäht `Kontrollid`, kuupäev → dateTime, kohustuslike stringide tühiväärtused ning tehnokontrolli täpsustusvalikute WSDL enum-id. V2 saab oma töötleja: algne S/V, `koostatud_ettekirjutus`, korduvad rikkumised ja pesastatud menetlusandmed. V1 nullidega reisijaloendurid ei tähenda enam automaatselt reisijatevedu.

05.10.2026 (parandused): eraldi sünteetilises `ljvis-xtr-fix` teststendis (`docker-compose.ci.yml` koos teenusega `xtr-inbound`; avaldatud `turnerrainer/xtr:0.5.0-rc`, Ruuter.internal, Resql, PostgreSQL 17):

- SOAP-kollektsioon 118/118 ja `verify.py` (10 XSD-paari, 5 salvestatud akti registri kaudu); REST-pakkujad 42 + 41; `labour-inspection` UI-kollektsioon 51/51 (`update.sql` hoiab nüüd `external_inspection_id`-d alles).
- `repeat_test.py` 55 kontrolli: täpne, muudetud ja lukustatud kordus v1/v2 (409 → `Client` Fault, midagi ei salvestata); 16 samaaegset identset esmast päringut → üks akt (v1, v2); 8 samaaegset erineva sisuga päringut → kõik 8 rakendatud ühe akti snapshot'idena; REST v3 12 samaaegset → üks akt, leping muutmata; v1 `inspection_type` 8 loendurikombinatsiooni; arhiveerimisel eemaldatud akti muudetud kordus → 409 (`archived`), uut akti ei teki; sünteetiline RavenDB V2 → `07-transform-labour-inspection.sql` → SOAP kordus leiab migreeritud akti; sama numbriline ID v1/v2 lepingus jääb kaheks aktiks.
- `race_test.py` 16 kontrolli (pärast dev-i `revision` mehhanismiga ühendamist 06.10.2026, sh optimistlik lukk `form_modified`): samaaegne UI kinnitus/kustutamine vs X-tee muudetud kordus (mõlemas järjekorras), kaks UI salvestust, e-toimik vs UI — ajalugu ei hargne, kinnitus ei kao, X-tee muudatust ei kirjutata vanade andmetega üle (dev-i `revision` mehhanism).
- `bridge_test.py` 16 kontrolli (`xroad/soap/*` adapterid, sh oma `X-Road-Client` guard); päris XTR-i kaudu käsitsi: Ruuteri 500 ja 502 → `SOAP-ENV:Server` Fault (`backend returned HTTP 5xx`, ilma sisemise teateta).
- Liquibase changeset `20261209100000` (tabel + funktsioon): rakendamine puhtale baasile, rollback ja uuesti rakendamine. Olemasolevate ridade seostamist ei tehta — enne seda muudatust ei olnud ühtegi X-tee kaudu saabunud akti.
- `docker/xtr/Dockerfile`-ist ehitatud image (sama digest Docker Hubist; Harbor ei olnud testmasinast kättesaadav) käivitus ilma checkout'i mount'ideta: 6 operatsiooni, `?wsdl` avalik aadress, portide eraldus, päris `IsikuKontroll` ja `RegisterJobInspection_v2` Ruuter.internal-i kaudu.

Kontrollimata: päris turvaserveris meie SOAP-teenuse registreerimine ja õigused (TLS/mTLS cammy ja urien vastu kontrollitud 05.10.2026), GitLab/Harbor ehitus, tootmise `xtr.yaml`/Kubernetes ressursid (väline devops-repo), päris LJVIS1 RavenDB andmed (test kasutas sünteetilisi dokumente).
