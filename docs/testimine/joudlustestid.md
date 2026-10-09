# Jõudlus- ja koormustestid

**Hange:** HD4 Lisa 6 p.7 — Täitja teostab korduvkäivitatavad testid, esitab raporti ning tõendab
kokkulepitud sihtide täitmist. Nõutud: stsenaariumid, testandmed, skriptid, raportid.

**Seis (02.10.2026):** stsenaariumid, skriptid ja raporti genereerija on valmis. Testid on
**kirjutatud, kuid veel mitte jooksutatud**; allpool olev tulemuste tabel on täitmata ja sihid on
ettepanek, mille Tellija kinnitab. Raport koostatakse kohe pärast esimest jooksu
(`scripts/generate-perf-report.py`). Ühtegi tulemust ei ole siin ette kirjutatud.

## 1. Eesmärk

Tõendada, et LJVIS 2 (Ruuter → Resql → PostgreSQL) vastab kokkulepitud ajasihtidele tüüpilise
koormuse all, leida ülempiir ja jälgida ressursside kasvu pikal jooksul.

## 2. Tööriist ja struktuur

[k6](https://k6.io) (Grafana). Skriptid asuvad kaustas [`tests/performance/`](../../tests/performance/):

| Fail | Sisu |
|---|---|
| `k6/ljvis.js` | Stsenaariumid, profiilid, sihid (`thresholds`) |
| `k6/lib.js` | Sisselogimine, päringuabid |
| `fixtures/compound-form-save.json` | Koondvormi näidiskeha seemendamiseks ja kirjutusvooks |
| `run.sh` | Käivitus: tõstab CI-pinu üles, jooksutab k6 (lokaalselt või Dockeris), võtab pinu maha |
| `tulemus/*.json` | Jooksu väljund (Gitis ei ole) |
| `../../scripts/generate-perf-report.py` | Koostab tulemustabeli JSON-ist |

## 3. Stsenaariumid

| Nimi | Eesmärk | Koormus | Kestus |
|---|---|---|---|
| `smoke` | Skript ja keskkond töötavad | 1 kasutaja | 30 s |
| `load` | Tüüpiline tööaja koormus: **40 lugejat + 10 kirjutajat samaaegselt** | tõus 2 min, hoid 10 min, langus 1 min | 13 min |
| `stress` | Ülempiiri leidmine | lugejad 50 → 300, kirjutajad 10 → 75 | 13 min |
| `spike` | Äkiline tõus (nt hommikune sisselogimine) | 10 → 200 kasutajat 30 sekundiga | 6,5 min |
| `soak` | Mälu-, ühenduse- ja kasvuprobleemid | 20 lugejat + 5 kirjutajat | 2 h |

`VUS_SCALE=2` kahekordistab kõik profiilid.

**Lugemisvoog (ametnik):** sisselogimine → töölaua kokkuvõte → klassifikaatorite pakett → vormide otsing
(tüübi järgi ja sõiduki registrinumbri järgi) → teavituste nimekiri ja lugemata arv → riskiskooride nimekiri.
**Kirjutusvoog:** koondvormi salvestamine (`compound-form/edit/save`).
Kasutaja mõtlemisaeg on 1–5 s.

Mitte kaetud: X-tee teenused (koormus tuleb väliselt, testitakse X-tee testprotokolliga),
PDF-genereerimine, ERRU voog, manuste üleslaadimine. Need lisatakse eraldi stsenaariumina, kui
Tellija seda nõuab.

## 4. Sihid (ettepanek, kinnitada Tellijaga)

| Näitaja | Siht | Kus kontrollitakse |
|---|---|---|
| Lugemispäringu p95 | < 800 ms | `ljvis_read_duration` |
| Lugemispäringu p99 | < 2 000 ms | sama |
| Kirjutuspäringu p95 | < 1 500 ms | `ljvis_write_duration` |
| Kirjutuspäringu p99 | < 3 000 ms | sama |
| Vigade osakaal | < 1 % | `http_req_failed` |
| Kontrollide läbimine | > 99 % | `checks` |
| Taluvus | `load` profiil ilma sihtide rikkumiseta | k6 väljumiskood 0 |
| Ressursid | CPU < 80 %, mälu stabiilne `soak` jooksul (ei kasva monotoonselt) | Käsitsi: `docker stats` / Grafana |

k6 lõpetab nullist erineva koodiga, kui mõni siht rikutakse, seega sobib sama skript CI-sse või
perioodiliseks käivituseks.

## 5. Testandmed

- **Seemendus:** `setup()` loob `SEED_FORMS` (vaikimisi 50) koondvormi API kaudu (registrinumbrid `PERF0000…`).
- **Andmemaht:** vaikimisi väike. Realistliku mahu jaoks kasuta kas suuremat `SEED_FORMS` (nt 5000) või
  [migratsiooni](../migration/README.md) proovibaasi täismahus; tulemus tuleb märkida raportisse koos
  vormide arvuga tabelites `forms.*`.
- **Kasutajad:** `dev-login` (vt `tests/postman/ci-stack-environment.json`), saadaval ainult CI/dev/test keskkonnas.
  Tootmise vastu jõudlustesti ei tehta.

## 5a. Testandmete koristus

Testid loovad andmeid (koondvormid registrinumbriga `PERF…`). Baas on append-only, seega koristus on
rakenduse tavaline kustutamine: lisatakse staatusega `deleted` snapshot, vorm kaob otsingust ja nimekirjadest;
ajalugu, audit ja riskiskoori ajalugu jäävad alles (ADR-010 võib need hiljem arhiivi viia).

- **Käsitsi:** `python3 tests/performance/cleanup.py --base-url <url>` (kuivjooks; `--apply` kustutab). Vajab `dev-login`i.
- **Automaatselt:** CronManager töö `cleanup_perf_test_forms` (`DSL/CronManager/cleanup-perf-test-forms.yaml`)
  käivitub iga päev 00:00 ja kutsub sisemist voogu `cron/cleanup-perf-test-forms` (ei vaja sisselogimist). Voog märgib
  `deleted`-ks ainult vormid, mille **viimase snapshot'i lõi testkasutaja** (`60001019906`) ja mille registrinumber
  **algab** `PERF`; kuni 1000 vormi jooksu kohta.
- **Ajutine:** pealüliti puudub, töö jookseb igas keskkonnas, kuhu see deploy'takse; kaitseks on range valik (prefiks + looja). Eemalda CronManageri fail ja Ruuteri voog, kui testandmeid enam ei looda.
- Kontrollitud lokaalses CI-pinus: 5 `PERF` vormi märgiti kustutatuks, `XPERF9` ja `REAL001` jäid puutumata, kordusjooks on tühi.

## 6. Käivitamine

```bash
bash tests/performance/run.sh smoke        # kiire kontroll
bash tests/performance/run.sh load         # põhitest
SEED_FORMS=5000 bash tests/performance/run.sh load
BASE_URL=https://test.example.ee bash tests/performance/run.sh load   # olemasoleva keskkonna vastu (stack'i ei puututa)
python3 scripts/generate-perf-report.py > docs/testimine/joudlustestid-tulemused.md
```

Vajalik: Docker; k6 on valikuline (puudumisel kasutatakse `grafana/k6` image'it). Päring teise
keskkonna vastu eeldab, et seal on `dev-login` lubatud.

## 7. Testkeskkonna nõuded raporti jaoks

Raportisse märgitakse alati: commit, keskkonna ressursid (CPU/mälu/kettad Ruuterile, Resqlile, PostgreSQL-ile),
PostgreSQL versioon ja seadistus, andmemaht (ridade arv `forms.*`), k6 versioon, kuupäev.
Tulemused ei ole võrreldavad jooksude vahel, kui keskkond erineb.

## 8. Raporti vorm

| Stsenaarium | Kuupäev | Commit | Päringuid | Vigu % | p95 lugemine | p95 kirjutamine | Siht täidetud | Märkused |
|---|---|---|---|---|---|---|---|---|
| smoke | — | — | — | — | — | — | — | Pole jooksutatud |
| load | — | — | — | — | — | — | — | Pole jooksutatud |
| stress | — | — | — | — | — | — | — | Pole jooksutatud |
| spike | — | — | — | — | — | — | — | Pole jooksutatud |
| soak | — | — | — | — | — | — | — | Pole jooksutatud |

Raporti kohustuslikud osad pärast esimest jooksu: **kokkuvõte** (täidetud/mitte), **kitsaskohad**
(aeglasimad lõpp-punktid `http_req_duration{name:…}` järgi, aeglased SQL-päringud `pg_stat_statements` põhjal),
**soovitused** ja **kordusjooks** pärast parandusi.

## 9. Riskid ja piirangud

- CI-pinu on väike (üksik PostgreSQL, 0,5 CPU Ruuteritel); tulemus ei kehti otse tootmiskeskkonnale.
  Sihtide kinnitamiseks jooksuta testkeskkonnas, mis ligilähedane tootmisele.
- Kirjutusvoog loob andmeid; test tehakse alati puhta või ühekordse andmebaasiga.
- Sihid on esialgsed, kuni Tellija need kirjalikult kinnitab.
