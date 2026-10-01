# LJVIS2 X-tee testprotokoll

X-tee teenuste testimise protokoll: mida testiti, millise testiga, millises
keskkonnas ja mis oli tulemus. Teenuste kirjeldused on
[publitseerimise juhendis](00-xtee-teenused-publikatsiooni-juhend.md) ja
masinloetav leping failis [XroadOpenapi.yaml](XroadOpenapi.yaml).

| | |
|---|---|
| Viimase testimise kuupäev | 01.10.2026 |
| Testitud versioon | commit `caa78802` (haru `docs/testidokumentatsioon`, rakenduse kood = PR #497) |
| Keskkond | CI-pinu `docker-compose.ci.yml` (sisemine Ruuter :9089, XTR + X-tee mock), arendaja-mocki liivakast |
| Täielik kontrollide loetelu | [API-testide nimekiri](../testimine/apitestid.md) §3.22–3.23, §5; UI/API testilood [TL-XTP, TL-XTL](../testimine/testilood-ui.md) |

## 1. Kokkuvõte

| Teenuste rühm | Testid | Tulemus |
|---|---|---|
| Pakutavad teenused (9 otspunkti) | Newman 43 juhtumit / 83 kontrolli, Playwright 7 testi, Ruuteri `dsl-test` 18 stsenaariumi (AJ) | kõik läbisid |
| Arendaja-mock (avalik liivakast) | `DSL-mock-tests/xtee.test.yml` 69 stsenaariumi, liivakasti turvakontroll, lepingu drift-kontroll | kõik läbisid |
| Kasutatavad teenused (LJVIS2 → teised registrid) | Newman (ERRU, eToimik, Postkast), Playwright (RR, liiklusregister, äriregister), `dsl-test` (ERRU transport) | kõik läbisid; käsitsi kontrollitud dev keskkonnas; MTR-il automaattest puudub (§4) |

## 2. Pakutavad teenused

Testid kutsuvad sisemist Ruuterit samamoodi nagu turvaserver (päis
`X-Road-Client`, REST/JSON). Iga teenuse juures kontrollitakse kolme asja:
- **ligipääsu**: puuduv või vale kujuga `X-Road-Client` annab 403;
- **sisendi valideerimist**: puuduvad või vigased väljad annavad 400 koos veakoodiga;
- **edukat vastust**: 200 ja vastuse kuju vastab lepingule.

| # | Teenus | Testjuhtumid | Newman | Playwright | Tulemus |
|---|---|---|---|---|---|
| 1 | `IsikuKontroll` | puuduv/vale klient → 403; puuduv/vale isikukood → 400; kehtiv päring → `kontrollid.item[]`; tundmatu isik → tühi loend | 6 juhtumit, 13 kontrolli | TL-XTP-01 | läbis |
| 2 | `IsikuEttevoteKontrollid` | nagu eespool + seotud ettevõteteta isik → tühi loend | 6 / 13 | TL-XTP-02 | läbis |
| 3 | `ErakorralineYVquery` | puuduv/vale klient → 403; puuduv `alates`/`kuni` → 400; `alates > kuni` → 400; tuleviku periood → tühi; kehtiv → `targeted_for_inspection.item[]` | 7 / 15 | TL-XTP-03 | läbis |
| 4 | `ErakorralineYVconfirm` | puuduv/vale klient → 403; tühi `confirmed.item` → 400; puuduv `inspection_id` → 400; lubamatu `code` → 400; tundmatu `inspection_id` → 404 | 6 / 12 | TL-XTP-04 | läbis |
| 5 | `RegisterJobInspection` (v1) | puuduv/vale klient → 403; puuduv kontrollija / vale kuupäev / puuduv `kontrollimised` → 400; kõik väljad → 200; **korduspäring sama `kontrolli_id`-ga → 200 (idempotentne)**; `inspection_type` tuletamine | 8 / 15 | TL-XTP-05 | läbis |
| 6 | `RegisterJobInspection_v3` | puuduv/vale klient → 403; vale `juhi_isikukood` / `menetluse_liik` → 400; ainult v1 väljad → 200; kõik v3 väljad → 200; idempotentsus; v1 ja v3 sama `kontrolli_id` ei põrka | 8 / 15 | TL-XTP-06 | läbis |
| 7 | `findUsage` /v2/findUsage | puuduv `X-Road-UserId` / `userCode` → 400; vale `offset`/`limit`/kuupäev → 400; esindusõigus (`userId` ≠ `userCode`); `EE` eesliide; lehekülgede vahetus; Resql tõrge → 500; OpenAPI kirjeldus serveeritakse | `dsl-test` 14 stsenaariumi | TL-XTP-07 | läbis |
| 8 | `findUsage` /v2/usagePeriod | `periodStart` on alati olemas (ka tühja logi korral); Resql tõrge → 500 | `dsl-test` 2 stsenaariumi | TL-XTP-07 | läbis |
| 9 | `findUsage` /v2/heartbeat | andmebaas vastab → `OK`; andmebaasi rike → `FAIL` | `dsl-test` 2 stsenaariumi | TL-XTP-07 | läbis |

Iga pakutava teenuse päring kirjutatakse X-tee integratsioonilogisse
(`xroad.xroad_integration_log`, teenusekood `xroad.provide.*`). Logi on halduses
nähtav vaates „E-toimiku X-tee logid“ → „kõiki“ (testilugu TL-XTL-08).

## 3. Arendaja-mock (avalik liivakast)

Liidestujatele on avalikult kättesaadav sünteetiliste andmetega mock
(`https://dev.liiklusvalve.ee/developer`, ainult whitelistitud IP-dele).
Juhendid ja artefaktid on kaustas [docs/developer](../developer/README.md):
- [X-tee liidestumine ja turve](../developer/integration.md);
- [teenused ja käivitatavad näited](../developer/services.md);
- [mock ja testtunnused](../developer/mock.md);
- [mocki käivitamine oma masinas](../developer/lokaalne-mock.md);
- [vead ja kasutuselevõtu kontrollnimekiri](../developer/errors.md);
- [OpenAPI ja Postmani kogumik](../developer/artifacts.md).

| Kontroll | Mida tõendab | Tulemus |
|---|---|---|
| `DSL-mock-tests/xtee.test.yml`, 69 stsenaariumi | iga teenuse edukas vastus, puuduv/vale/keelatud klient, puuduv keha, serveri viga; deterministlikud vastused (AJ lehekülgede vahetus, korduspäringud), tervisekontroll ilma seansita | 69/69 läbis |
| `tests/contract/check_xtee_mock.py` | liivakast ei tee päristeenuste kutseid (`call`, `template`, päristeenuste konstandid puuduvad) ega sisalda saladusi | läbis |
| `scripts/generate-xtee-mock.py --check` | mocki leping ei ole OpenAPI-st triivinud | läbis |
| `scripts/generate-xroad-openapi-dsl.py --check` | turvaserverile serveeritav OpenAPI (`GET /ljvis/xroad/provide/openapi`) vastab failile `XroadOpenapi.yaml` | läbis (CI `dsl-lint` job) |

Käivitus: `bash scripts/test-xtee-mock.sh` (sama käsk CI-s).

## 4. Kasutatavad teenused (LJVIS2 → teised infosüsteemid)

Kasutatavaid teenuseid on kontrollitud kahel viisil:

1. **Automaattestid CI-s.** Väliseid registreid asendab XTR-i taga olev X-tee
   mock (`docker/xtr-mock`). Kontrollitakse LJVIS2 poolt: päringu koostamist,
   vastuse ja vea töötlemist ning logimist.
2. **Käsitsi kontroll päris testteenuste vastu.** Kõik allolevad X-tee päringud
   on käsitsi kontrollitud dev keskkonnas (`dev.liiklusvalve.ee`, X-tee
   testkeskkond) kasutajaliidese kaudu. Lisaks on päringuid tehtud arendaja
   masinast ühendusega KeMIT-i dev turvaserverisse (`*.ml.ee` domeenis), et
   kontrollida teenuse lepingut ja vastuseid otse.

| Teenus | Kasutus LJVIS2-s | Automaattestid (CI, mock) | Käsitsi (dev, päris testteenus) | Tulemus |
|---|---|---|---|---|
| Rahvastikuregister (RR, `dde/v1/isikud`, XTR REST) | isiku andmete otsing vormidel | Playwright: TRAM-kaardi RR-otsing ja kliendipoolne isikukoodi kontroll; X-tee logide „kõiki“ vaade (RR päring jõuab logisse) | kontrollitud UI kaudu | läbis |
| Äriregister (`lihtandmed`, `detailandmed`, `esindus`) | ettevõtte otsing nime ja registrikoodi järgi | Playwright: koondvormi ettevõtte nime otsing („ei leitud“ mocki vastusega) | kontrollitud UI kaudu | läbis |
| Liiklusregister (`paring2`) | sõiduki andmete otsing | Playwright: koondvormi liiklusregistri otsing ei vii üldosast ära | kontrollitud UI kaudu | läbis |
| MTR (`soidukikaart`, ühenduse luba, veokorraldusjuhi hea maine) | tegevusloa ja hea maine kontroll | **automaattest puudub** | kontrollitud UI kaudu | läbis käsitsi; automaattest lisamata (testiraport §6) |
| eToimik (`AnnaIsikuKvalifikatsioonid`) | juhi kvalifikatsiooni kontroll, automaatne avalikustamine | Newman `cron-jobs` (kandidaatide valik, otsuse rakendamine, idempotentsus), `tram-control-card` (e-toimiku avalikustamise rada); Playwright: eToimiku X-tee logide vaade | kontrollitud UI kaudu | läbis |
| Postkast 2.0 (XTR kaudu) | teavitused vedajale ja asutustele | Newman `notifications` (saatmine, staatuse kontroll, uuesti saatmine Postkasti mocki vastu), `foreign-violation-form` (teavitus avalikustamisel); `dsl-test` mallide seadistus | kontrollitud UI kaudu | läbis |
| ERRU (MOVEHUB: CTUD, CGR, RSI, NCR, NU) | EL riskiregistrite teated | Newman `erru-*` (5 kollektsiooni, 874 kontrolli) ja `erru-xml-adapter` (55); `dsl-test` NU saatmine (samaaegsus, transpordiviga, ACK), RSI koostamine; NU 3.5 XSD lepingutestid (16 + 29) | kontrollitud UI kaudu | läbis |

## 5. Tulemuste asukohad

- Newmani raportid: `tests/postman/reports/xroad-provide-*.{html,json}` (jooksu
  artefakt) ja Confluence „E2E testitulemused“.
- Playwright: `tests/playwright/tulemus/` ja CI artefakt `playwright-tulemus`.
- Arendaja-mock: `bash scripts/test-xtee-mock.sh` väljund, CI job `dsl-lint`.
