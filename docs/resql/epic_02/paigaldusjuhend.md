---
epic: EPIC 02 - Kasutajate haldamine
document_type: installation_guide
generated: 2026-05-27
version: 1.0
---

# EPIC 02 — Paigaldusjuhend

## 1. Eeltingimused

- PostgreSQL andmebaas on olemas ja EPIC 02 DDL on rakendatud (`docs/data_model.md` DDL skriptid)
- Ruuter ja RESQL teenused on käivitatud ja konfigureeritud
- `feature/epic_02_dsl` haru on merge'itud `dev` harusse

## 2. Failistruktuur

```
Source repo:
DSL/Resql/POST/iam/user/v1/            ← kasutaja RESQL päringud
DSL/Resql/POST/iam/user_group_membership/v1/  ← liikmelisuse RESQL päringud
DSL/Resql/POST/iam/user_group/v1/      ← kasutajagrupi RESQL päringud
DSL/Resql/POST/iam/organisation/v1/    ← asutuste kataloog
DSL/Resql/GET/iam/permission/v1/       ← õiguste kataloog
DSL/Resql/POST/state_updater/user_account_latest/   ← snapshot rebuild
DSL/Resql/POST/state_updater/user_group_latest/     ← snapshot rebuild
DSL/Ruuter/api/POST/v1/admin/users/    ← kasutajate Ruuter vood
DSL/Ruuter/api/POST/v1/admin/user-groups/  ← kasutajagruppide Ruuter vood
DSL/Ruuter/api/POST/v1/admin/organisations/  ← asutuste Ruuter vood
DSL/Ruuter/api/GET/v1/admin/permissions/    ← õiguste Ruuter vood
DSL/Ruuter/mockapi/POST/v1/admin/     ← mock Ruuter vood
DSL/Ruuter/mockapi/GET/v1/admin/      ← mock GET Ruuter vood

Runtime:
/DSL/ljvis2/POST/iam/user/v1/
/DSL/ljvis2/POST/iam/user_group_membership/v1/
/DSL/ljvis2/POST/iam/user_group/v1/
/DSL/ljvis2/POST/iam/organisation/v1/
/DSL/ljvis2/GET/iam/permission/v1/
/DSL/ljvis2/POST/state_updater/user_account_latest/
/DSL/ljvis2/POST/state_updater/user_group_latest/
/DSL/api/POST/v1/admin/users/
/DSL/api/POST/v1/admin/user-groups/
/DSL/api/POST/v1/admin/organisations/
/DSL/api/GET/v1/admin/permissions/
/DSL/mockapi/v1/admin/
/DSL/mockapi/v1/admin/
```

## 3. Kontroll pärast paigaldust

Kontrolli, et Ruuteri ja RESQL vahelised teevastavused on korrektsed:

```bash
for f in $(find DSL/Ruuter/api DSL/Ruuter/mockapi -name '*.yml'); do
  method=$(echo "$f" | sed -E 's|^DSL/Ruuter/(api|mockapi)/([^/]+)/.*|\2|')
  grep -o '\[#LOCAL_RESQL\]/[^" ]*' "$f" | while read -r url; do
    rel=$(echo "$url" | sed 's|^\[#LOCAL_RESQL\]/||')
    project=$(echo "$rel" | cut -d'/' -f1)
    segment2=$(echo "$rel" | cut -d'/' -f2)
    test "$project" = "ljvis2" || echo "MISSING_PROJECT: $f -> $url"
    if [ "$segment2" = "state_updater" ]; then
      entity=$(echo "$rel" | cut -d'/' -f3)
      operation=$(echo "$rel" | cut -d'/' -f4)
      test -f "DSL/Resql/${method}/state_updater/${entity}/${operation}.sql" || echo "MISSING: $f -> $url"
    else
      module=$(echo "$rel" | cut -d'/' -f2)
      entity=$(echo "$rel" | cut -d'/' -f3)
      version=$(echo "$rel" | cut -d'/' -f4)
      operation=$(echo "$rel" | cut -d'/' -f5)
      test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
    fi
  done
done
```

Kui väljundis on `MISSING:`, paranda teed enne lõplikku paigaldust.

## 4. Mock endpointide kasutamine

Mock YML-id asuvad `DSL/Ruuter/mockapi/POST/v1/admin/**/*.yml` ja `DSL/Ruuter/mockapi/GET/v1/admin/**/*.yml`. Failinimed peegeldavad production `api` puud 1:1, kuid kutsuvad jätkuvalt `mock_*.sql` RESQL faile ja tagastavad hardcoded testandmeid. Mock puu `.guard` failid on tingimusteta lubavad. Sobivad arendus- ja integratsioonitestimiseks enne andmebaasi seadistamist.

## 5. Muudatuste logi

| Versioon | Kuupäev | Muudatus | Autor |
|---------|---------|---------|-------|
| 1.0 | 2026-05-27 | Algne paigaldusjuhend Epic 02 jaoks. | cascade |
