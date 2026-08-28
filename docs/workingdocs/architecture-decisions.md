# LJVIS 2 — Arhitektuuriotsused

Siin failis dokumenteeritakse olulised arhitektuurilised otsused koos põhjenduse ja otsustajaga.
Formaat: kontekst → valikud → otsus → põhjendus.

---

## ADR-002 — Rust Ruuter 0.9.0-rc.1 (turnerrainer/ruuter:rc)

**Otsustaja:** Sten Viljus  
**Kuupäev:** 26.08.2026  
**Seotud commit:** `a703c23` — *feat: upgrade Ruuter to 0.9.0-rc.1 — enable outbound HTTP request/response logging*

### Kontekst

Projekt kasutas Java-põhist Ruuterit (Bürokratt/ruuter:v2.2.1), millele uuendusi enam ei tulnud. Tekkis vajadus väljuva HTTP-liikluse logimiseks, SSRF-kaitseks ja aktiivsemalt arendatava raamistiku järele.

### Otsus

Liiguti aktiivselt arendatavale Rust-põhisele Ruuterile (`turnerrainer/ruuter:rc`, versioon 0.9.0-rc.1).

### Põhjendus

**Plussid:**
- Rust Ruuter on aktiivselt arendatav; Java versioon seisis
- Väljuva HTTP-liikluse (request + response) logi — vajalik X-tee/ERRU silumisel
- SSRF kaitse vaikimisi sisse lülitatud (`block_private_networks: true`)
- Uued DSL-sammud: `state:` (mälupõhine KV), `iterate:` (massiivide itereerimine), `single_flight:` (concurrent-päringute koondamine)
- Märkimisväärne jõudluse paranemine Rust runtime tõttu: üle 3× kiirema throughputi keskmise REST-marsruudi korral võrreldes JVM käivitusega

**Riskikoht — DSL tagurpidi-ühilduvus:**  
Rust Ruuter ei ole täielikult tagurpidi ühilduv. Konkreetselt: `declaration:` bloki väljad `method`, `accepts` ja `returns` eemaldati — vana DSL-failiga server ei käivitu. Samuti muutus Resql-image (`askendest/resql:0.1.0-alpha.5` → `turnerrainer/resql:alpha`) mille SQL parameetrite süntaks (`allowlist.body` → `params:`) muutus. Üleminek nõudis hulkade DSL-failide muutmist (vt `migration_guide_to_rust_ruuter.md`). Hinnang: riskikoht realiseerus (migratsioonitöö), kuid see ei kaalu jõudluse, logimis- ja turvaplussid üle.

**API kasutajale midagi ei muutu** — URL-id, HTTP meetodid ja vastuse formaadid on täielikult tagasiühilduvad.

---

## ADR-003 — X-tee pakutavad teenused: ainult REST

**Otsustaja:** Sten Viljus  
**Kuupäev:** 10.07.2026  
**Seotud commit:** `* docs(xtee): add REST-only requirement for LJVIS-2 provided services`

### Kontekst

LJVIS-2 peab pakkuma teistele X-tee liikmetele andmepäringuid (nt kontrolliandmed, ettevõtte kontrollide ajalugu). Küsimus: kas pakkuda SOAP või REST formaadis?

### Otsus

Kõik LJVIS-2 poolt pakutavad X-tee teenused on **REST-põhised**. SOAP jääb ainult tarbimise poolele — väliste SOAP-teenuste (nt ARR, RR) tarbimisel kasutatakse XTR adapterit (REST → SOAP teisendus Ruuteri poolel).

### Põhjendus

- REST on lihtsam testida (Postman, curl) ja arendada võrreldes SOAP-räämitusega
- SOAP pakkumiseks puudub LJVIS-2 tööriistastikus adapter — XTR teisendab ainult tarbimise suunas (REST→SOAP), mitte pakkumise suunas
- Ruuteri `http.get/post/put` verbid töötavad REST semantikaga otse; SOAP pakkumine nõuaks eraldi vahekihti
- X-tee REST-teenused on X-tee 6.x standardi osa — lahendus on tulevik-kindel

---

## ADR-004 — Auditi sool `audit.config` tabelis

**Otsustaja:** Sten Viljus  
**Kuupäev:** 13.08.2026  
**Seotud commit:** `fix(audit): replace ALTER DATABASE audit_salt with audit.config table + hash_personal_code()`

### Kontekst

Auditisüsteem räsib isikukoode enne salvestamist: `SHA-256(isikukood || sool)` funktsiooniga `audit.hash_personal_code()`. Sool peab olema salajane ja keskkondade vahel hallatav. Esialgne lahendus kasutas PostgreSQL andmebaasitaseme seadistust (`ALTER DATABASE ... SET audit_salt = '...'`).

### Otsus

Sool salvestatakse `audit.config` tabelisse (`key = 'audit_salt'`, `value = '<räsitud väärtus>'`). Tabel on Liquibase migratsiooni osa. Funktsioon `audit.hash_personal_code()` loeb soola sealt.

### Põhjendus

**Portaablus (CI/CD praktiline põhjus):**  
`ALTER DATABASE` nõuab PostgreSQL superuser-õigusi, mis CI/CD keskkondades ei ole standardselt saadaval. `audit.config` tabelisse kirjutamine on tavaline SQL INSERT — Liquibase migratsioon haldab seda nagu kõiki teisi migratsioone, ilma DBA erisekkumiseta. Üleminek keskkondade vahel (arendus → test → toodang) on ühtne.

**Paigaldusel tekkinud probleem — AWS RDS-i piirang:**  
Otsuse muutis vältamatuks AWS RDS-i kasutajate õiguste mudel. AWS RDS ei anna kunagi päris PostgreSQL superuser-rolli — isegi nn `rds_superuser` roll ei luba `ALTER DATABASE SET` parameetreid muuta, mis nõuab tegelikku superuseri. Seega oli `ALTER DATABASE audit_salt` lähenemine AWS toodangukeskkonnas *struktuuriliselt võimatu*, mitte ainult ebasobiv. Tabelipõhine lahendus töötab kõikides keskkondades ühtviisi: lokaalselt, CI-s (Docker Compose) ja AWS RDS-il, ilma keskkonnaspetsiifiliste erilahenduste ja käsitsi DBA-sekkumiseta.

**Turvamõtestus (isikuandmete kaitse):**  
Sool on osa isikukoodi räsimise mehhanismist mis tagab, et auditilõpis ei ole võimalik tagurpidi isikukoodi tuletada ilma soola teadmata. Tabelipõhine lahendus lubab soola lugemisõigust piirata andmebaasi rolli tasemel — funktsiooni `audit.hash_personal_code()` kutsujad ei pea soola väärtust ise nägema.

---

## ADR-001 — TRAM kontrollkaardi andmemudel

**Otsustaja:** Sten Viljus  
**Kuupäev:** 28.08.2026  
**Seotud funktsioon:** Transpordiameti (TRAM) autojuhi kontrollkaart

### Kontekst

Transpordiamet vajab eraldiseisvat kontrollkaarti (TRAM kontrollkaart), mis funktsionaalselt sarnaneb PPA sõidu- ja puhkeaja autojuhi vormiga (SP-vorm). ERRU mõistes on tegemist sama andmetüübiga — seetõttu salvestuvad TRAM ja PPA kontrollid samadesse tabelitesse (`forms.compound_form`, `forms.sp_driver_form`). Vaja on kolm arhitektuurilist otsust:

1. Kuidas eristada TRAM-vorme PPA-vormidest andmebaasis?
2. Kas TRAM-vorminumber jagab PPA koond-seeriat või on eraldi?
3. Kas TRAM SP-alamvormi backend jagab PPA endpoint'i?

---

### Otsus 1 — TRAM-vormide eristamine DB-s: `authority` veerg

**Valitud:** `compound_form.authority VARCHAR(10) NOT NULL DEFAULT 'PPA'`

**Alternatiivid kaalutud:**
- *form_number prefiks* (`koond-` vs `tram-`) — filtrid on `LIKE`-põhised, ei ole tüübipuhtad, hargnemine SQL-is keerukam
- *eraldi tabel* (`tram_compound_form`) — andmete dubleerimine, keerukamad JOIN-id ERRU-päringutel

**Põhjendus:**  
Dedikeeritud veerg `authority` on kõige puhtam lähenemine: SQL filtrid on indekseeritavad (`WHERE authority = 'TRAM'`), andmetüüp on selge, tulevikus lisatavad autoriteedid (nt mõni kolmas asutus) ei nõua skeemimuutust. Vorminumber-prefiks jääb `tram-AAAA-NNNNN` formaati — see on nähtav kasutajaliidesest ja loetav, kuid ei ole ainuke eristataja.

---

### Otsus 2 — TRAM vorminumber: eraldiseisev seeria

**Valitud:** Uus sequence `forms.seq_tram_compound_form_key`, formaat `tram-AAAA-NNNNN/versioon`

**Alternatiivid kaalutud:**
- *Jagab `koond-` seeriat* — lihtsam DB-s, aga TRAM-vorminumbrid oleksid hõredad (nt `tram-2026-00847`) kui PPA-vormi on palju; segadusttekitav kasutajale

**Põhjendus:**  
TRAM kontrollkaardid on operatiivselt eraldiseisev tegevus. Eraldiseisev seeria (`tram-2026-00001`, `tram-2026-00002`, ...) on auditeerimise ja aruandluse seisukohalt puhtam — TRAM-spetsialist näeb oma koormust, PPA-spetsialist omaenda. Seeria ei sõltu teise asutuse tempot.

---

### Otsus 3 — TRAM SP-alamvormi backend: eraldi endpoint

**Valitud:** Uus kaust `DSL/Resql/ljvis/POST/control-forms/tram-form/sp-driver/` ja eraldi Ruuter-guard `tram_driver_form.write` / `tram_driver_form.read` õigusega

**Alternatiivid kaalutud:**
- *Jagab PPA SP-endpoint'i* — vähem koodi, aga guard peab lubama nii `tram_driver_form.write` kui `sp_driver_form.write`; seob kaks eraldiseisvat domeeni ühte endpointi; tuleviku lahknemine (nt TRAM-spetsiifilised väljad) on keerukas

**Põhjendus:**  
Täielik eraldatus endpoint'i tasemel tagab, et TRAM ja PPA õigused ei põimu. Resql SQL-failid on koopiad, kuid TRAM-i spetsiifilised piirangud (nt `authority = 'TRAM'` compound_form filtris) saab lisada ilma PPA loogikat puutumata. Duplikaat on piiratud (~200 rida SQL) ja õigustatud selge domeenipiiriga.
