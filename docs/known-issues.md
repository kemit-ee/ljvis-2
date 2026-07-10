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

1. Jälgi Buerostack upstream repositooriumites (`resql`, `tim`) uuendusi.
2. Kontrolli uue versiooni bundled JDBC draiveri versiooni.
3. Kui JDBC ≥ 42.6 → saab minna PostgreSQL 18 peale.

### Viited

- `docs/admin-deployment-guide.md` §1.4 — operatiivne kirjeldus
- `docker/liquibase/Dockerfile` — Liquibase versioon
- `docker-compose.yml`, `docker-compose.ci.yml` — PostgreSQL versioon
# Known Issues / Teadaolevad probleemid

## Liquibase 5.0.x — changelog file not found

### Issue
Liquibase Docker image versions `5.0.3` (and likely other 5.0.x releases) fail to start with:

```
ChangeLogParseException: /liquibase/changelog.yaml does not exist
ChangeLogParseException: /ljvis/changelog.yaml does not exist
```

even when the changelog file is present via `COPY` in the image or bind-mounted into the container.

### Root cause
Liquibase 5.0.x Docker image uses `/liquibase/` as its own installation/runtime path. The changelog resource loader in 5.0.x does not resolve `changelog.yaml` correctly from `/liquibase/` or any other container path. The `searchPath` property in `liquibase.properties` is also not applied before the changelog file lookup, so neither absolute paths nor custom directories (`/ljvis/`) help.

### Workaround
Use the latest Liquibase 4.x release that is compatible with the project. As of the current deploy setup, the pinned image is:

```dockerfile
FROM liquibase/liquibase:4.29.2
```

With Liquibase 4.29.2, the following configuration works as expected:
- `docker/liquibase/Dockerfile`: `COPY DSL/Liquibase/ /liquibase/`
- `docker-compose.yml` and `docker-compose.ci.yml`: bind-mount `./DSL/Liquibase/` to `/liquibase/`
- `DSL/Liquibase/liquibase.properties`: `changelogFile: changelog.yaml`, `searchPath: /liquibase/`
- Liquibase command: `--defaultsFile=/liquibase/liquibase.properties update`

### Next steps
Re-evaluate Liquibase 5.x compatibility once a newer 5.x release is available or once Liquibase documents the correct way to configure `searchPath`/`changelogFile` in the Docker image. At the time of writing, the 5.0.3 image does not allow a simple changelog file path to work.
