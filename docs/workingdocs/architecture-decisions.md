# LJVIS 2 — Arhitektuuriotsused

Siin failis dokumenteeritakse olulised arhitektuurilised otsused koos põhjenduse ja otsustajaga.
Formaat: kontekst → valikud → otsus → põhjendus.

---

## ADR-007 — ADR (ohtliku veose) kontrollvormi vastavusseviimine kliimaministri määrusega; rikkumiste klassifikaatori restruktureerimine

**Otsustaja:** Sten Viljus
**Kuupäev:** 03.09.2026
**Seotud:** LJVIS2-141 (ADR alamvorm), kliimaministri määrus (RT I, 16.06.2026, 11 — <https://www.riigiteataja.ee/et/akt/116062026011>), komisjoni määrus (EL) 2016/403 I lisa jaotis 9, direktiiv 2008/68/EÜ, direktiiv (EL) 2022/1999. Valdkonna sisenddokumendid: „Kontrollkaardi ridade 12–27 seosed määruse 2016-403 rikkumisliikidega" (PDF), „ADR Kontrollkaardi tehniline suunis" (PDF, rea 17 näidisloogika).
**Seotud failid:** `DSL/Liquibase/changelog/20260804160000-initial-adr-form.sql`, `DSL/Liquibase/changelog/20260901120000-dangerous-goods-infringements-classifier.sql`, `frontend/src/features/control-forms/pages/adr-form/*`, `frontend/src/features/control-forms/components/shared/AddressFields.tsx`

### Kontekst

Ohtliku veose (ADR) kontrollvorm on Eestis kehtestatud **kliimaministri määrusega** ja avaldatud Riigi Teatajas. Määruse **lisa 1** on vormikohane ohtlike ainete veo kontrollvorm; **lisa 2** on kontrollkaart, mis seob vormi read 12–27 komisjoni määruse (EL) 2016/403 I lisa jaotise 9 rikkumisliikidega.

Olemasolev ADR-alamvorm (LJVIS2-141) ja seda toitev klassifikaator `DANGEROUS_GOODS_INFRINGEMENTS_NEW` (lisatud `dev`-i 01.09.2026, **veel toodangusse jõudmata**) on üles ehitatud teistsuguse loogikaga, kui määruse lisa 1 nõuab:

* rikkumised on rühmitatud **raskusastme järgi** (MSI / VSI / SI), mitte kontrollkaardi punktide 12–27 kaupa;
* iga rikkumisrea kohta on üks C / NC / NA raadionupuvalik, riskikategooria on vabatekst; rikkumine ei ole korratav;
* mahuti tüüp ja kontrolli tulemuse lisameetmed on raadionupud, kuigi reaalselt on tegemist mitmese valikuga.

„ADR Kontrollkaardi tehniline suunis" (rea 17 näidisel) täpsustab rikkumiste ploki loogika:

* kontrollkaardi rea tasand: **C / NC / NA** (üks valik); kui **C**, siis „Rikkumine tuvastatud: Ei / Jah" — „Jah" korral genereeritakse esimene rikkumiskirje;
* **rikkumiskirje on korratav** („+ Lisa rikkumine", piiramatu), iga kirje: üks riskikategooria (I / II / III, raadionupud), kohustuslik vabatekst „Rikutud ADR punkt", mitmene „Võimalik vastutav osaleja" (Ci / C / Ce / L / P / F / To / U), ning **ainult kui osalejaks on valitud Vedaja (C)** aktiveeruv „Määruse (EL) 2016/403 rikkumisliik" (rippmenüü selle reaga eelnevalt seostatud liikidest + „Ei ole 2016/403 p 9 rikkumisliik");
* **2016/403 raskusaste (MSI / VSI / SI)** tuletatakse automaatselt valitud rikkumisliigist ja hoitakse **eraldi tunnusena** riskikategooriast — neid ei tohi samastada.

Lisaks on valdkonnalt saabunud **11 punkti muudatusettepanekut** (pealkirjavihjete tekstid, vaikeväärtused, raadio → märkeruut, „ÜN-number" → „ÜRO number", erandi ploki ülesehitus, väärteoasja numbri sõnastus jne).

Lisa 2 juhib tähelepanu, et seos kontrollkaardi rea ja 2016/403 rikkumisliigi vahel on **mitmene mõlemas suunas** (nt rikkumisliik 10 → rida 17 või 19; rikkumisliik 23 → rida 21, 22 või 23; read 7 ja 17 → mõlemad rida 24).

### Otsused

#### Otsus 1 — Rikkumiste klassifikaator: uus 2-tasemeline `ADR_CONTROL_CHECKPOINT`; `DANGEROUS_GOODS_INFRINGEMENTS_NEW` kustutatakse

* **Tase 1 = kontrollkaardi punkt 12–27.** `code` = `P12`…`P27`; `name` = punkti nimetus (nt „Mahuteid käsitlevad sätted"); `description` = ADR-viide, mis kuvatakse pealkirjas sulgudes (nt „ADR 4.1–4.7").
* **Tase 2 = selle punktiga eelnevalt seostatud 2016/403 I lisa jaotise 9 rikkumisliik.** `parent_key` viitab punktile; `code` = rikkumisliigi number (`1`…`24`); `name` = rikkumisliigi lühikirjeldus; `description` = raskusaste (`MSI` / `VSI` / `SI`). Neid väärtusi kasutab vormil ainult rikkumiskirje väli „Määruse (EL) 2016/403 rikkumisliik" (rippmenüü filtreerimiseks punkti järgi).
* **Rikkumisliigi „puudub" valik** („Ei ole määruse 2016/403 p 9 rikkumisliik") **ei ole klassifikaatoris** — see on rippmenüü kõva­kood. sentinel (`NONE`), kuna vedaja võib vastutada ka väljaspool jaotist 9.
* **Many-to-many realiseeritakse duplikaatkirjetena.** Sama rikkumisliik, mis seondub mitme punktiga, sisestatakse iga punkti alla eraldi `classifier_value` kirjena. Eraldi seostabelit **ei tehta**. Lõplik seoste loend: Priit Tuuna ettevalmistatud tabel.
* `DANGEROUS_GOODS_INFRINGEMENTS_NEW` **kustutatakse** (`20260901120000-rollback.sql` loogika uude changesetti) — kuna klassifikaator pole veel toodangus, ei jäeta seda „deprecated" seisu.

**Alternatiivid (tagasi lükatud):**

* *3-tasemeline klassifikaator* punkt → raskusaste → rikkumisliik — lisab taseme ilma väärtust andmata; raskusaste tuletatakse niikuinii koodist.
* *Eraldi `forms`-skeemi seostabel* `adr_checkpoint_infringement` (päris many-to-many) — rikub projekti mustri (kõik loendid on klassifikaatoris, hallatavad administraatori liidesest); klassifikaatori haldusliides ja frontendi `getByCode` / `GroupedClassifierChecklist` ei toeta seostabelit. Duplikaadid on 24 rikkumisliigi ja ~15 mitmese seose juures hallatav maht (~40 tase-2 kirjet).
* *Praeguse klassifikaatori nime taaskasutamine uue struktuuriga* — segane migratsiooniajaloos; uus `code` teeb muudatuse üheselt jälgitavaks.

#### Otsus 2 — Kõvakood. loendid: riskikategooria I / II / III ja võimalik vastutav osaleja

Mõlemad on õigusaktiga fikseeritud, muutumatud loendid — käsitletakse nagu `CONTAINER_TYPES` / `RESULT_OPTIONS` (konstant + i18n-sildid), **mitte klassifikaatorina**.

* **Riskikategooria** (direktiiv (EL) 2022/1999): `I` / `II` / `III`, **raadionupud — üks valik rikkumiskirje kohta** (tehniline suunis p 3: mitu kategooriat → mitu eraldi rikkumiskirjet).
* **Võimalik vastutav osaleja** (ADR 1.4): `Ci` kaubasaatja, `C` vedaja, `Ce` kaubasaaja, `L` laadija, `P` pakendaja, `F` täitja, `To` paagi käitaja, `U` mahalaadija — **mitmene valik** (rippmenüü), vaikimisi tühi, kuvasilt „Vedaja (C)" kujul.
* **2016/403 raskusaste** ei ole eraldi valik — tuletatakse rikkumisliigi koodist (tase-2 kirje `description`), aga **salvestatakse rikkumiskirjes eraldi väljana**, et jääks stabiilseks klassifikaatori muutumisel.

#### Otsus 3 — `forms.adr_form` väljade kujumuutus (üks uus changeset)

Tabel on append-only hetktõmmete tabel; JSONB-väljade *sisemine* kuju muutub ilma skeemimuutuseta, uued skalaar-/JSONB-veerud lisatakse ühe changesetiga `20260903150000-adr-form-maarus-alignment.sql` (+ `.xml`). Toodangus ADR-vormi andmeid ei ole → andmemigratsiooni ei tehta.

`infringements` JSONB — üks kirje kontrollkaardi punkti kohta (puutumata read jäetakse salvestamata), sees korratav `records` massiiv:

```json
[{
  "checkpointCode": "P17",
  "inspectionStatus": "C|NC|NA",
  "notCheckedReason": "…",          // NC/NA korral, valikuline
  "infringementDetected": true,      // ainult inspectionStatus=C korral
  "records": [{
    "riskCategory": "I|II|III",
    "adrReference": "4.3.2.2.4",     // kohustuslik
    "responsibleParticipants": ["C","F"],
    "reg2016403Code": "10|NONE|null", // aktiivne ainult kui participants sisaldab "C"
    "reg2016403Severity": "MSI|VSI|SI|null" // tuletatud koodist, salvestatud eraldi
  }]
}]
```

| Väli | Muutus |
|---|---|
| `infringements` JSONB | uus kuju (ülal); vana kuju kaob — toodangus andmeid ei ole |
| `other_violations` TEXT | Vormilt eemaldatakse. **Uus** `other_infringements` JSONB `DEFAULT '[]'` — n+1 korratav („Lisa uus muu rikkumine"): vabatekst­pealkiri `title` + sama `records` massiiv (rikkumisliigi rippmenüü näitab kõiki 24 + `NONE`) |
| `container_type` VARCHAR | **Uus** `container_types` JSONB `DEFAULT '[]'` (mitmene valik). Vana veerg jääb alles (append-only), uus vorm kirjutab ainult massiivi |
| `exemption_adr_provision` VARCHAR | Jääb. **Uus** `exemption_notes` TEXT — „Märkus (direktiivi 2008/68/EÜ erandid)" |
| `result_type` CHECK | Jääb `{ok, misdemeanor_proceedings, warning}`. **Uued** `driving_ban_applied` BOOLEAN + `transport_interruption_applied` BOOLEAN — lisameetmed, mitte tulemuse raadionupp. Väärtused `driving_ban_art5` ja `transport_interruption` eemaldatakse CHECK-ist |
| `proceeding_reference_number` | Väli jääb; kuvasilt muutub tingimuslikuks — üldmenetluse puhul „Väärteoasja number", muidu senine sõnastus |

#### Otsus 4 — Aadressiväli: Eesti-vaikeväärtus eemaldatakse ADR-vormilt; `AddressFields` saab tühja esimese valiku ja lubab välisriigi puhul käsitsi maakonna/linna

* ADR-hookist kaob `toObject(..., { countryCode: 'EE' })` fallback → riik vaikimisi täitmata (viimase ja järgmise laadimise aadress võivad olla väljaspool Eestit).
* `AddressFields` riigi `Select` saab **tühja esimese valiku**, et ekslikult valitud riiki saaks tühjendada. Kehtib ka autoveo katkestamise vormil — kahjutu paranus.
* `AddressFields`: kui `countryCode` ≠ `EE`, on maakond ja linn/vald **käsitsi täidetavad** tekstiväljad (praegu `disabled={true}` — viga). Kehtib ka autoveo katkestamise vormil — paranus.

#### Otsus 5 — Uus klassifikaator `ADR_QUANTITY_UNIT` ohtlike kaupade koguse ühikule

1-tasemeline klassifikaator, 8 väärtust: `l`, `kg`, `t`, `m³`, `tk`, `pakendit`, `ballooni`, `NEM kg`. Vormil: „Kogus" jääb arvväljaks; „Ühik" muutub `Select`-iks (`getByCode('ADR_QUANTITY_UNIT')`).

#### Otsus 6 — Ülejäänud muudatusettepanekud on i18n- ja väiksed komponendimuudatused

Pealkirjavihjete tekst („Andmed täidetakse ainult rikkumise korral" → „Täita ainult juhul, kui see on rikkumise puhul asjakohane"), „ÜN-number" → „ÜRO number", erandi ploki paigutus, sõidukeelu viide „(direktiivi (EL) 2022/1999 artikkel 5)" jne — ainult `et.json` + vormikomponent. ADR-i neid ei koorma; täisloend on teostusplaanis.

### Põhjendus

* **Klassifikaatoripõhine loend + duplikaadid** hoiab lahenduse projekti mustri sees (haldus administraatori liidesest, olemasolev `GroupedClassifierChecklist` ilma koodimuutuseta) ja väldib eraldi seostabeli hoolduskoormust väikese kirjete arvu juures.
* **Kõvakood. riskikategooria ja osalejad** — õigusaktiga fikseeritud loendid ei vaja haldusliidest ega migratsiooni; sama muster on projektis juba kasutusel.
* **Raskusaste eraldi väljana** (ehkki tuletatud) — tehniline suunis nõuab riskikategooria ja 2016/403 raskusastme lahushoidmist; koodist tuletamine toimub sisestushetkel, salvestus on stabiilne.
* **Uued veerud, mitte olemasolevate ümberkirjutamine** — append-only tabeli filosoofia; toodangus andmeid ei ole, seega andmeteisendus on tarbetu, aga vanad veerud jäävad ajalukku loetavaks.
* **TEDI disainikeel** — rikkumiste plokk kasutab olemasolevaid `@tedi-design-system` komponente samas mustris nagu ohtlike kaupade tabel ja tehnokontrolli osade loend: `Card` / `Card.Content` sektsioonideks, `GroupedClassifierChecklist` punktide grupeerimiseks, `ChoiceGroup` (raadio/checkbox), `Select` (mitmene), pesastatud `Card` iga rikkumiskirje kohta, `Button visualType="secondary"` „+ Lisa rikkumine" ja `Button icon="delete" color="danger" size="small"` kustutamiseks. Uusi UI-primitiive ei looda.
* **Aadressimuudatused `AddressFields` tasemel** on üldised parandused, mis on kasulikud kõigile aadressi kasutavatele vormidele; „ei vaikimisi Eestit" jääb ADR-hooki, et mitte muuta teiste vormide käitumist.

### Piirangud / TODO

* Administraator peab enne vormi kasutuselevõttu seemnema kaks klassifikaatorit (`ADR_CONTROL_CHECKPOINT`, `ADR_QUANTITY_UNIT`) — mõlemad tulevad Liquibase-migratsioonis, kui valdkonna loendid (Priit Tuuna MSI/VSI/SI seosed, ühikute loend) on käes.
* Dokumentatsioon uuendada: `docs/user-guide/11-vorm-adr.md`, `docs/andmehaldus/klassifikaatorid.md`, `docs/andmehaldus/rikkumiste-klassifikaatorid-2016-403.md`, `docs/muudatused.md`, kasutusjuhendi näidisvorm (`DSL/Liquibase/test/20260903100000-user-guide-fixture-forms.sql`).
* Määruse jõustumiskuupäev ja lisa 1 täpne sõnastus kontrollida RT-st enne toodangusse minekut.

---

## ADR-005 — Andmejälgija: ainult inbound X-tee päringud, eraldi append-only tabel

**Otsustaja:** Sten Viljus  
**Kuupäev:** 01.09.2026  
**Seotud failid:** `DSL/Ruuter.internal/ljvis/GET/xroad/v2/`, `DSL/Resql/ljvis/POST/xroad/aj/`, `docs/andmejalgija-seadistamine.md`

### Kontekst

IKS § 19/§ 25 nõuab et isik saab küsida, kes tema andmeid on töödelnud. Tuli otsustada:
1. Milliseid andmevooge logida AJ-sse?
2. Kas kasutada olemasolevat `xroad_integration_log`-i või eraldi tabelit?
3. Kas logida isikukood selgetekstiliselt?

### Otsus

- Logitatakse ainult **inbound** X-tee päringud — teenused kus väline osapool küsib või sisestab isikuandmeid LJVIS kaudu: `isiku-kontroll`, `isiku-ettevote-kontrollid`, `register-job-inspection-v3` (ainult kui `juhi_isikukood` esitati)
- `xroad_integration_log` jääb **puutumata** — AJ kirjed lähevad ainult uude `xroad.aj_usage_log` tabelisse
- `xroad.aj_usage_log` on **append-only** tabel (nagu `audit.audit_event`) — `UPDATE`/`DELETE` on keelatud
- Isikukood (`user_code`) logitakse **selgetekstiliselt** — AJ `findUsage` endpoint otsib `userCode` järgi, hash ei oleks otsitav

### Põhjendus

- **Inbound** on see mis isikule "nähtav" — tema andmeid küsiti või sisestati välise süsteemi poolt
- **Outbound** (RR, e-Toimik, ERRU saatmised) on meie enda protsesside initsiatiiv, mitte kolmanda osapoole teenus isiku suhtes
- **Eraldi tabel:** puhtam skeem, ei sega olemasolevat integratsioonilogi
- **Append-only:** garanteerib AJ nõuetele vastava auditeeritavuse — kirjeid ei saa tagantjärgi muuta ega kustutada
- **Hash lükati tagasi:** AJ `findUsage` endpoint vajab otsimist `userCode` järgi selgetekstis; hash ei ole otsitav ilma et pärija esitaks sama isikukoodi — mis tähendaks, et otsing eesti.ee-st ei toimiks

---

## ADR-006 — Teavituste moodul: in-app + Postkast 2.0 + WebSocket push (LJVIS-2)

**Otsustaja:** Sten Viljus  
**Kuupäev:** 10.10.2026  
**Seotud issue:** LJVIS-2 (Jira), GitHub epic

### Kontekst

LJVIS-2 vajab moodulipõhist teavitussüsteemi, mis katab kaks kanalit:

1. **In-app teavitused** — reaalajas kasutajaliideses, õiguspõhine filtreerimine (`required_permission`).  
2. **Postkast 2.0 (välised e-kirjad)** — raske rikkumise teavitused veoettevõtjatele ja muude DSL-töövoogude genereeritud kirjad.

Lisaks peab süsteem toetama logimist (kes saadeti, millal, mis tulemusega) ning ebaõnnestunud saadetise uuesti saatmist (UC-04).

### Valikud kaalutud

**A) 30-sekundiline HTTP polling unread-count jaoks**  
— Lihtne, kuid tekitab tarbetut serverikoormust ja viibega UX.

**B) WebSocket push broadcast + HTTP pull andmete jaoks**  
— Ruuter 0.9.0-rc.1 `ws_send` toetab `broadcast_prefix` moodust HTTP kontekstist (nt `create.yml` internal endpointist). Klient saab signaalina ainult `{type: "notification_update"}` — kasutajaandmeid broadcast ei sisalda. Iga klient teeb seejärel oma authenticated HTTP päringud oma sessiooni alusel. WS-ühenduse katkemine langeb back automaatselt 60 s pollingule, reconnect 5 s pärast.

**C) Server-Sent Events (SSE)**  
— Ühepoolne, pooleldi standardne. Ruuter 0.9.0-rc.1 ei toeta veel SSE-d; WebSocket on paremini dokumenteeritud.

### Otsus

Valiti **B — WebSocket push + HTTP pull**.

- `DSL/Ruuter/ljvis/WS/inbound/notifications/connect.yml` — WS keep-alive endpoint  
- `DSL/Ruuter.internal/ljvis/POST/notification/create.yml` — loob in-app teavituse + `ws_send broadcast_prefix: "client:"`  
- `DSL/Ruuter.internal/ljvis/POST/notification/send-postkast.yml` — Postkast 2.0 saatmine + outbound_log kirje  
- 7 Ruuter public API endpoint (`/v1/notifications/*`) — dünaamiline id käib
  `?q=` query-paramina (`rest-api-disainijuhend.md` §4.2). Kehaväli ei sobi:
  Ruuter 0.9.7 nõuab, et kõik `allowlist.body` väljad oleksid päringus olemas,
  seega ei saa id-d valikuliseks kehaväljaks teha. Nt
  `POST /v1/notifications/mark-read?q={id}`,
  `POST /v1/notifications/outbound-log/resend?q={logId}` body `{ recipientEmail }`  
- 4 Liquibase tabelit: `notifications.notification`, `notification_read`, `outbound_log`, `outbound_log_recipient`  
- Frontend: `useNotificationCount` hook (WS + fallback polling), `NotificationBellButton` päises, `NotificationsPage` (kahe tabiga: in-app + saadetud kirjad)

### Turvalisus

- Broadcast payload sisaldab ainult signaali (`{type: "notification_update"}`), mitte kasutajaandmeid.  
- Iga klient teeb oma authenticated HTTP päringu — sessionipõhine filtreerimine toimub serveri poolel (`required_permission` vs kasutaja tegelikud õigused).  
- `notification.admin` permission kaitseb outbound-logi vaatamist ja uuesti saatmist (ainult Super Admin Group) —
  guard `DSL/Ruuter/ljvis/{GET,POST}/v1/notifications/outbound-log/.guard.yml`.

### Piirangud / TODO

- **Postkast 2.0 toodangukredentsiaalid** (`PK_URL`, `PK_TOKEN`) on RIA-lt ootel. `send-postkast.yml` on stub-ga, mis logib kavatsuse ja tagastab mock-`sending_operation_id`. Aktiveerimine: DSL-i kommentaaritud `callPkApi` samm aktiveerida kui credentialid on Kubernetes-es saadaval.  
- **WS auth**: praegu WS endpoint ei kontrolli sessiooni eraldi — port 8086 on niigi tagapool nginx-i, mis nõuab TIM-sessiooni. Vajadusel lisada `ws_session_check` samm.

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

### Otsus 2 — TRAM vorminumber: koondvormil eraldi, alamvormil võib jagada

**Otsustaja:** Sten Viljus, 30.08.2026

**Valitud:**
- **Koondvorm (üldosa):** eraldiseisev seeria — uus sequence `forms.seq_tram_compound_form_key`, formaat `tram-AAAA-NNNNN/versioon`. PPA ja TRAM peavad koondvormil eristuma ka **nähtava numbri** järgi, mitte ainult `authority` veeru järgi.
- **Autojuhi alamvorm:** **võib jagada** PPA `sp-` numbriseeriat (`forms.seq_sp_driver_form_key`, formaat `sp-AAAA-NNNNN/versioon`). Alamvormi number ei ole asutuse eristamise koht — seda teeb koondvorm.
- Loogilised võtmed (`compound_form_key`, `sp_driver_form_key`) jäävad alati ühistesse jadadesse.

**Alternatiivid kaalutud:**
- *Kõik vormid jagavad `koond-` / `sp-` seeriat* — TRAM-koondvormi numbrid oleksid hõredad ja segadusttekitavad, kui PPA-vorme on palju.
- *Kõik vormid eraldi seerias (ka alamvorm `tram-sp-...`)* — kaalutud ja tagasi lükatud: alamvormi tasemel ei anna eraldi numeratsioon lisaväärtust, kuna alamvorm on alati konkreetse (juba `tram-` numbriga) koondvormi all.

**Põhjendus:**  
TRAM kontrollkaardid on operatiivselt eraldiseisev tegevus ja koondvormi number on see, mida kasutaja ja aruandlus näevad — seal peab asutus olema üheselt loetav. Alamvormi number on tehniline viide koondvormi sees, seega numbriseeria jagamine PPA-ga on aktsepteeritav ja hoiab koodi lihtsamana.

---

### Otsus 3 — TRAM SP-alamvormi backend: eraldi endpoint

**Valitud:** Uus kaust `DSL/Resql/ljvis/POST/control-forms/tram-form/sp-driver/` ja eraldi Ruuter-guard `tram_driver_form.write` / `tram_driver_form.read` õigusega

**Alternatiivid kaalutud:**
- *Jagab PPA SP-endpoint'i* — vähem koodi, aga guard peab lubama nii `tram_driver_form.write` kui `sp_driver_form.write`; seob kaks eraldiseisvat domeeni ühte endpointi; tuleviku lahknemine (nt TRAM-spetsiifilised väljad) on keerukas

**Põhjendus:**  
Täielik eraldatus endpoint'i tasemel tagab, et TRAM ja PPA õigused ei põimu. Resql SQL-failid on koopiad, kuid TRAM-i spetsiifilised piirangud on lisatud ilma PPA loogikat puutumata. Duplikaat on piiratud (~200 rida SQL) ja õigustatud selge domeenipiiriga.

**Horisontaalne juurdepääsukaitse (IDOR):** kuna `forms.sp_driver_form` tabelil ei ole `authority` veergu, kontrollivad kõik `tram-form/sp-driver/*` päringud (lugemine ja kirjutamine) alamvormi kuuluvust TRAM-koondvormi külge:
`... AND EXISTS (SELECT 1 FROM forms.compound_form cf WHERE cf.compound_form_key = sp_driver_form.compound_form_key AND cf.authority = 'TRAM')`.
Nii ei saa TRAM-õigustega kasutaja PPA autojuhi alamvormi `sp_driver_form_key` kaudu lugeda ega muuta. Versiooniajaloo (`get-snapshots`) lekke vältimiseks on TRAM-il oma guarditud endpointid `GET .../tram-form/get-snapshots` ja `.../tram-form/sp-driver/read/get-snapshots` — üldist `control-forms/get-snapshots` endpointi TRAM ei kasuta.
