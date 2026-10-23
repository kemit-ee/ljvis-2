# Paralleelsed E2E-testid

API-testid töötavad neljas CI rühmas. Iga rühm kasutab eraldi GitHub Actionsi
runner'it ning oma Docker Compose'i pinu ja andmebaasi.

| Rühm | Testid |
|---|---|
| `core` | Asutused, õigused, kasutajad, klassifikaatorid ja põhilised kontrollvormid |
| `controls` | Tehnilised vormid, ADR, otsing, riskiskoor, kodanik, cron, teavitused ja logid |
| `erru` | CTUD, CGR, RSI, NCR, NU ja XML adapter |
| `xroad` | X-tee teenused, SOAP ning SQL- ja lepingutestid |

Täielik jaotus asub failis `tests/postman/groups.json`. Kontroll nõuab, et iga
kollektsioon kuuluks täpselt ühte rühma. Uue kollektsiooni lisamisel lisa see
samuti rühma. Ühe rühma sees säilib varasem kollektsioonide järjekord.

Käivita kohalikus keskkonnas kõik API-testid:

```bash
bash tests/postman/run-all.sh
```

Käivita ainult üks API rühm:

```bash
bash tests/postman/run-all.sh tests/postman/ci-stack-environment.json erru
```

Ära käivita neid käske samas arvutis korraga. Need kasutavad samu hosti porte
ja Compose'i projekti. CI paralleelsus on ohutu, sest runner'id on eraldi.

UI-testid kasutavad kolme nimega rühma: **Kontrollvormid**, **Liidestused ja
taustatööd** ning **Haldus ja otsing**. Failide fikseeritud jaotus asub failis
`tests/playwright/groups.json`. Kontroll nõuab, et iga testifail kuuluks täpselt
ühte rühma. Näiteks käivitab `bash tests/playwright/run.sh --group forms`
ainult kontrollvormide rühma.
Iga osa käivitab oma pinu ja sisselogimise ettevalmistuse. Ühe osa sees jääb
`workers: 1`, sest testid muudavad sama andmebaasi ja õigusi.

Kõik osad jooksevad lõpuni ka teise osa vea korral. API-raportite nimed on
`api-tests-<rühm>` ja UI-raportite nimed `playwright-tulemus-<rühm>`.
Koondkontrollide nimed `E2E Tests` ja `UI Tests` jäävad samaks. API viga peatab
Quality Gate'i. UI-testide senine nõuandev staatus ei muutu. UI vigadest teeb
issue ühe korra koondtöö, mitte iga osa eraldi.

Jaotus vähendab testide järjestikust käivitusaega. Pinu ehitus kordub igas
runner'is. Seetõttu suureneb samaaegsete runner'ite ja CI arvutusminutite kasutus.
Tegelik ajavõit tuleb mõõta esimeste täielike CI käivitustega. Olemasolevaid
päringutevahelisi pause ja korduskatsete arvu see muudatus ei vähenda.

## Ajamõõtmine ja brauserite vahemälu

Mõõtmine 2026-10-23 CI jooksudel (PR #667 ja #669): testid ise kestavad lühidalt (UI
kontrollvormid 3,6 min, liidestused 1,3 min, API ERRU kuus kollektsiooni kokku 3,8 min).
`run.sh` / `run-all.sh` sisemuses kulus 40–65% ajast pinu üles tõstmisele (`compose up
--build`, 3–4 min), mis kordub igas runneris. Frontendi build (~25 s), seemned ja teenuste
ootamine on tühised. Seetõttu ei kiirenda rühmade veelgi väiksemaks jagamine palju: iga uus
runner kordaks sama ettevalmistust. Suurim järgmine võimalus on Dockeri kihtide vahemälu.

- `tests/ci-timing.sh` mõõdab etappide kestuse. `tests/playwright/run.sh` ja
  `tests/postman/run-all.sh` trükivad lõpus tabeli, kirjutavad selle faili
  `tulemus/ajamootmine.md` (UI) või `reports/ajamootmine.md` (API) ning lisavad
  GitHub Actionsi töö kokkuvõttesse. Failid lähevad olemasolevate artefaktide hulka
  (`playwright-tulemus-<rühm>`, `api-tests-<rühm>`). Tabel tehakse ka vea korral.
  **Tabel ei sisalda runneri ettevalmistust** (checkout, apt, `npm ci`, brauseri
  paigaldus). Töö kogukestus on seetõttu 3–4 min pikem kui tabeli „Kokku". API tabelis
  arvestatakse Newmani etapi hulka ka järgmise `ci_phase`-ni jäävad mitte-Newman sammud.
- UI-töö salvestab Playwrighti Chromiumi vahemällu (`~/.cache/ms-playwright`, võti on OS,
  arhitektuur ja Playwrighti versioon). Vahemälu tabamuse korral paigaldatakse ainult
  süsteemipaketid (`playwright install-deps`). Ajavõit on tavaliselt paar sekundit, kuid
  vahemälu kaitseb brauseri allalaadimise aeglaste jooksude eest (üks jooks kulutas 8 min).
  Vahemälu jõuab `dev`-skoopi alles pärast merge'i ja esimest `dev`-jooksu; uue PR-i
  esimene jooks võib olla ikka miss.
- **Dockeri kihtide vahemälu.** `e2e` ja `ui-tests` tööd ehitavad rasked pildid
  (`xtr-inbound` Rust-build, `tara-mock` Go-build, `pdf-creator` pip, `tim` apt) enne
  `run.sh`/`run-all.sh` käivitamist sammuga `docker/bake-action` ja GitHub Actionsi vahemälu
  toel (`type=gha`, eraldi `scope` iga pildi kohta). Pildid märgistatakse compose'i
  vaikenimedega (`ljvis-ci-<teenus>` E2E-s, `ljvis-pw-<teenus>` UI-s) ja
  `CI_IMAGES_PREBUILT=1` korral käivitavad skriptid `compose up -d` **ilma `--build`'ita**,
  nii et compose kasutab valmis pilte ja ehitab ainult puuduvad (kerged). Ilma märgistuseta
  ei kasutanud compose bake'i vahemälu uuesti ja ehitas rasked pildid teist korda (mõõdetud:
  `compose up --build` jäi 3 min 34 s peale, ehkki vahemälu tabas). Samm on
  `continue-on-error`: kui eelehitus ebaõnnestub, ehitab compose puuduvad pildid ise.
  **Vahemälu kirjutatakse ainult `dev`-i pushil**, PR-id loevad `dev`-i vahemälu, kuid ei kirjuta
  oma skoopi (repo vahemälu piir on 10 GB ja PR-i skoop oleks kasutu teistele PR-idele).
  Vahemälu miss (nt esimene jooks pärast tühja vahemälu, uus Dockerfile) on **~2 min aeglasem**
  kui enne, sest rasked pildid ehitatakse bake'is, mitte compose'is. Hit-i korral on pinu
  käivitus ~1 min (enne 3–4 min). Kui eelehitus ebaõnnestub, ilmub töö kokkuvõttesse hoiatus. Ajavõitu näed `ajamootmine.md`
  reas „Pinu käivitus" ning töö sammu „Pre-build heavy CI images" kestusest.
- Järgmine otsus (rühmade jagamine) tuleks teha `ajamootmine.md` numbrite põhjal.
