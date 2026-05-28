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
- RESQL SQL failid peavad paiknema kujul `DSL/Resql/ljvis2/<MEETOD>/<moodul>/<entiteet>/v1/...`.
- `DSL/Ruuter/mockapi/**/*.yml` peab kutsuma ainult mock RESQL targeteid: `mock_<operatsioon>` või `mock_build`.
- GET on lubatud ainult parameetrita listidele.
- Enne commit'i tee sanity-check teevastavusele.
- `*_latest` snapshot rebuild SQL-id koonduvad `state_updater` moodulisse (`DSL/Resql/ljvis2/POST/state_updater/<entiteet>/build.sql`) — ilma versioonikihita. Ruuter kutsub neid `[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build` kaudu. Neil ei ole Ruuter YML-e ega `.guard` faile.
- Kui epic muudab skeemi, tuleb lisaks luua Liquibase triplet `DSL/Liquibase/changelog/` alla: `YYYYMMDDXXXX-selgitus-millega-tegu.sql`, `YYYYMMDDXXXX-selgitus-millega-tegu-rollback.sql`, `YYYYMMDDXXXX-selgitus-millega-tegu.xml`.
- Forward Liquibase SQL peab olema kaitstud: esmalt tabel olemasolu kontrolliga, seejärel puuduvad väljad `IF NOT EXISTS` loogikaga, et osaliselt olemasolev skeem saaks täieneda ilma katkestuseta.
- Uute või muudetud `_state` / `_status` ja `*_latest` tabelite jaoks tuleb lisada indeksid vastavalt päringute `WHERE`, `ORDER BY`, latest lookup ja rebuild mustritele.

## Soovituslik töövoog

1. Valmista ette sisenddokumendid (epic, andmemudel, õigused, vead).
2. Loo või uuenda DSL failid vastavalt skilli reeglitele.
3. Uuenda README + paigaldusjuhend vastavas epicu kaustas.
4. Käivita sanity-check (`Ruuter URL -> RESQL SQL fail olemas`).
5. Tee commit, push ja uuenda dedicated task issue + PR.

## Sanity-check näidis

```bash
for f in $(find DSL/Ruuter/api DSL/Ruuter/mockapi -name '*.yml'); do
  kind=$(echo "$f" | sed -E 's|^DSL/Ruuter/([^/]+)/.*|\1|')
  method=$(echo "$f" | sed -E 's|^DSL/Ruuter/(api|mockapi)/([^/]+)/.*|\2|')
  grep -o '\[#LOCAL_RESQL\]/[^" ]*' "$f" | while read -r url; do
    rel=$(echo "$url" | sed 's|^\[#LOCAL_RESQL\]/||')
    project=$(echo "$rel" | cut -d'/' -f1)
    segment2=$(echo "$rel" | cut -d'/' -f2)
    test "$project" = "ljvis2" || echo "MISSING_PROJECT: $f -> $url"
    if [ "$segment2" = "state_updater" ]; then
      entity=$(echo "$rel" | cut -d'/' -f3)
      operation=$(echo "$rel" | cut -d'/' -f4)
      if [ "$kind" = "mockapi" ] && [ "$operation" != "mock_build" ]; then
        echo "WRONG_TARGET: $f -> $url"
      fi
      if [ "$kind" = "api" ] && [ "$operation" = "mock_build" ]; then
        echo "WRONG_TARGET: $f -> $url"
      fi
      test -f "DSL/Resql/${method}/state_updater/${entity}/${operation}.sql" || echo "MISSING: $f -> $url"
    else
      version="$segment2"
      module=$(echo "$rel" | cut -d'/' -f3)
      entity=$(echo "$rel" | cut -d'/' -f4)
      operation=$(echo "$rel" | cut -d'/' -f5)
      if [ "$kind" = "mockapi" ] && ! echo "$operation" | grep -q '^mock_'; then
        echo "WRONG_TARGET: $f -> $url"
      fi
      if [ "$kind" = "api" ] && echo "$operation" | grep -q '^mock_'; then
        echo "WRONG_TARGET: $f -> $url"
      fi
      test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
    fi
  done
done
```

Kui väljundis on `MISSING:` või `WRONG_TARGET:`, paranda teed enne merge'i.

## Jagamine sõbrale

- Soovituslik: jaga Git branchi/PR-i, kus skilli kaust on sees.
- Alternatiiv: jaga kogu `.skills/generate-resql-files/` kaust ZIP-ina.
- Kontrolli alati, et sihtprojektis oleks sama DSL struktuuri loogika.
