# Andmejälgija (AJ) seadistamine LJVIS-is

Juhend kirjeldab kuidas seadistada LJVIS-i andmejälgija liides, mis võimaldab
isikutel eesti.ee kaudu pärida, kes nende andmeid LJVIS-is on töödelnud (IKS § 19, § 25).

---

## 1. Taust

Andmejälgija (AJ) on RIA koordineeritud infrastruktuur, mis kogub andmekogudelt
kasutusteabe kirjeid ja kuvab neid isikule eesti.ee portaalis. LJVIS peab implementeerima
DUMonitor OpenAPI v2.1.0 spetsifikatsiooni (`/v2/findUsage`, `/v2/usagePeriod`, `/v2/heartbeat`).

Spetsifikatsioon: https://github.com/e-gov/AJ/blob/master/doc/spetsifikatsioonid/dumonitor-openapi.yaml

---

## 2. Arhitektuur

```
eesti.ee → X-tee turvaserver (LJVIS) → ruuter-internal:8080/ljvis/xroad/v2/...
                                                    ↓
                                           resql → xroad.aj_usage_log
```

**Kirjete allikas:** Kolm inbound X-tee teenust kirjutavad automaatselt AJ kirjeid:

| Teenus | Millal logitakse |
|--------|-----------------|
| `xroad.provide.isiku-kontroll` | Iga eduka päringu korral |
| `xroad.provide.isiku-ettevote-kontrollid` | Iga eduka päringu korral |
| `xroad.provide.register-job-inspection-v3` | Eduka sisestuse korral, ainult kui `juhi_isikukood` esitati |

---

## 3. X-tee turvaserveri seadistamine

### 3.1 Teenuse lisamine

Turvaserveri haldusliidesesse (`https://<turvaserver>:4000`) tuleb lisada uus REST teenus:

| Väli | Väärtus |
|------|---------|
| Teenuse tüüp | REST |
| Teenuse URL | `http://ruuter-internal:8080/ljvis/xroad/v2` |
| Teenuse kood | `findUsage` |
| Versioon | `v2` |

> **NB:** Turvaserver lisab URL-i lõppu teenuse koodi, st eesti.ee kutse
> `findUsage` läheb `http://ruuter-internal:8080/ljvis/xroad/v2/findUsage`-le.
> Sama alus-URL katab ka `usagePeriod` ja `heartbeat`.

### 3.2 Juurdepääsuõigused

Anda eesti.ee turvaserverile (`EE/GOV/70009317/eesti-ee` vms) juurdepääs:
- `findUsage` teenusele (kohustuslik AJ jaoks)
- `usagePeriod` teenusele (kohustuslik AJ jaoks)
- `heartbeat` teenusele (vajalik AJ monitooringuks)

### 3.3 RIA X-tee kataloog

Registreerida teenus RIA X-tee kataloogis LJVIS-i subsüsteemi all:
- Subsüsteem: `ljvis2`
- Teenuse kood: `findUsage`
- Kirjeldus: `Andmejälgija kasutusteabe teenus (DUMonitor v2)`

---

## 4. Kodeerimine ja API

### 4.1 Endpoint-id

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| `GET` | `/ljvis/xroad/v2/heartbeat` | Elutuukse — tagastab `{"status": "OK"}` |
| `GET` | `/ljvis/xroad/v2/usagePeriod` | Ajavahemik — tagastab `{"periodStart": "..."}` |
| `GET` | `/ljvis/xroad/v2/findUsage` | Kasutusteave — paginated otsing isikukoodi järgi |

### 4.2 findUsage päring

```
GET /ljvis/xroad/v2/findUsage?userCode=EE12345678901&periodStart=2026-01-01T00:00:00Z

Headers:
  X-Road-UserId: EE12345678901   (kohustuslik, peab vastama userCode-le)
```

**Query parameetrid:**

| Parameeter | Kohustuslik | Kirjeldus |
|------------|-------------|-----------|
| `userCode` | Jah | Isiku isikukood (EE formaat) |
| `periodStart` | Ei | ISO 8601 kuupäev, alates (vaikimisi: kõik) |
| `periodEnd` | Ei | ISO 8601 kuupäev, kuni (vaikimisi: kõik) |
| `offset` | Ei | Vahelejäetavate kirjete arv (vaikimisi: 0) |
| `limit` | Ei | Tagastatavate kirjete arv (max 1000, vaikimisi: 1000) |

**Vastus:**
```json
{
  "totalUsages": 3,
  "usages": [
    {
      "logtime": "2026-09-01T10:23:45Z",
      "action": "LJVIS-i kontrollide küsimine X-tee kaudu",
      "receiverCode": "12345678",
      "receiverName": null,
      "receiverSystem": "minu-infosysteem"
    }
  ]
}
```

### 4.3 Turvalisus

- `X-Road-UserId` header **peab vastama** `userCode` query parameetrile — kaitseb volitamata andmepäringute vastu
- Mismatch korral tagastatakse HTTP 400 `{"error": "FORBIDDEN"}`

---

## 5. Andmemudel

Tabel: `xroad.aj_usage_log` (append-only, kirjeid ei uuendata ega kustutata)

| Veerg | Tüüp | Kirjeldus |
|-------|------|-----------|
| `id` | UUID | Primaarvõti (automaatne) |
| `user_code` | TEXT | Isiku isikukood kelle andmeid töödeldi |
| `logtime` | TIMESTAMPTZ | Andmetöötluse ajamoment (UTC, automaatne) |
| `action` | TEXT | Inimloetav kirjeldus (eesti keeles) |
| `receiver_code` | TEXT | X-tee kliendi member_code |
| `receiver_name` | TEXT | Asutuse nimi (valikuline) |
| `receiver_system` | TEXT | X-tee kliendi subsystem (valikuline) |

---

## 6. DSL failid

| Fail | Roll |
|------|------|
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/heartbeat.yml` | Heartbeat endpoint |
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/usagePeriod.yml` | UsagePeriod endpoint |
| `DSL/Ruuter.internal/ljvis/GET/xroad/v2/findUsage.yml` | FindUsage endpoint |
| `DSL/Resql/ljvis/POST/xroad/aj/log_usage.sql` | AJ kirje INSERT |
| `DSL/Resql/ljvis/POST/xroad/aj/find_usage.sql` | AJ kirjete SELECT |
| `DSL/Resql/ljvis/POST/xroad/aj/usage_period.sql` | MIN(logtime) SELECT |
| `DSL/Liquibase/changelog/20261001100000-xroad-aj-usage-log.sql` | Tabelimigratsioon |

---

## 7. Testimine

```bash
# Heartbeat
curl http://ruuter-internal:8080/ljvis/xroad/v2/heartbeat

# UsagePeriod
curl http://ruuter-internal:8080/ljvis/xroad/v2/usagePeriod

# FindUsage (test — eeldab et tabelis on kirjeid)
curl -H "X-Road-UserId: EE12345678901" \
  "http://ruuter-internal:8080/ljvis/xroad/v2/findUsage?userCode=EE12345678901"
```

---

## 8. Viited

- AJ rakendusjuhend: https://github.com/e-gov/AJ/blob/master/doc/Rakendusjuhend.md
- DUMonitor OpenAPI spec: https://github.com/e-gov/AJ/blob/master/doc/spetsifikatsioonid/dumonitor-openapi.yaml
- ADR-005: `docs/workingdocs/architecture-decisions.md`
