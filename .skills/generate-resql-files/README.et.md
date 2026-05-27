# Generate-RESQL skilli kasutusjuhend

See skill aitab LJVIS projektis genereerida ja uuendada DSL-artefakte:
- Ruuter DSL (`.yml`)
- RESQL SQL (`.sql`)
- seotud dokumentatsioon

## Asukoht

- `.skills/generate-resql-files/SKILL.md`
- `.skills/generate-resql-files/references/specification_format.md`
- `.skills/generate-resql-files/README.et.md` (see fail)
- `.skills/generate-resql-files/README.en.md`

## Kiire kasutuselevõtt

1. Kopeeri kaust `.skills/generate-resql-files/` projekti juurkausta (`.skills/` alla).
2. Kontrolli, et olemas on vajalikud sisendmaterjalid (nt `docs/data_model.md`, `planning/docs/permissions-matrix.md` või fallback `docs/permissions-matrix.md`).
3. Veendu, et projekti DSL kokkulepped on samad (Ruuter + RESQL path-loogika, issue/PR reeglid).

## Peamised reeglid

- Üks fail = üks operatsioon.
- RESQL teed peavad olema versioneeritud (`v1`).
- Ruuteri sisekutsed RESQL-i peavad kasutama kuju `[#LOCAL_RESQL]/ljvis2/v1/...`.
- RESQL SQL failid peavad paiknema kujul `DSL/Resql/<MEETOD>/<moodul>/<entiteet>/v1/...`.
- GET on lubatud ainult parameetrita listidele.
- Enne commit'i tee sanity-check teevastavusele.

## Soovituslik töövoog

1. Valmista ette sisenddokumendid (epic, andmemudel, õigused, vead).
2. Loo või uuenda DSL failid vastavalt skilli reeglitele.
3. Uuenda README + paigaldusjuhend vastavas epicu kaustas.
4. Käivita sanity-check (`Ruuter URL -> RESQL SQL fail olemas`).
5. Tee commit, push ja uuenda dedicated task issue + PR.

## Sanity-check näidis

```bash
for f in $(find DSL/Ruuter/api -name '*.yml'); do
  method=$(echo "$f" | sed -E 's|^DSL/Ruuter/api/([^/]+)/.*|\1|')
  grep -o '\[#LOCAL_RESQL\]/[^" ]*' "$f" | while read -r url; do
    rel=$(echo "$url" | sed 's|^\[#LOCAL_RESQL\]/||')
    project=$(echo "$rel" | cut -d'/' -f1)
    version=$(echo "$rel" | cut -d'/' -f2)
    module=$(echo "$rel" | cut -d'/' -f3)
    entity=$(echo "$rel" | cut -d'/' -f4)
    operation=$(echo "$rel" | cut -d'/' -f5)
    test "$project" = "ljvis2" || echo "MISSING_PROJECT: $f -> $url"
    test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
  done
done
```

Kui väljundis on `MISSING:`, paranda teed enne merge'i.

## Jagamine sõbrale

- Soovituslik: jaga Git branchi/PR-i, kus skilli kaust on sees.
- Alternatiiv: jaga kogu `.skills/generate-resql-files/` kaust ZIP-ina.
- Kontrolli alati, et sihtprojektis oleks sama DSL struktuuri loogika.
