# LJVIS2 kontrollvormide UI-testid (Playwright)

Brauseripõhised testid kogu kontrollvormide moodulile: iga vormi loomine,
kohustuslike väljade **validatsioon** ja **korrektne salvestumine**. Vea korral
tekib `tulemus/` alla detailne sammukirjeldus + ekraanipilt ning HTML-raport.

## Kiirülevaade

| Spec | Kate |
|---|---|
| `smoke.spec.ts` | sessioon, rollid, kõik loomislehed avanevad JS-vigadeta |
| `compound-form.spec.ts` | koondvorm: validatsioon, salvestus + andmete püsivus, #280 P2/P4 |
| `tram-form.spec.ts` | TRAM kontrollkaart: validatsioon, salvestus, #280 P1/P3/P5/P6 |
| `foreign-violation.spec.ts` | välisriigi rikkumine: validatsioon + salvestus |
| `labour-inspection.spec.ts` | tööinspektsiooni akt: validatsioon + salvestus + tulevikukuupäev |
| `good-repute.spec.ts` | hea maine: validatsioon + tingimuslikud väljad + salvestus |
| `compound-subforms.spec.ts` | autojuhi/ADR/tehno alamvormid koondvormi loomisvoos |
| `erru.spec.ts` | CTUD/CGR/RSI/NCR: leht avaneb + tühja vormi validatsioon |

## Käivitamine

### Kõige lihtsam — kõik ise (pinu + seemned + testid + teardown)

```bash
bash tests/playwright/run.sh
```

Nõuab: Docker, Node 20+, `psql` (PostgreSQL klient). Skript:
1. tõstab üles `docker-compose.ci.yml` pinu (`-p ljvis-pw`),
2. lisab `tests/bootstrap/seed_classifiers.sql` + `seed_extra.sql`,
3. käivitab Playwright'i (mis stardib frontendi vite-dev serveri pordil **3101**,
   suunatuna CI-stack'i Ruuterile `:9086` / TIM-ile `:9085` / tara-mock'ile `:9888`),
4. teeb teardowni (`KEEP_STACK=1` jätab pinu püsti).

Playwright'i argumendid saab edasi anda: `bash tests/playwright/run.sh --grep TRAM`.

### Käsitsi (pinu juba käib)

```bash
cd tests/playwright
npm ci
npx playwright install chromium
# Vaikeväärtused eeldavad docker-compose.ci.yml porte (9086/9085/9888):
npx playwright test
```

Muude portide vastu: `LJVIS_API_URL`, `LJVIS_TIM_URL`, `LJVIS_TARA_URL`,
`LJVIS_DEV_PORT`, `LJVIS_BASE_URL`.

## Tulemused (`tulemus/`)

- **`KOKKUVÕTE.md`** — viimase jooksu kokkuvõte (kokku/läbis/kukkus, ebaõnnestunud
  testide loend). Alati olemas.
- **`<projekt>__<spec>__<test>/kirjeldus.md`** + **`ekraanipilt-*.png`** — tekib
  ainult ebaõnnestunud testide kohta: nummerdatud sammuloend ✅/❌, ebaõnnestunud
  samm, veateade + URL, ekraanipilt.
- **`html-raport/`** — täielik Playwright HTML-raport (`.gitignore`'s, CI laeb
  artefaktina). Vaata: `npx playwright show-report tests/playwright/tulemus/html-raport`.

`tulemus/` puhastatakse iga jooksu alguses. Tulemuste versioonihaldusse viimine on
**käsitsi** — kui soovid ebaõnnestumise git'i jäädvustada:

```bash
git add tests/playwright/tulemus && git commit -m "test(playwright): jooksu tulemus"
```

## Autentimine

`global-setup.ts` logib sisse kolm testrolli dev-login endpointi kaudu
(`POST :9086/ljvis/auth/dev/dev-login`) ja salvestab `customJwtCookie` küpsise
`tulemus/.auth/*.json` failidesse. Testkasutajad (`docker/tara-mock/identities.json`):

| Roll | Isikukood | Õigused |
|---|---|---|
| Super Admin | `60001019906` | kõik, sh ERRU |
| Ametnik | `60002020202` | kõik kontrollvormide `.write`, ei ERRU |
| Õigusteta | `60001017869` | puuduvad (kodaniku vaade) |

## Piirangud

- **X-tee otsingud** (sõiduk / isik / ettevõte / MTR) tagastavad CI-mock'is
  404/`{}` — autofill-i ei testita, ainult „ei leitud" veateate radu.
- **ERRU „Saada"** rada ei testita (sõltub ERRU taustsüsteemist) — ainult
  mustandi/validatsiooni tasand.
