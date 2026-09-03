# Kasutusjuhendi ekraanipildid

`capture.mjs` genereerib Playwrightiga kasutus- ja administraatorijuhendi ekraanipildid
otse jooksvast LJVIS2-st. Pildid kirjutatakse:

- `docs/user-guide/images/<jaotis>/…`
- `docs/admin-guide/images/<jaotis>/…`

Peatükkide `.md`-failid viitavad neile suhtelise teega (`![…](images/…)`).

## Eeltingimused

1. Kohalik stack käib:
   ```
   docker compose up -d
   ```
2. Seemneandmed on laetud (kasutaja `60001019906` "Super Admin" + klassifikaatorid +
   riskiskoori näidisvormid). Vajadusel:
   ```
   for f in DSL/Liquibase/test/*.sql; do
     docker compose exec -T database psql -U ljvis -d ljvis_db -f - < "$f"
   done
   ```
3. Frontend dev-server käib pordil 3001:
   ```
   cd frontend && npm run dev
   ```

## Käivitamine

```
cd docs/screenshots
npm install
npx playwright install chromium
node capture.mjs              # kõik pildid
node capture.mjs sisselogimine  # ainult nimemustriga sobivad
```

Skript logib sisse ise (tara-mock, isikukood keskkonnamuutujast `LJVIS_PERSONAL_CODE`,
vaikimisi `60001019906`). Baas-URL-i saab muuta muutujaga `LJVIS_BASE`.

**Keel:** skript sunnib UI keeleks eesti (`localStorage i18nextLng=et`). tara-mock
autentimislehte teadlikult ei pildistata.

## Raamatu ehitamine

```
cd docs
mdbook build          # -> docs/book/
mdbook serve          # http://localhost:3000
```

## Confluence'i publitseerimine

```
CONFLUENCE_TOKEN=<token> python3 scripts/publish-guide-to-confluence.py           # päris
CONFLUENCE_TOKEN=<token> python3 scripts/publish-guide-to-confluence.py --dry-run # proov
```

Loob/uuendab lehepuu wiki.kemit.ee ruumis LIA juurlehe „LJVIS2 kasutusjuhend" all,
järgides `docs/SUMMARY.md` järjekorda. Lehed on nummerdatud („LJVIS2 04 · Sisselogimine"),
nii et Confluence'i tähestikuline järjestus = lugemisjärjekord. Iga lehe all on lingid
eelmisele ja järgmisele peatükile.

Vajab `pandoc`-i ja `npx`-i (mermaid → SVG). Idempotentne — olemasolevad lehed
uuendatakse; vanad meie prefiksiga lehed, mida uues struktuuris pole, tõstetakse
prügikasti. Siselingid → Confluence'i lehelingid, pildid ja diagrammid → manused.

## Näidisvormid

`DSL/Liquibase/test/20260903100000-user-guide-fixture-forms.sql` loob viis täidetud
liitvormi eri staatustes + alamvormid ning ühe välisriigi rikkumise vormi manustega:

| Võti | Number | Staatus | Alamvormid |
|---|---|---|---|
| 95002001 | KOOND-2026-4001 | avaldatud | sõidu-/puhkeaeg, mootorsõiduki tehnokontroll, ADR |
| 95002002 | KOOND-2026-4002 | kinnitatud | sõidu-/puhkeaeg, autoveo katkestamine, haagise tehnokontroll |
| 95002003 | KOOND-2026-4003 | salvestatud | sõidu-/puhkeaeg, mootorsõiduki tehnokontroll |
| 95002004 | AJALUGU-2026-4004 | 3 versiooni | sõidu-/puhkeaeg |
| 95002005 | KOOND-2026-4005 | kinnitatud | meeskonnaliikme SP-vorm, ADR |
| 95003001 | VR-2026-3001 | salvestatud | (välisriigi rikkumise vorm + 3 manust) |

Alamvormide JSON-väljad on osaliselt täidetud — vormide **struktuur** on pildistamiseks
korrektne, kuid mõned raadionupu/kontrollkasti valikud ei pruugi olla ette valitud.

## Märkus mermaid-diagrammide kohta

Peatükkides on `mermaid` koodiplokke. Nende renderdamiseks mdbookis on vaja
`mdbook-mermaid` eeltöötlejat (`cargo install mdbook-mermaid && mdbook-mermaid install .`).
Ilma selleta kuvatakse diagrammid koodiplokkidena.
