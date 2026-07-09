# Known Issues

Teadaolevate probleemide ja piirangute register. Iga kirje sisaldab staatuse, mõjutatud komponendi, lühikirjelduse ja järgmise sammu.

**Staatused:**
- 🔴 **Open** — lahendamata, aktiivselt mõjutab
- 🟡 **Mitigated** — töötab, kuid piiranguga (kalkuleeritud risk)
- 🟢 **Resolved** — lahendatud (versioon + kuupäev)

---

## KI-001 · PostgreSQL JDBC driver ceiling (RESQL + TIM)

**Staatus:** 🟡 Mitigated  
**Mõjutatud komponendid:** `resql-ljvis`, `tim`

### Kirjeldus

`resql-ljvis` (`ghcr.io/buerokratt/resql:v1.3.4`) ja `tim` (`ghcr.io/buerokratt/tim:pre-apha-2.7.1`) kasutavad mõlemad sisseehitatud PostgreSQL JDBC draiverit **42.3.9**, mis ametlikult toetab PostgreSQL serverit kuni versioonini **15**.

Süsteem käitatakse hetkel **PostgreSQL 17-ga** — see on testitud kalkuleeritud risk. JDBC wire-protokoll on tagasiühilduv ning kõik rakenduses kasutatavad operatsioonid (INSERT, SELECT, UPDATE, DELETE, pgcrypto funktsioonid) toimivad korrektselt.

| Komponent | JDBC driver | Ametlik PG tugi | Testitud |
|-----------|-------------|-----------------|---------|
| `resql-ljvis` `v1.3.4` | `42.3.9` | ≤ PostgreSQL 15 | PostgreSQL 17 ✓ |
| `tim` `pre-apha-2.7.1` | `42.3.9` | ≤ PostgreSQL 15 | PostgreSQL 17 ✓ |
| `liquibase` `5.0.3` | `42.7.11` (via lpm) | ≤ PostgreSQL 18 | PostgreSQL 17 ✓ |

### Piirang

**PostgreSQL 18 või uuemat ei tohi kasutada** seni, kuni RESQL ja TIM ei ole uuendatud versioonile, mis kasutab JDBC draiverit ≥ 42.6.

### Järgmine samm

1. Jälgi Bürokratt upstream repositooriumites (`resql`, `tim`) uuendusi.
2. Kontrolli uue versiooni bundled JDBC draiveri versiooni.
3. Kui JDBC ≥ 42.6 → saab minna PostgreSQL 18 peale.

### Viited

- `docs/admin-deployment-guide.md` §1.4 — operatiivne kirjeldus
- `docker/liquibase/Dockerfile` — Liquibase versioon
- `docker-compose.yml`, `docker-compose.ci.yml` — PostgreSQL versioon
