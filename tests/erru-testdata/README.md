# ERRU MOVEHUB testandmestik

EL DG MOVE ametliku MOVEHUB ERRU 3.5 konformsustest-paketi (MS Test Pack 3.19) põhjal
koostatud testandmestik. Kahes osas:

- **Osa A** — kõik 59 ametlikku testjuhtumit (`Templates/ERRU3.5 Member State Test Cases
  version 1.00.xlsx`): CGR 18, CTUD 11, NCR 11, NU 11, RSI 8. Suund `outgoing` (Eesti kui
  saatja).
- **Osa B** — 2161 sünteetilist **sissetulevat** NCR-rida, ehitatud
  `Simulated Test Data/ErruTestData.xml` `RoadTransportUndertaking` +
  `RoadTransportInfringements` + `RoadTransportPenalties` andmetest. Simuleerib "teine
  liikmesriik teatab Eesti ettevõtja rikkumisest". **Selgelt sünteetiline testandmestik**,
  mitte päris ajalooline sõnumivahetus.

## Rakendamine (üks käsk)

```bash
docker compose exec -T database psql -U ljvis -d ljvis_db < tests/erru-testdata/erru-movehub-seed.sql
```

Idempotentne — korduskäivitamine tuvastab juba rakendatud `MOVEHUB-%` prefiksiga read ja
jätab kõik vahele.

**Ei rakendu kunagi automaatselt** — ei `docker-compose up`, ei `liquibase update` ega CI
`bootstrap`. Fail ei asu `DSL/Liquibase/`-is, pole viidatud mitte kusagilt.

## Kontrollpäring

```sql
SELECT count(*) FROM erru.ncr_message
WHERE business_case_id LIKE 'MOVEHUB-NCR-INFR-%';
-- 2161
```

## Mida see EI tee

Ei muuda ega laienda MTR mocki (`DSL/Ruuter/ljvis/POST/v1/erru/mock/mtr/*`) ega ühtegi
olemasolevat voogu — puhtalt lisanduv andmestik käsitsi testimiseks/uurimiseks.
