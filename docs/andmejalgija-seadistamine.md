# Andmejälgija (AJ) seadistamine LJVIS-is

Juhend kirjeldab kuidas seadistada LJVIS-i andmejälgija liides, mis võimaldab
isikutel eesti.ee kaudu pärida, kes nende andmeid LJVIS-is on töödelnud (IKS § 19, § 25).

---

## 1. Taust

Andmejälgija (AJ) on RIA koordineeritud infrastruktuur, mis kogub andmekogudelt
kasutusteabe kirjeid ja kuvab neid isikule eesti.ee portaalis. LJVIS peab realiseerima
**Andmejälgija kasutusteabe esitamise protokolli v1.6.1** (31.08.2026): üks X-tee REST
teenus koodiga `findUsage`, millel on kolm kohustuslikku otspunkti `/v2/findUsage`,
`/v2/usagePeriod` ja `/v2/heartbeat`.

Spetsifikatsioon: https://github.com/e-gov/AJ/blob/master/doc/spetsifikatsioonid/Kasutusteabe_esitamise_protokoll.md

LJVIS-i leping: [`docs/xtee/FindUsageOpenapi.yaml`](xtee/FindUsageOpenapi.yaml).

---

## 2. Arhitektuur

```
eesti.ee → X-tee turvaserver (LJVIS) → ruuter-internal:8080/ljvis/xroad/v2/...
                                                    ↓
                                           resql → xroad.aj_usage_log
```

**Kirjete allikas:** inbound X-tee teenused kirjutavad automaatselt AJ kirjeid:

| Teenus | Millal logitakse |
|--------|-----------------|
| `xroad.provide.isiku-kontroll` | Iga eduka päringu korral |
| `xroad.provide.isiku-ettevote-kontrollid` | Iga eduka päringu korral |
| `xroad.provide.register-job-inspection-v3` | Eduka sisestuse korral, ainult kui `juhi_isikukood` esitati |

Lisaks logivad LJVIS-i **väljaminevad** X-tee päringud ja toimingud, mis puudutavad
konkreetse isiku andmeid:

| Päring / toiming | `action` tekst | Millal logitakse |
|--------|----------------|------------------|
| Rahvastikuregister `rr/domesticDataExchange/v1/isikud` (`DSL/Ruuter/ljvis/POST/v1/xroad/rr/isikud.yml`) | „Järelevalve käigus isiku andmete päring rahvastikuregistrist" | Iga päringu korral — nii leitud, „ei leitud" kui ka ebaõnnestunud RR-vastuse puhul |
| Äriregistri esindusõigused (`DSL/Ruuter/ljvis/POST/v1/xroad/arireg/esindus.yml`) | „Äriregistrist esindusõiguste pärimine ettevõtte liiklusjärelevalve teekontrolli käigus" | Iga päringu korral |
| Veokorraldaja hea maine (`DSL/Ruuter/ljvis/POST/v1/xroad/mtr/check-transport-manager-good-repute.yml`) | „Maanteeametist veokorraldaja hea maine kontrollimine liiklusjärelevalve teekontrolli käigus" | Iga päringu korral |
| Koondvormi kinnitamine (`DSL/Ruuter/ljvis/POST/v1/control-forms/compound-form/edit/confirm.yml`) | „Juhi isikuandmete registreerimine liiklusjärelevalve teekontrolli protokollis (koondvorm kinnitatud)" | Iga juhi kohta, kelle isikukood on täidetud |

LJVIS2 enda toimingute (väljaminevad päringud, koondvormi kinnitamine) kirjetes on
töötlejaks LJVIS2 vastutav töötleja **Kliimaministeerium**: `receiverCode` = `70001231`,
`receiverName` = „Kliimaministeerium", `receiverSystem` = „Liiklusjärelevalve infosüsteem (LJVIS2)".
Inbound teenuste kirjetes on `receiverCode` X-tee tarbija liikmekood ja `receiverSystem`
tema alamsüsteem.

Isikukood salvestatakse alati **ilma** `EE` eesliiteta (11 numbrit) — `log_usage.sql`
eemaldab eesliite, kui see kaasa antakse.

---

## 3. X-tee turvaserveri seadistamine

### 3.1 Teenuse lisamine

Turvaserveri haldusliidesesse (`https://<turvaserver>:4000`) tuleb lisada **üks** REST teenus:

| Väli | Väärtus |
|------|---------|
| Teenuse tüüp | REST (OpenAPI 3 kirjeldus URL-ilt) |
| Kirjelduse URL | `http://ruuter-internal:8080/ljvis/xroad/v2/openapi` (DEV hostist: `http://ljvis2dev.xtpnl.kemitaws.ee:8089/ljvis/xroad/v2/openapi`) |
| Teenuse kood | `findUsage` |
| Teenuse URL | `http://ruuter-internal:8080/ljvis/xroad` (DEV hostist: `http://ljvis2dev.xtpnl.kemitaws.ee:8089/ljvis/xroad`) |

> **NB:** Teenuse URL on `/ljvis/xroad`, **mitte** `/ljvis/xroad/v2`. eesti.ee kutsub
> `…/ljvis2/findUsage/v2/findUsage` ja turvaserver lisab teenusekoodi järel oleva tee
> (`/v2/findUsage`) teenuse URL-i lõppu → `/ljvis/xroad/v2/findUsage`. Sama kehtib
> `/v2/usagePeriod` ja `/v2/heartbeat` kohta.

### 3.2 Juurdepääsuõigused

Anda eesti.ee alamsüsteemile (`EE/GOV/70009317/eesti-ee` vms) juurdepääs teenuse
`findUsage` kõigile kolmele otspunktile: `GET /v2/findUsage`, `GET /v2/usagePeriod`,
`GET /v2/heartbeat`.

### 3.3 RIA X-tee kataloog

Registreerida teenus RIA X-tee kataloogis LJVIS-i alamsüsteemi all:
- Alamsüsteem: `ljvis2`
- Teenuse kood: `findUsage`
- Kirjeldus: `Andmejälgija kasutusteabe teenus (kasutusteabe esitamise protokoll v1.6.1)`

---

## 4. Kodeerimine ja API

### 4.1 Otspunktid

Vastused on protokolli kujul (ilma Ruuteri `{"response": …}` ümbriseta, `wrapper: false`).
Kõik ajad on RFC 3339 kujul UTC-s (`YYYY-MM-DDTHH:MM:SSZ`).

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| `GET` | `/ljvis/xroad/v2/heartbeat` | Elutuks — `{"status": "OK"}`, andmebaasi rikke korral `{"status": "FAIL"}` |
| `GET` | `/ljvis/xroad/v2/usagePeriod` | Ajavahemik — `{"periodStart": "..."}`; tühja logi korral praegune aeg |
| `GET` | `/ljvis/xroad/v2/findUsage` | Kasutusteave — paginated otsing isikukoodi järgi |
| `GET` | `/ljvis/xroad/v2/openapi` | Teenuse OpenAPI kirjeldus turvaserverile |

### 4.2 findUsage päring

```
GET /ljvis/xroad/v2/findUsage?userCode=EE12345678901&periodStart=2026-01-01T00:00:00Z

Headers:
  X-Road-UserId: EE12345678901   (kohustuslik; võib userCode-ist erineda)
```

**Query parameetrid:**

| Parameeter | Kohustuslik | Kirjeldus |
|------------|-------------|-----------|
| `userCode` | Jah | Andmesubjekti isikukood, `EE` eesliitega või ilma |
| `periodStart` | Ei | RFC 3339 aeg ajavööndiga, alates (vaikimisi: kõik) |
| `periodEnd` | Ei | RFC 3339 aeg ajavööndiga, kuni (vaikimisi: kõik) |
| `offset` | Ei | Vahelejäetavate kirjete arv, ≥ 0 (vaikimisi: 0) |
| `limit` | Ei | Tagastatavate kirjete arv, ≥ 1 (vaikimisi: 1000; küsitud väärtust ei kärbita) |

**Vastus:**
```json
{
  "totalUsages": 3,
  "usages": [
    {
      "logtime": "2026-09-01T10:23:45Z",
      "action": "LJVIS-i kontrollide küsimine X-tee kaudu",
      "receiverCode": "12345678",
      "receiverSystem": "minu-infosysteem"
    }
  ]
}
```

- Kirjed on `logtime` kahanevas järjekorras (uusim eespool).
- `totalUsages` on kõigi tingimustele vastavate kirjete arv — `limit`/`offset` seda ei mõjuta
  (ka siis mitte, kui `offset` on kirjete arvust suurem ja `usages` on tühi).
- Valikulised väljad `receiverName` ja `receiverSystem` jäetakse väärtuse puudumisel välja.

### 4.3 Isikukood ja esindusõigus

- `X-Road-UserId` on kohustuslik (puudumisel 400 `MISSING_HEADER`), kuid see **ei pea**
  vastama `userCode`-ile — protokolli §6.1.3 järgi võib päring olla käivitatud
  esindusõiguse alusel (nt vanem vaatab lapse andmeid). Esindusõiguse kontrollib eesti.ee.
- `userCode`-ilt eemaldatakse `EE` eesliide (tõstutundetult), seega `EE39001010001` ja
  `39001010001` annavad sama tulemuse. Päring leiab ka ajaloolised `EE`-eesliitega kirjed.

### 4.4 Veakoodid

| HTTP | `error` | Põhjus |
|------|---------|--------|
| 400 | `MISSING_HEADER` | `X-Road-UserId` päis puudub |
| 400 | `MISSING_PARAMETER` | `userCode` puudub |
| 400 | `INVALID_PARAMETER` | `periodStart`/`periodEnd` ei ole RFC 3339 aeg, `offset` < 0 või `limit` < 1 või mittearvuline |
| 500 | `SERVER_ERROR` | Andmebaasi viga |

---

## 5. Andmemudel

Tabel: `xroad.aj_usage_log` (append-only, kirjeid ei uuendata ega kustutata)

| Veerg | Tüüp | Kirjeldus |
|-------|------|-----------|
| `id` | UUID | Primaarvõti (automaatne) |
| `user_code` | TEXT | Isiku isikukood kelle andmeid töödeldi (11 numbrit, ilma `EE` eesliiteta) |
| `logtime` | TIMESTAMPTZ | Andmetöötluse ajamoment (UTC, automaatne) |
| `action` | TEXT | Inimloetav kirjeldus (eesti keeles) |
| `receiver_code` | TEXT | X-tee kliendi member_code |
| `receiver_name` | TEXT | Asutuse nimi (valikuline) |
| `receiver_system` | TEXT | X-tee kliendi subsystem (valikuline) |

Indeks `idx_aj_user_code_logtime (user_code, logtime DESC, id DESC)` katab findUsage
filtri ja järjestuse.

---

## 6. DSL failid

| Fail | Roll |
|------|------|
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/heartbeat.yml` | Heartbeat otspunkt |
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/usagePeriod.yml` | UsagePeriod otspunkt |
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/findUsage.yml` | FindUsage otspunkt |
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/openapi.yml` | OpenAPI kirjeldus (genereeritud failist `docs/xtee/FindUsageOpenapi.yaml`) |
| `DSL/Resql/ljvis/POST/xroad/aj/log_usage.sql` | AJ kirje INSERT |
| `DSL/Resql/ljvis/POST/xroad/aj/find_usage.sql` | AJ kirjete SELECT koos koguarvuga |
| `DSL/Resql/ljvis/POST/xroad/aj/usage_period.sql` | MIN(logtime) SELECT |
| `DSL/Liquibase/changelog/20261001100000-xroad-aj-usage-log.sql` | Tabelimigratsioon |
| `DSL/Liquibase/changelog/20261201100000-xroad-aj-usage-log-lookup-index.sql` | Otsinguindeks |
| `DSL-tests-internal/xroad/aj.test.yml` | `dsl-test` stsenaariumid |

---

## 7. Testimine

```bash
# dsl-test (ilma andmebaasita, Resql on mockitud)
docker run --rm -v "$PWD:/w" -w /w --entrypoint dsl-test turnerrainer/ruuter:<versioon> \
  --dsl DSL/Ruuter.internal --tests DSL-tests-internal --constants constants.ini

# Heartbeat
curl http://ruuter-internal:8080/ljvis/xroad/v2/heartbeat

# UsagePeriod
curl http://ruuter-internal:8080/ljvis/xroad/v2/usagePeriod

# FindUsage (test — eeldab et tabelis on kirjeid)
curl -H "X-Road-UserId: EE12345678901" \
  "http://ruuter-internal:8080/ljvis/xroad/v2/findUsage?userCode=EE12345678901"

# Läbi turvaserveri (nagu eesti.ee)
curl -H "X-Road-Client: EE/GOV/70009317/eesti-ee" -H "X-Road-UserId: EE12345678901" \
  "https://<turvaserver>/r1/EE/GOV/70001231/ljvis2/findUsage/v2/findUsage?userCode=EE12345678901&offset=0&limit=10"
```

---

## 8. Viited

- AJ kasutusteabe esitamise protokoll: https://github.com/e-gov/AJ/blob/master/doc/spetsifikatsioonid/Kasutusteabe_esitamise_protokoll.md
- AJ rakendusjuhend: https://github.com/e-gov/AJ/blob/master/doc/Rakendusjuhend.md
- LJVIS-i leping: [`docs/xtee/FindUsageOpenapi.yaml`](xtee/FindUsageOpenapi.yaml)
- ADR-005: `docs/workingdocs/architecture-decisions.md`
