# Control-forms moodulite üleviimine append-only mustrile — teostusplaan (KAVAND)

**Staatus:** kavand, ootab valdkonna/arhitektuuri ülevaatust — pole veel ADR-iks kinnitatud.
**Taust:** `erru.ncr_message` append-only reegli rikkumise parandus (PR #420,
`update-vr-link.sql` → `append-vr-link.sql`) tõi esile, et sama reegel
(`.skills/generate-resql-files/SKILL.md`: "INSERT and SELECT only — UPDATE, DELETE,
JOIN are forbidden") kehtib dokumentatsiooni järgi ainult uutele epic-põhistele
moodulitele (nt `erru.*`, klassifikaatorid). Vanem `control-forms` moodul kasutab
läbivalt "üks mutable rida vormi kohta" mudelit.

---

## Kontekst

`DSL/Resql/ljvis/POST/control-forms/**` sisaldab ~20 `update.sql` faili (vt allpool),
mis muudavad otse olemasolevat vormirida. See on olnud LJVIS2 algusest saati
kasutusel olev, tootmises stabiilselt töötav muster — erinevalt `erru.ncr_message`
puhul leitud UPDATE-ist ei ole see viga, vaid teadlik (kuigi dokumenteerimata)
vanem disainivalik.

Uuem append-only muster (`erru.*`, ADR-005 andmejälgija, ADR-009 Tableau,
ADR-010 arhiiv) annab:

* täieliku muutumatu ajaloo (auditeeritavus, "mis oli vormil hetkel X" küsimustele vastamine ilma eraldi audit-logita);
* lihtsama replikatsiooni/analüütika (append-only tabelid on Tableau matview'de jaoks juba eelistatud, vt ADR-009);
* ühtse mustri kogu Resql kihis — vähem "kas siin tohib UPDATE teha" küsimusi tulevastel review'del.

Hind: iga vormitüübi kirjutus/lugemispäring tuleb ümber kirjutada, andmed migreerida
ja Ruuteri/frontendi eeldused üle vaadata. See on arhitektuurne muudatus, mitte
bugifix — nõuab valdkonna kinnitust enne teostust.

## Ulatus

**Moodulid, mis vajaksid ümberkirjutamist (praegune `update.sql`):**

| Moodul | Fail |
|---|---|
| ADR-vorm | `adr-form/update.sql` |
| Koondvorm | `compound-form/update.sql` |
| SP-vorm (autojuht) | `drive-rest-form/driver/update.sql` |
| SP-vorm (meeskonnaliige) | `drive-rest-form/teammate/update.sql` |
| VR-vorm (välisriigi rikkumine) | `foreign-violation-form/update.sql` |
| Hea maine | `good-repute/update.sql` |
| Tööinspektsiooni akt | `labour-inspection/update.sql` (+ `apply_etoimik_decision.sql`) |
| Haagise tehnoülevaatus | `trailer-technical/update.sql` |
| TRAM kontrollkaart | `tram-card/update.sql` (+ `apply_etoimik_decision.sql`) |
| Autoveo katkestamine | `transport-interruption/update.sql` |
| Sõiduki tehnoülevaatus | `vehicle-technical/update.sql` |

**Teadlikult VÄLJAS ulatusest (jäävad muutmata):**

* `*/update-xroad-fields.sql`, `*/update-extraordinary-inspection-date.sql`,
  `xroad/provide/erakorraline-yv-confirm-update.sql` — dokumenteeritud erand
  (LJVIS2-72 §4: X-tee väljad ei tõsta versiooni).
* `files/delete_form_attachment.sql` — failihaldus, mitte vormi enda snapshot.
* `archive/purge_confirmed.sql` — ADR-010 tahtlik retention-delete, juba append-only voo osa.

## Faasid

### F0 — Ettevalmistus ja pilootvaliku otsus (koodi ei muuda)

1. Valdkonna/arhitektuuri ülevaatus sellele plaanile — kinnitada, kas migratsioon
   üldse ette võtta ja millises järjekorras.
2. Vali madala riskiga pilootmoodul (soovitus: **Hea maine** — väikseim
   väljade arv, harv kasutus, lihtne test-katvus) täieliku voo valideerimiseks
   enne ülejäänud ~10 mooduli teisaldamist.
3. `docs/workingdocs/data_model.md` täiendus: iga sihtmooduli tabelile
   `version INTEGER`, `created_at TIMESTAMPTZ` veerud, "latest" lugemismuster
   (`DISTINCT ON` / `ORDER BY created_at DESC LIMIT 1`).

### F1 — Pilootmoodul (Hea maine)

1. Liquibase: `version`/`created_at` veerud + indeks (`(id_kolonn, created_at DESC)`).
2. `update.sql` → `append_*.sql` (INSERT ... SELECT FROM latest, muutumatud väljad edasi).
3. `get.sql`/list-päringud → latest-rea loogika.
4. Ruuteri vood (kinnitamine, avaldamine, kustutamine) üle vaadata — kas need
   eeldavad "üks rida = üks vorm" semantikat kuskil otse.
5. Frontend: kontrollida, kas formik/readOnly loogika teeb otseseid eeldusi
   (nt "sama ID kogu elutsükli jooksul" — peaks kehtima ka append-only puhul,
   kuna loogiline ID jääb samaks, ainult rea füüsiline identiteet muutub).
6. Olemasolevate piloot-mooduli andmete migratsioon (praegused read → "version 1").
7. Playwright/DSL-test katvus, regressioon.
8. **Otsustuspunkt:** kas muster sobis probleemideta? Kui jah → F2. Kui ilmnes
   olulisi takistusi (nt Ruuter/frontend eeldused, mida on kulukas muuta) →
   plaan üle vaadata enne jätkamist.

### F2 — Ülejäänud moodulid (prioriteetsuse järjekorras, iga moodul eraldi PR)

Sama sammude jada (F1 p. 1–7) iga ülejäänud mooduli kohta. Soovituslik
järjekord väikseimast suurimale kasutuskoormusele: Autoveo katkestamine →
VR-vorm → Haagise tehnoülevaatus → Sõiduki tehnoülevaatus → ADR-vorm →
Tööinspektsiooni akt → TRAM kontrollkaart → SP-vorm (driver+teammate) →
Koondvorm.

Koondvorm ja SP-vorm viimasena, kuna neil on kõige rohkem sõltuvaid
alamvoogusid (koondvormi tabid, failide üleslaadimine, printimine) ja seega
kõige suurem regressiooni pind.

### F3 — Koristus

1. Vanade `update.sql` failide eemaldamine (kui asendatud ja tootmises kinnitatud).
2. `docs/db_errorhandling_rules.md` ja `.skills/generate-resql-files/SKILL.md`
   täpsustus — kas reegel laieneb nüüd retroaktiivselt kogu koodibaasile.

## Riskid

* **Tootmisandmete migratsioon** — iga moodul puudutab reaalselt kasutuses
  olevaid, iga päev täidetavaid vorme. Vale migratsioon = andmekadu.
  Nõuab dry-run + verify-sammu (sarnaselt ADR-010 `count_present` mustrile).
* **Ruuteri/frontendi varjatud eeldused** — "üks rida = üks vorm" muster võib
  olla kuskil otseselt (nt ID stabiilsus, foreign key viited teistest
  tabelitest `control_form_id` peale) kodeeritud viisil, mida on kallis leida.
* **Maht** — 10 moodulit × (Liquibase + Resql + Ruuter + frontend + test) on
  mitme sprindi töö, mitte üks PR.

## Ei ole veel otsustatud

* Kas F2 moodulid teha järjest ühe haruna või iga moodul eraldi PR-ina dev vastu
  (soovitus: eraldi PR-id, väiksem review-pind).
* Kas olemasolevate andmete migratsioon toimub Liquibase migratsiooniga
  (`INSERT INTO ... SELECT ... , 1 AS version, created_at_vana AS created_at`)
  või eraldi ühekordse skriptiga.
