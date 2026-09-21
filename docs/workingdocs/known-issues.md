# Known Issues

Teadaolevate probleemide ja piirangute register. Iga kirje sisaldab staatuse, mõjutatud komponendi, lühikirjelduse ja järgmise sammu.

**Staatused:**
- 🔴 **Open** — lahendamata, aktiivselt mõjutab
- 🟡 **Mitigated** — töötab, kuid piiranguga (kalkuleeritud risk)
- 🟢 **Resolved** — lahendatud (versioon + kuupäev)

---

## KI-001 · PostgreSQL JDBC driver ceiling (RESQL + TIM)

**Staatus:** � Resolved (2026-09-10)  
**Mõjutatud komponendid:** ~~`resql-ljvis`, `tim`~~

### Kirjeldus (ajalooline)

`resql-ljvis` (`ghcr.io/buerokratt/resql:v1.3.4`) ja `tim` (`ghcr.io/buerokratt/tim:pre-apha-2.7.1`) kasutasid sisseehitatud PostgreSQL JDBC draiverit **42.3.9**, mis ametlikult toetab PostgreSQL serverit kuni versioonini **15**. Süsteem käitati PostgreSQL 17-ga — see oli testitud kalkuleeritud risk.

### Lahendus

Mõlemad komponendid on migreeritud **Rust-põhistele `turnerrainer` versioonidele**, mis ei kasuta JVM-i ega JDBC draiverit üldse. Rust binary suhtleb PostgreSQL-iga otse `libpq`-protokolli teel, mistõttu PostgreSQL versioonipiirang kaob.

| Komponent | Vana (Java/JDBC) | Uus (Rust, ei kasuta JDBC) | Muutuse kuupäev |
|-----------|-----------------|---------------------------|-----------------|
| `resql-ljvis` | `ghcr.io/buerokratt/resql:v1.3.4` | `turnerrainer/resql:0.3.0-alpha` | 2026-09-07 → 2026-09-10 |
| `tim` | `ghcr.io/buerokratt/tim:pre-apha-2.7.1` | `turnerrainer/tim:0.3.0-alpha` | 2026-09-07 |

**PostgreSQL 17 (ja edaspidi ka 18+) on kasutatav piiranguteta.** Liquibase kasutab endiselt oma JDBC draiverit, kuid `42.7.11` toetab PostgreSQL 18.

### Viited

- `feat(resql): convert 212 SQL declarations to turnerrainer/resql:0.2.0 params: format` (2026-09-07)
- `chore: bump Ruuter 0.9.12-rc → 0.9.15-rc, Resql 0.2.0-alpha → 0.3.0-alpha` (2026-09-10)
- `docker/resql-ljvis/Dockerfile`, `docker/tim/Dockerfile` — praegused versioonid

## KI-002 · Liquibase 5.0.x — changelog file not found

### Kirjeldus

Liquibase Docker image versioonid `5.0.3` (ja tõenäoliselt ka teised 5.0.x väljalasked) ei käivitu ning annavad veateate:

```
ChangeLogParseException: /liquibase/changelog.yaml does not exist
ChangeLogParseException: /ljvis/changelog.yaml does not exist
```

Viga ilmub ka siis, kui `changelog.yaml` on olemas nii image'i `COPY` käsuga lisatud kui ka konteinerisse bind-mount'itud.

### Põhjus

Liquibase 5.0.x Docker image kasutab `/liquibase/` kausta oma installi/runtime teena. 5.0.x changelog resource loader ei suuda `changelog.yaml` õigesti lahendida ei `/liquibase/` ega ka mitte ühestki teisest konteineri teest. Ka `liquibase.properties` failis määratud `searchPath` omadust ei rakendata enne changelog faili otsingut, seega ei aita ei absoluutsed teed ega ka kohandatud kaustad (nt `/ljvis/`).

### Lahendus (workaround)

Kasuta viimast projektiga ühilduvat Liquibase 4.x versiooni. Hetkel kinnitatud image on:

```dockerfile
FROM liquibase/liquibase:4.29.2
```

Liquibase 4.29.2-ga töötab järgmine seadistus:
- `docker/liquibase/Dockerfile`: `COPY DSL/Liquibase/ /liquibase/`
- `docker-compose.yml` ja `docker-compose.ci.yml`: bind-mount `./DSL/Liquibase/` → `/liquibase/`
- `DSL/Liquibase/liquibase.properties`: `changelogFile: changelog.yaml`, `searchPath: /liquibase/`
- Liquibase käsk: `--defaultsFile=/liquibase/liquibase.properties update`

### Järgmine samm

Hinda Liquibase 5.x ühilduvust uuesti siis, kui saadaval on uuem 5.x väljalase või kui Liquibase dokumenteerib `searchPath`/`changelogFile` õige seadistamise Docker image'is. Hetkel ei luba 5.0.3 image lihtsat changelog faili teed tööle.

### Viited

- `docs/admin-deployment-guide.md` §1.4 — operatiivne kirjeldus
- `docker/liquibase/Dockerfile` — Liquibase versioon
- `docker-compose.yml`, `docker-compose.ci.yml` — PostgreSQL versioon
