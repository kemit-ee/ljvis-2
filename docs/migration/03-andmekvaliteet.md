# Andmekvaliteedi kriteeriumid, kontroll ja raportid

**Seotud:** [strateegia](01-migratsioonistrateegia.md), [kaardistus](02-andmekaardistus.md).
Migratsioon loetakse lõpetatuks alles siis, kui **kõik kriteeriumid K1–K12** on täidetud ja
[lõppraport](05-lopliku-migratsiooni-raport.md) esitatud.

## 1. Kriteeriumid

Iga kriteerium on mõõdetav: kontrollmehhanism annab tulemuse (ETL kontroll, SQL või käsitsi).

| ID | Kriteerium | Kontroll | Läbimiskriteerium |
|---|---|---|---|
| K1 | **Katvus** – iga ulatuses olev lähtevorm on migreeritud või põhjendatult välja jäetud | `disposition.csv`, `99-verify.sql` | Iga `eligible` vormi kohta on `form_link`; iga väljajätmine põhjendatud; `missing_target_links` = 0 |
| K2 | **Arvude ühtivus** – lähte- ja sihtvormide arv tüübi kaupa | `summary.json` (katvus), `--verify` | Erinevus 0 (v.a. dokumenteeritud väljajätmised) |
| K3 | **Duplikaadid puuduvad** | `--verify`: `duplicate_form_number`, `duplicate_target_link`, `logical_key_has_multiple_numbers` | Kõik 0 |
| K4 | **Viiteterviklikkus** – iga alamvorm viitab olemasolevale koondvormile | `dangling_target_link`, `missing_parent` | 0 |
| K5 | **Koondkontrollid õiged** – kontrolli osad ei lähe katki ega seo omavahel sidumata kontrolle | `split_compound_control`, `unrelated_controls_merged` | 0 |
| K6 | **Dokumendinumbrid säilivad** | `identifiers.mismatches` | 0 vahet lähte- ja sihtnumbris |
| K7 | **Lähteandmete jälg** – staging säilitab lähteandmed | `source_manifest` kontrollsumma vs `source_snapshot` | Kõik tabelid ühtivad |
| K8 | **Kohustuslikud väljad** – asendused ainult kinnitatud nimekirjast | `quality_report.csv` (`applied_default`, `approval_basis`) | Kinnitamata asendusi 0 |
| K9 | **Vastendamata väärtused** – klassifikaatorid, tulemused, rikkumised | `finding.csv` (`unmapped_*`, `unsupported_subtype`, `multivalue_scalar`) | Blokeerijaid 0 |
| K10 | **Väärtuste ülekanne** – äriväljad ühtivad valimil | Valimkontroll (≥ 10 vormi tüübi kohta + probleemvormid) | 100% valimi vormidest sama sisu |
| K11 | **Idempotentsus** – kordusjooks ei muuda andmeid | `./run.sh` kaks korda | Teine jooks: uusi vorme 0 |
| K12 | **Funktsionaalne vastuvõtt** – otsing, vaatamine, PDF, õigused toimivad migreeritud vormidel | Käsitsi kontrollnimekiri | Kõik punktid läbitud |

Lisaks on **blokeerijad** (jooksu peatajad), mida ETL kontrollib ise: `scope_unresolved`,
`multivalue_scalar`, `source_changed`, `linked_source_missing`, `linked_scope_changed`,
`source_configuration_changed`, `unsupported_subtype`, `mapping_code_changed`, `unmapped_fitness`,
`invalid_source_document_number`, `invalid_source_form_version`, `source_document_number_collision`,
`conflicting_shared_source_header`, `oversized_source_text`.

## 2. Kontrollide käivitamine

```bash
cd DSL/migration
./run.sh --verify                           # viimase jooksu terviklikkuse kontroll, nullist erinev exit = viga
psql -X -v ON_ERROR_STOP=1 -v run_id=<uuid> -f sql/99-verify.sql   # täiendav loetav aruanne
psql -X -v run_id=<uuid> -f sql/98-guard-multivalue.sql            # mitmese väärtuse leiud
```

## 3. Tulemuse tõlgendus

| Exit / `migration.run.status` | Tähendus | Tegevus |
|---|---|---|
| `0` / `succeeded` | Tehnilised kontrollid läbitud | Tee K10 ja K12 käsitsi |
| `2` / `blocked` | Blokeerijad; vorme ei laaditud | Paranda põhjused, korda |
| `2` / `needs_review` | Osaline proovilaadimine | **Ei sobi tootmiseks** |
| `1` / `failed` | Ühendus-, SQL- või terviklikkuse viga | Vaata `failure.json` |

## 4. Raportid

Iga jooksu kaust `DSL/migration/runs/<RUN_ID>/` (Gitis ei ole; sisaldab isikuandmeid):

| Fail | Sisu |
|---|---|
| `summary.json` | Ajapiir, koopia tunnus, koodi hash, staatus, lähte- ja sihtvormide katvus, leiud |
| `finding.csv` | Blokeerijad/hoiatused vormi ID-ga |
| `disposition.csv` | Iga ekstraheeritud vormi kaasamise/väljajätmise põhjus |
| `quality_report.csv` | Rakendatud vaikeväärtused ja lahendamata vastendused |
| `*.log`, `failure.json` | Ekstraktorite logid; vea põhjus |

Raportitega seotud dokumendid: [migratsioonitesti raport](04-migratsioonitesti-raport.md),
[lõpliku migratsiooni raport](05-lopliku-migratsiooni-raport.md).

## 5. Valimkontroll (K10)

1. Iga vormitüübi kohta: 10 juhuslikku vormi (`ORDER BY random()` fikseeritud seemnega, seeme raportis).
2. Lisaks: kõik [client-review](client-review/README.md) vormid ja vähemalt 2 koondkontrolli täielikult (auto + haagis + juht/teine juht).
3. Võrdlus vanas ja uues UI-s: väljad, rikkumised, osavormid, staatus, kuupäevad, autor, number.
4. Tulemus tabelisse: vormi ID, tulemus (OK/Viga), märkus, kontrollija, kuupäev.

## 6. Isikuandmete käitlus

`staging.*` ja `migration.source_snapshot` sisaldavad isikukoode. Ligipääs on piiratud migratsiooni rollile;
säilitustähtaeg ja vastutaja kinnitatakse enne live-andmetega proovi (strateegia D-6). Raportikaustad ja varukoopiad
kuuluvad sama reegli alla. ETL ei kustuta tõendusmaterjali automaatselt.
