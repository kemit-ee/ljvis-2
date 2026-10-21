# Esimese superadmini loomine

> **Oluline:** see on ainus viis esimese kasutaja loomiseks. Ilma selleta ei saa keegi rakendusse sisse logida ega kasutajaid hallata. Tee see **iga keskkonna** (DEV, TEST, PRELIVE, PROD) esmasel paigaldusel pärast Liquibase migratsiooni.

Pärast esmast paigaldust laadib Liquibase tabelitesse `users.organisation`,
`users.permission` ja `users.user_group` algandmed (vt `DSL/Liquibase/changelog/`).
Liquibase ei loo ühtegi kasutajat (`users.user_account`) ega superadmini
kasutajagruppi. Loo esimene kasutaja käsitsi andmebaasis. Sellel kasutajal peab olema
õigus teisi kasutajaid hallata.

Looge esimene kasutaja ja tema kasutajagrupp alloleva SQL-skriptiga. Rakenduse kasutajaliidese kaudu saab kasutajaid luua alles siis, kui vähemalt ühel kasutajal on kasutajate haldamise õigus.

## Eeldused

- Liquibase migratsioon on lõpetanud (Kubernetesis jookseb see `resql-ljvis` Helm chart'i wave -1 Job'ina, vt peatükk „Paigaldus ja keskkonnad (devops)“).
- Ligipääs keskkonna LJVIS andmebaasile (RDS `ljvis2-<keskkond>-main`, andmebaas `ljvis2`). Ühenduse andmed on AWS SSM-is kataloogis `/ljvis2/<keskkond>/db/main/ljvis2/` (`host`, `database`, `username`, `password`). RDS asub privaatvõrgus, seega ühenduge keskkonna kaudu, kuhu Teil on ligipääs.
- Esimese kasutaja isikukood ja asutuse kood.

## Asutuste nimekiri

Asutuste algandmed on laaditud Liquibase'i failiga
`DSL/Liquibase/changelog/20260828300000-initial-organisations.sql`. Järgmine päring
näitab asutuse nime ja koodi. SQL-skript vajab asutuse välja `code` väärtust.

```sql
SELECT id, name, code FROM users.organisation ORDER BY name;
```

Näiteks Kliimaministeeriumi rea leiab nii:

```sql
SELECT id, name, code FROM users.organisation WHERE name ILIKE '%kliimaministeerium%';
```

Väljundis olev `code` (nt `KLIM`, `TRAM`, `PPA`, `TI`, `MTA`, `ERAA`) läheb alloleva skripti `v_org_code` muutujasse.

## Superadmini loomise SQL-skript

Skript teeb kolm asja: (1) loob "Super Admin Group" kasutajagrupi, mille õiguste hulk on kõigi hetkel `users.permission` tabelis olevate õiguste kogum ja mis kehtib **kõigi asutuste** ulatuses, (2) loob selle konkreetse kasutaja, ja (3) on idempotentne — teistkordsel käivitamisel duplikaate ei teki.

**Enne käivitamist muutke ainult ploki `DO $$ ... $$` alguses olevaid muutujaid** (`v_personal_code`, `v_first_name`, `v_last_name`, `v_email`, `v_phone`, `v_org_code`, `v_job_title`).

```sql
BEGIN;

DO $$
DECLARE
    -- Muuda need väärtused enne käivitamist:
    v_personal_code TEXT := '38001010000';       -- superadmini isikukood
    v_first_name    TEXT := 'Eesnimi';
    v_last_name     TEXT := 'Perekonnanimi';
    v_email         TEXT := 'eesnimi.perekonnanimi@asutus.ee';
    v_phone         TEXT := NULL;                -- valikuline
    v_org_code      TEXT := 'KLIM';               -- vt „Asutuste nimekiri“, nt 'KLIM' Kliimaministeeriumi jaoks
    v_job_title     TEXT := 'Peakasutaja';

    v_org_id           BIGINT;
    v_org_name         VARCHAR(500);
    v_super_group_key  BIGINT;
BEGIN
    SELECT id, name INTO v_org_id, v_org_name
    FROM users.organisation WHERE code = v_org_code;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Asutust koodiga % ei leitud (vt SELECT * FROM users.organisation)', v_org_code;
    END IF;

    -- 1. Superadmini kasutajagrupp: kõik hetkel olemasolevad õigused, kõik asutused.
    IF NOT EXISTS (SELECT 1 FROM users.user_group WHERE name = 'Super Admin Group') THEN
        INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
        SELECT
            nextval('users.seq_user_group_key'),
            'Super Admin Group',
            (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[]) FROM users.organisation),
            (SELECT COALESCE(ARRAY_AGG(code ORDER BY code), ARRAY[]::TEXT[]) FROM users.permission),
            'admin-setup';
    END IF;

    SELECT user_group_key INTO v_super_group_key
    FROM users.user_group WHERE name = 'Super Admin Group'
    ORDER BY created_at DESC LIMIT 1;

    -- 2. Kasutaja ise.
    IF NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = v_personal_code) THEN
        INSERT INTO users.user_account (
            user_account_key, personal_code, first_name, last_name,
            organisation_id, organisation_name, job_title,
            email, phone, access_start, status, user_groups, created_by
        ) VALUES (
            nextval('users.seq_user_account_key'), v_personal_code, v_first_name, v_last_name,
            v_org_id, v_org_name, v_job_title,
            v_email, v_phone, CURRENT_DATE, 'active', ARRAY[v_super_group_key], 'admin-setup'
        );
    ELSE
        RAISE NOTICE 'Kasutaja isikukoodiga % on juba olemas, uut rida ei lisatud.', v_personal_code;
    END IF;
END $$;

COMMIT;
```

> **Märkus:** kui `users.user_group` tabelis on juba varasemast rida nimega "Super Admin Group" (nt see skript on korra juba käivitatud enne uue õiguse lisandumist Liquibase migratsiooniga), siis õiguste kogum **ei uuene** automaatselt — grupp on samuti append-only. Uute õigustega grupi loomiseks tuleb kas kustutada vana rida (ei ole soovitatav, kui sellel on juba kasutajaid) või lisada uus rida uue nimega (nt `'Super Admin Group v2'`) ja siduda kasutaja käsitsi selle `user_group_key`-ga.

## Kontroll

```sql
SELECT ua.personal_code, ua.first_name, ua.last_name, ua.organisation_name, ua.status, ug.name AS role
FROM users.user_account ua, unnest(ua.user_groups) gk
JOIN users.user_group ug ON ug.user_group_key = gk
WHERE ua.personal_code = '38001010000';  -- sisesta lisatud isikukood
```

Pärast seda saab superadmin TARA kaudu sisse logida ning rakenduse **Haldus → Kasutajad** vaates edasisi kasutajaid ja kasutajagruppe kasutajaliidese kaudu luua (vt peatükk „Kasutajad“).
