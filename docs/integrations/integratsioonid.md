# Integratsioonide ülevaade

Iga integratsiooni kohta on kolm nõutud osa (HD4 Lisa 6 p.9): **liidese kirjeldus**,
**integratsioonitestid ja veahaldus**, **versioonimine**. Kaardid on kokkuvõtted; detailid on viidatud
dokumentides. Uue integratsiooni lisamisel kasuta [malli](mall.md); versioonireeglid:
[versioonimine.md](versioonimine.md).

| # | Integratsioon | Suund | Protokoll |
|---|---|---|---|
| 1 | [X-tee pakutavad teenused](#1-x-tee-pakutavad-teenused) | sissetulev | X-tee REST |
| 2 | [Andmejälgija (AJ)](#2-andmejälgija-aj) | sissetulev | X-tee REST (RIA v1.6.1) |
| 3 | [X-tee tarbitavad teenused (XTR)](#3-x-tee-tarbitavad-teenused-xtr) | väljaminev | X-tee REST/SOAP läbi XTR |
| 4 | [ERRU (MOVEHUB)](#4-erru-movehub) | mõlemad | XML üle HUB-i (XTR kaudu) |
| 5 | [Postkast 2.0](#5-postkast-20) | väljaminev | X-tee REST läbi XTR |
| 6 | [TARA autentimine](#6-tara-autentimine) | väljaminev | OIDC |
| 7 | [PDF-genereerimine](#7-pdf-genereerimine) | sisemine | HTTP |

---

## 1. X-tee pakutavad teenused

### 1.1 Liidese kirjeldus
LJVIS 2 pakub X-tee kaudu kuut teenust: `IsikuKontroll`, `IsikuEttevoteKontrollid`, `ErakorralineYVquery`,
`ErakorralineYVconfirm`, `RegisterJobInspection` (v1) ja `RegisterJobInspection_v3`.
Pakkuja: `EE/GOV/70001231/ljvis2` (dev `ee-dev`, test `ee-test`). Tarbijad: Transpordiamet, MNT, Tööinspektsioon.
Voog: tarbija → tema turvaserver → LJVIS 2 turvaserver → `ruuter-internal` (`/ljvis/xroad/provide/*`) → Resql → PostgreSQL.
Avalik Nginx neid teid ei serveeri.
- Kirjeldus: [publikatsioonijuhend](../xtee/00-xtee-teenused-publikatsiooni-juhend.md), [liidestumine](../developer/integration.md), [teenused](../developer/services.md)
- Leping: [`XroadOpenapi.yaml`](../xtee/XroadOpenapi.yaml)

### 1.2 Testid ja veahaldus
- Testid: Newman `xroad-provide-query`, `xroad-provide-write`; mock-skeem [`DSL-mock-tests/xtee.test.yml`](../../DSL-mock-tests/xtee.test.yml);
  arendaja-mock ja kollektsioon ([developer/](../developer/README.md), `scripts/test-xtee-mock.sh`); [X-tee testprotokoll](../xtee/08-testprotokoll.md).
- Vead: `MISSING_PARAMETER`/`INVALID_PARAMETER`/`MISSING_HEADER` (400), `FORBIDDEN` (403, `X-Road-Client` puudub), `NOT_FOUND` (404),
  `SERVER_ERROR` (500); kuju `{"error","message"}` ([errors.md](../developer/errors.md)).

### 1.3 Versioonimine
Versioon on X-tee teenusekoodi osa (`…/IsikuKontroll/v1`); `RegisterJobInspection` v1 ja v3 töötavad paralleelselt. Murdv muudatus = uus versioon.

---

## 2. Andmejälgija (AJ)

### 2.1 Liidese kirjeldus
Teenus `findUsage` (lisaks `usagePeriod`, `heartbeat`) RIA Andmejälgija kasutusteabe esitamise protokolli v1.6.1 järgi.
Ainult sissetulevad päringud; andmed on eraldi append-only tabelis `xroad.aj_usage_log` (ADR-005). Otspunktid `/v2/findUsage`,
`/v2/usagePeriod`, `/v2/heartbeat` (`ruuter-internal`). Päring nõuab päist `X-Road-UserId`.
- [Seadistamine](../andmejalgija-seadistamine.md), leping [`FindUsageOpenapi.yaml`](../xtee/FindUsageOpenapi.yaml), [ADR-005](../workingdocs/architecture-decisions.md)

### 2.2 Testid ja veahaldus
- Testid: DSL-testid [`DSL-tests-internal/xroad/aj.test.yml`](../../DSL-tests-internal/xroad/aj.test.yml) (isikukoodi normaliseerimine, kuupäevafiltrid, leheküljestus, vead); X-tee testprotokoll.
- Vead protokolli järgi **ilma ümbriseta**; vigane `offset`/`limit`/kuupäev = 400 `INVALID_PARAMETER`; puuduv `X-Road-UserId` = 400 `MISSING_HEADER`;
  `heartbeat` annab tõrke korral 200 + `{"status":"FAIL"}`.

### 2.3 Versioonimine
Protokolli versioon v1.6.1 on lepingu osa; URL-i prefiks `/v2/`. Protokolli uus versioon = uus leping + kooskõlastus RIA-ga.

---

## 3. X-tee tarbitavad teenused (XTR)

### 3.1 Liidese kirjeldus
Väljaminev X-tee liiklus käib läbi **XTR**-i (`http://xtr:8080`), mis lisab `X-Road-Client` päise ja teeb mTLS-i turvaserverisse.
Kirjeldused kaustas `DSL/xtr/`:

| Süsteem | Teenused (XTR fail) | Kasutus |
|---|---|---|
| Rahvastikuregister (RR) | `rr/isikud` | Isiku andmed |
| Äriregister (AR) | `ar/lihtandmed_v1`, `detailandmed_v1`, `esindus_v1`, `ettevottegaSeotudIsikud_v1` | Ettevõtte andmed, esindusõigus, seotud isikud |
| MTR | `mtr/checkCommunityLicence`, `checkTransportManagerGoodRepute`, `soidukikaart` | Ühenduse tegevusluba, veokorraldaja hea maine, sõidukikaart |
| Liiklusregister | `liiklusregister/paring2`, `yvkehtivus` | Sõiduki päring, erakorralise ülevaatuse kehtivus |
| e-Toimik | `etoimik/AnnaIsikuKvalifikatsioonid` | Otsuste sünk (cron) |

Ruuteri rajad: `/v1/xroad/{rr,arireg,mtr,liiklusregister,etoimik}/…`. X-tee instants ja turvaserver määratakse `xtr.yaml` failis (`xroad_instance`, `security_server`). Ruuteri e-Toimiku seaded: `ETOIMIK_SUBSYSTEM_CODE`, `ETOIMIK_SERVICE_VERSION`.
Dev/CI-s asendavad välised teenused mockid.

### 3.2 Testid ja veahaldus
- Testid: Newman `erru-*` (MTR/Liiklusregistri mockid), `cron-jobs` (e-Toimik ja yvkehtivus, XTR kättesaamatu → protsess ei kuku),
  `citizen-representation` (RR/AR).
- Veahaldus: XTR-i tõrge ei kuku protsessi; cron-tööd on `ignoreFailures: true` + korduskatse (`retryCount`, `retryDelay`);
  tõrke korral korjab järgmine ajastatud jooks kirje üles.

### 3.3 Versioonimine
Iga XTR-fail kirjeldab ühe teenuse versiooni (nt `…_v1`); uus versioon = uus fail ja DSL-i kutse muudatus. e-Toimiku versioon (`v6`) on konfiguratsioon.

---

## 4. ERRU (MOVEHUB)

### 4.1 Liidese kirjeldus
Euroopa Komisjoni ERRU liides (EL Hub, s-TESTA). Sõnumid: **CGR** (hea maine), **CTUD** (tegevusluba), **RSI** (tehnokontrolli teated),
**NCR** (kontrollitulemuse teated), **NU** (sobimatusteated). Väljaminev: Ruuter → XML-adapter (`erru-xml-adapter`) → XTR → Hub.
Sissetulev: Hub → adapter → `ruuter-internal`. RSI ja NCR vastuse sisu tuleb eraldi sissetuleva vastusena; NCR ACK on sünkroonne.
Sissetulevate päringute vastamisel kasutatakse MTR-i ja Liiklusregistrit. Andmed `erru.*`.
- [ERRU NU vahetus](erru-nu-exchange.md), [asünkroonne XML](../architecture/erru-async-xml.md), [XML taaste](erru-xml-recovery.md)
- Leping: [`contracts/erru/3.5`](../../contracts/erru/3.5)

### 4.2 Testid ja veahaldus
- Testid: Newman `erru-cgr`, `erru-ctud`, `erru-ncr`, `erru-nu`, `erru-rsi`, `erru-xml-adapter`; lepingutestid ([`tests/contract`](../../tests/contract/README.md));
  adapteri regressioonitestid ([`tests/erru-adapter`](../../tests/erru-adapter)); SQL-testid ([`tests/sql`](../../tests/sql)) NU valideerimise ja samaaegsuse kohta.
- Veahaldus (NU): täpne kordus tagastab salvestatud tulemuse, muutunud sisu sama sündmuse ID all = 409, kokkusobimatu veateade säilitatakse (HTTP 202);
  DTD/entiteedid lükatakse tagasi; vastuse tähtaega jälgitakse adapteri outbox'is. Taastamine: [XML taaste](erru-xml-recovery.md).
  Acceptance Hubi vastu testimine vajab väliskeskkonda ja on eraldi protokoll.

### 4.3 Versioonimine
ERRU lepingu versioon on kataloog `contracts/erru/<versioon>` (praegu 3.5). Uus EL-i versioon = uus kataloog, adapteri `CONTRACTS_DIR` seadistus, lepingutestid.

---

## 5. Postkast 2.0

### 5.1 Liidese kirjeldus
Väliskanal teavituste jaoks: X-tee REST-teenus `GOV/70006317/postkast` (`notification-management/v1`), läbi XTR-i
(`PK_NOTIFICATIONS_ENDPOINT`, `PK_SENDING_OPERATIONS_ENDPOINT`). Iga saatmine saab unikaalse `notification_key`.
Malli tunnused ja vastuvõtjad on haldusvaates muudetavad. Saatmislogi on append-only.
- [Teavituste spetsifikatsioon](../specs/teavitused-spetsifikatsioon.md), [admin-juhend](../admin-guide/09-teavitused.md), [mallid](../pk2-templates/README.md), [ADR-006](../workingdocs/architecture-decisions.md)

### 5.2 Testid ja veahaldus
- Testid: Newman `notifications`; DSL-testid [`DSL-tests-internal/notification/`](../../DSL-tests-internal/notification); mock-lõpp-punktid dev/CI-s.
- Veahaldus: saatmisstaatuse sünk (cron `notification-status-sync`) nähtav saatmislogis; ebaõnnestunud saatmist saab **muutmata kujul uuesti saata**
  (õigus `notification.resend`), uus rida uue tunnusega, algne kirje jääb.

### 5.3 Versioonimine
Teenuse API versioon on tee osa (`…/v1/…`). Mallid on andmed (append-only ajalooga), mitte kood.

---

## 6. TARA autentimine

### 6.1 Liidese kirjeldus
Kasutaja sisselogimine OIDC-ga (TARA) läbi TIM-i. Seadistus: `TARA_CLIENT_ID`, `TARA_CLIENT_SECRET`, `TARA_REDIRECT_URI` (Kubernetes Secret `tim-tara-credentials`).
Pärast sisselogimist antakse JWT küpsis. Dev/CI-s asendavad TARA-t `tara-mock` ja `dev-login`.
- [Paigaldusjuhend §2.3](../workingdocs/admin-deployment-guide.md)

### 6.2 Testid ja veahaldus
- Testid: Newman kollektsioonid logivad sisse `dev-login` kaudu; Playwright kasutab sama dev-sisselogimist. Päris TARA vastu testitakse käsitsi test-keskkonnas.
- Veahaldus: guard-audit CI-s kontrollib, et iga marsruut on kaitstud; õiguseta kasutaja saab 403 (õiguste testid igas kollektsioonis).

### 6.3 Versioonimine
OIDC standard; TIM-i versioon fikseeritud image'iga (SHA256). Kliendi seadistuse muutus = Secret'i uuendus.

---

## 7. PDF-genereerimine

### 7.1 Liidese kirjeldus
Sisemine mikroteenus `pdf-creator` (`LJVIS_PDF_CREATOR=http://pdf-creator:3020`) Ruuteri taga, X-Internal autentimisega ([ADR-008](../workingdocs/architecture-decisions.md)).
Genereerib vormide PDF-väljaprindid.

### 7.2 Testid ja veahaldus
- Testid: Playwright `print-buttons.spec.ts` ja vormispetsiifilised spec'id (nt `adr-form`, `compound-subforms`, `rsi`) kontrollivad väljaprindi nuppe.
- Veahaldus: PDF-i genereerimine on lugemisoperatsioon, mis vormi andmeid ei muuda; tõrke korral saab väljaprindi uuesti käivitada.

### 7.3 Versioonimine
Sisemine leping; muutub koos rakenduse väljalaskega, image fikseeritud.

---

> **Ülevaatuse märkus.** Kaardid on koostatud koodi ja olemasoleva dokumentatsiooni põhjal. Lepingulised SLA-d,
> kontaktisikud ja pärisintegratsiooni (Hub, Postkast, X-tee test) testiprotokollid täidab integratsiooni omanik
> mallis ([mall.md §4](mall.md)).
