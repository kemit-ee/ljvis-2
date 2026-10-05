# Andmekaardistus ja transformatsioonireeglid

**Seotud:** [strateegia](01-migratsioonistrateegia.md), [andmekvaliteet](03-andmekvaliteet.md).
Täpne väljade vastendus on kood: SQL-teisendused kaustas [`DSL/migration/sql/`](../../DSL/migration/sql/)
(versioonihalduses, iga fail on ühe vormitüübi kaardistus). See dokument annab ülevaate, reeglid ja
viited; väljade täielik loend on SQL-is, et dokument ja kood ei saaks lahku minna.

## 1. Lähte- ja sihtmudel

| LJVIS 1 | LJVIS 2 |
|---|---|
| EAV: `ControlForm` + `ControlFormValue (ClassifierName, Value, DateValue)` | Relatsioonilised vormitabelid skeemis `forms` (INSERT-only snapshot, loogiline võti + versioon) |
| `Control` + `ControlToFormBinding`: üks kontroll → mitu vormi | `forms.compound_form` (koondvorm) + alamvormid (`compound_form_key`) |
| `FormTypeName`, `FormVersion`, `ControlStage` | Vormitüüp = sihttabel, `version`, `status` |
| RavenDB `JobInspection` (V1), `JobInspectionV2` | `forms.labour_inspection_form` |
| `User`, `Versions` | Ei migreerita (autor säilib tekstina) |

## 2. Vormitüüp → sihttabel

| LJVIS 1 allikas | Sihttabel(id) | Teisendusfail | Märkused |
|---|---|---|---|
| `GoodRepute` | `forms.good_repute_form` | `01-transform-good-repute.sql` | Iseseisev; number `mv-<aasta>-<nr>` |
| `TransportInterruption` | `forms.compound_form` (sünteetiline vanem) + `forms.kv_form` | `02-…` | `kv_form` vajab vanemat; päris `Control`-grupeerimine on ülesanne |
| `ForeignViolate` | `forms.foreign_violation_form` | `03-…` | Iseseisev; `erru_message_id` ja `source_police_form_key` = NULL |
| `RoadControlCard2012` | `compound_form` + `vehicle_technical_form`; kui `RoadControlTrailer` = true/1 → `trailer_technical_form` | `04-…` | Marsruut tunnuse `migration.is_subtype` järgi |
| `Roadworthiness2012` | `compound_form` + `sp_driver_form`; kui `RoadWorthinessTeamMember` = true/1 → `sp_teammate_form` | `05-…` | Sõidu- ja puhkeaeg |
| `DangerousDelivery2012` | `compound_form` + `adr_form` | `06-…` | Kinnitatud haagise/meeskonna tunnused peatavad laadimise kuni marsruutimine on tehtud |
| RavenDB V1/V2 | `forms.labour_inspection_form` | `07-…` | V2: `Confirmed`/`Published` → `confirmed`; V1 staatust ei ole |
| `FuelSample` | — | — | Välja jäetud |

Koondvormi (`compound_form`) tekitab ETL koondkontrollide ühendamisel
(`Control` + `ControlToFormBinding`); sünteetilised numbrid on kujul `koond-…`.

## 3. Valitud väljade vastendus (näited)

Täielik vastendus on SQL-ides; allolev tabel näitab põhimõtet.

| LJVIS 1 `ClassifierName` | Sihtveerg | Teisendus |
|---|---|---|
| `Driver.Isikukood`, `Driver.Eesnimi`, `Driver.Perekonnanimi` | `personal_code`, `first_name`, `last_name` | trim; tühi → `'-'` (kinnitatud asendus) |
| `Driver.Birthdate`, `…ValjaandmiseKuupaev` | `date_of_birth`, `certificate_issue_date` | eelistatud `DateValue`, tekst `dd.MM.yyyy` varuks; ≤ tänane kuupäev |
| `Sobivus` | `fitness_status` | `sobiv`→`fit`, `sobimatu`→`unfit`; muu väärtus → blokeerija `unmapped_fitness` |
| `Vehicle.RegNo`, `.Country`, `.Mark`, `.Model`, `.VinCode` | `vehicle_reg_nr`, `vehicle_country_code`, `vehicle_make`, `vehicle_model`, `vehicle_vin` | riigikood `migration.safe_country_code` |
| `Company.RegistryNumber`, `.CompanyName`, `.CompanyAddress.*` | `company_reg_code`, `company_name`, `company_*` | trim, pikkuse kontroll (`migration.fit_text`) |
| `InspectionDate.Date` + `.Time` | `control_date` + `control_time` | `migration.safe_time`; ajavöönd Europe/Tallinn |
| `InspectionAddress.*` | `control_country_code`, `county`, `city`, `address` | otse |
| `Inspector.*` | `inspector_first_name`, `inspector_last_name`, `inspector_unit`, `inspector_profession` | otse |
| `otsus` (mitmene) | kontrolli tulemus (`outcomes`) | `migration.legacy_result`; puuduv/mitmene → blokeerija `unmapped_control_result` |
| Rikkumised/puudused (`rw_*`, `art*`, `VO_*` jt) | rikkumiste/puuduste JSON-väljad | [kinnitatud vastendused](violation-mapping-confirmed.csv) (58 võtit); avatud: [ettepanekud](violation-mapping-proposals.csv), [küsimused](violation-mapping-questions.csv) |
| RavenDB `kontrolli_kp` (V1) / `InspectionDate` (V2) | `inspection_date`, `created_at` | `migration.raven_scope_timestamp` |
| RavenDB `tooandja_reg_kood` / `CompanyRegNumber` | `company_reg_code` | otse |

## 4. Transformatsioonireeglid (üldised)

| # | Reegel | Põhjendus / mehhanism |
|---|---|---|
| R1 | **Ajavöönd:** kõik allika ajad on serveri kohalik aeg → `Europe/Tallinn` | `AT TIME ZONE 'Europe/Tallinn'` |
| R2 | **Staatus:** `Published`→`published`, `Confirmed`→`confirmed`; `Saved`/`Deleted` ei migreerita | Kokkulepe |
| R3 | **Ulatus:** `ControlForm.ControlledDate >= CUTOFF`; puuduvat kuupäeva **ei asendata** `CreatedDate`-iga (`missing_scope_date`) | `migration.control_form_scope` |
| R4 | **Seotud osad:** sama kontrolli vanemad `Confirmed`/`Published` osad kaasatakse (`inclusion_basis = included_control_peer`) | Kontrolli terviklikkus |
| R5 | **Dokumendinumber säilib:** `th-2026-00004/4` → `sub_form_number = 'th-2026-00004'`, `version = 4`; uusi numbreid ei genereerita; duplikaat/vigane number peatab jooksu | `identifiers.py` |
| R6 | **Logical key:** `nextval(forms.seq_*_key)`; pärast laadimist nihutatakse sequence'id olemasolevatest numbritest edasi (ei keerata tagasi) | Rakenduse numbrigeneraator |
| R7 | **Autor:** 4-astmeline varu: isikukood (kui kasutaja olemas) → nimi → `Versions.UserName` → `'-'`. Kontosid ei looda | `author_fallback` |
| R8 | **Kohustuslik väli puudub:** asendatakse `'-'` ainult kinnitatud nimekirja väljadel (23.09.2026 otsus); kuupäevad, tulemused, klassifikaatorid, rikkumised, marsruutimine ei kuulu asenduse alla | `migration.approved_text_default` |
| R9 | **Liiga pikk tekst:** ei kärbita vaikselt → viga `oversized_source_text`, kogu transaktsioon tühistub | `migration.target_text` |
| R10 | **Tundmatu klassifikaator / vastendamata rikkumine:** blokeerija; ajaloolised väärtused → mitteaktiivne klassifikaator `LJVIS1_OLD_VIOLATION` | [old-classifiers.md](old-classifiers.md) |
| R11 | **Mitmene väärtus skalaarses võtmes:** blokeerija `multivalue_scalar` (ei valita suvalist) | Preflight |
| R12 | **Idempotentsus:** `migration.form_link` hoiab lähte→siht seose; sama allika kordusjooks ei loo uusi vorme; muutunud allikas peatab jooksu | `source_changed` |
| R13 | **Lähteandmete jälg:** `migration.source_snapshot` + `source_manifest` (ridade arv + kontrollsumma tabeli kohta) | `--verify` |
| R14 | **Kasutajakontosid ega auditit ei migreerita** | Ulatus |
| R15 | **Manused:** failid kantakse eraldi S3-sse; vormi seos säilitatakse | [s3/](s3/README.md) |

## 5. Klassifikaatorite vastendus

- Kinnitatud: [violation-mapping-confirmed.csv](violation-mapping-confirmed.csv) (58 võtit / 131 väärtust).
- Avatud tasemed: **L1** (kandidaat olemas, tingimus kinnitamata), **L2** (vajab mudeli täiendust), **L3** (lähteinfo puudub).
  Ükski avatud rida ei tohi vaikimisi välja jääda.
- Raskusaste kontrollitakse **uue sihtklassifikaatori** järgi, mitte koodi prefiksi järgi.
- Vana koodide nimistu: [old-classifiers.md](old-classifiers.md), [old-classifier-sources.md](old-classifier-sources.md).
- Raportis on iga väljajätmine ja asendus (`disposition.csv`, `quality_report.csv`).

## 6. Käsitsi kontrollitavad „probleemvormid"

[client-review/](client-review/README.md): SQL, mis leiab vormid, mille migreerimine vajab otsust
(seoseta vormid, segastaatused, jm). Andmeomanik märgib iga vormi kohta `MIGREERI`/`EI_MIGREERI`/`SELGITADA`.

## 7. Teadaolevad lüngad (seis 02.10.2026)

- Rikkumiste ja puuduste vastendus: 38 võtit ettepanekute tasemel, 4 küsimuste tasemel;
- ADR-i detailandmed ja SP rikkumiste massiivid on puudulikud;
- koondkontrollide grupeerimise osa (segastaatused, puuduv seos) vajab otsuseid;
- manuste ülekande lõplik ulatus.

Puudulik vastendus **blokeerib** tootmisjooksu. `--rehearsal` võimaldab osalist tulemust ainult ühekordses proovibaasis.
