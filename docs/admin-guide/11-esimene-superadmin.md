# Esimese superadmini loomine

> **Oluline:** see on ainus viis esimese kasutaja loomiseks. Ilma selleta ei saa keegi rakendusse sisse logida ega kasutajaid hallata. Tee see **iga keskkonna** (DEV, TEST, PRELIVE, PROD) esmasel paigaldusel pärast Liquibase migratsiooni.

Pärast esmast paigaldust on `users.organisation`, `users.permission` ja `users.user_group` tabelid Liquibase'i poolt automaatselt täidetud (vt Liquibase seemned `DSL/Liquibase/changelog/`), aga **ühtegi kasutajat (`users.user_account`) ega superadmini kasutajagruppi ei looda automaatselt**. Esimese kasutaja, kellel on õigus teisi kasutajaid hallata, peab looja käsitsi andmebaasi lisama.

Kuna kõik LJVIS2 tabelid on append-only (rida ei uuendata, vaid lisatakse uus "hetketõmmis"), tuleb kasutaja ja tema õigustegrupp luua ühekordse SQL-skriptiga, mitte rakenduse UI kaudu (UI eeldab, et esimene kasutaja juba on olemas).

## Eeldused

- Liquibase migratsioon on lõpetanud (Kubernetesis jookseb see `resql-ljvis` Helm chart'i wave -1 Job'ina, vt peatükk „Paigaldus ja keskkonnad (devops)“).
- Ligipääs keskkonna LJVIS andmebaasile (RDS `ljvis2-<keskkond>-main`, andmebaas `ljvis2`). Ühenduse andmed on AWS SSM-is kataloogis `/ljvis2/<keskkond>/db/main/ljvis2/` (`host`, `database`, `username`, `password`). RDS asub privaatvõrgus, seega ühendu keskkonna kaudu, kuhu sul on ligipääs.
- Esimese kasutaja isikukood ja asutuse kood.

## Asutuste nimekiri

Asutused on Liquibase seemnega (`DSL/Liquibase/changelog/20260828300000-initial-organisations.sql`) juba loodud. Et näha, milline kood millisele asutusele vastab (SQL-skriptis on vaja asutuse `code` väärtust):

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

**Enne käivitamist muuda ainult plokki `DO $$ ... $$` alguses olevaid muutujaid** (`v_personal_code`, `v_first_name`, `v_last_name`, `v_email`, `v_phone`, `v_org_code`, `v_job_title`).

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

> **Märkus:** kui `users.user_group` tabelis on juba varasemast rida nimega "Super Admin Group" (nt see skript on korra juba käivitatud enne uue õiguse lisandumist Liquibase migratsiooniga), siis õiguste kogum **ei uuene** automaatselt — grupp on samuti append-only. Uue õigustega grupi tekitamiseks tuleb kas kustutada vana rida (ei ole soovitatav, kui sellel on juba kasutajaid) või lisada uus rida uue nimega (nt `'Super Admin Group v2'`) ja siduda kasutaja käsitsi selle `user_group_key`-ga.

## Kontroll

```sql
SELECT ua.personal_code, ua.first_name, ua.last_name, ua.organisation_name, ua.status, ug.name AS role
FROM users.user_account ua, unnest(ua.user_groups) gk
JOIN users.user_group ug ON ug.user_group_key = gk
WHERE ua.personal_code = '38001010000';  -- sisesta lisatud isikukood
```

Peale seda saab superadmin TARA kaudu sisse logida ning rakenduse **Haldus → Kasutajad** vaates edasisi kasutajaid ja kasutajagruppe UI kaudu luua (vt peatükk „Kasutajad“).
