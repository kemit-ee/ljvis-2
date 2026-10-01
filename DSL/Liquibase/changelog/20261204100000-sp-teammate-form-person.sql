-- liquibase formatted sql
-- changeset ljvis:20261204100000 ignore:true splitStatements:false
--
-- Meeskonnaliikme isikuandmed forms.sp_teammate_form tabelisse.
-- Seni oli meeskonnaliige seotud ainult compound_form.drivers[1] kaudu, mistõttu
-- teammate-vormi ei saanud isiku järgi otsida ja eToimik ei saanud kontrollida
-- meeskonnaliiget. Veerud täidetakse koondvormi meeskonnaliikme plokist.
--

ALTER TABLE forms.sp_teammate_form
    ADD COLUMN IF NOT EXISTS person_code_ee          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS person_first_name       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS person_last_name        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS person_citizenship_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS person_code_foreign     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS person_birth_date       DATE;

COMMENT ON COLUMN forms.sp_teammate_form.person_code_ee          IS 'Meeskonnaliikme Eesti isikukood';
COMMENT ON COLUMN forms.sp_teammate_form.person_first_name       IS 'Meeskonnaliikme eesnimi';
COMMENT ON COLUMN forms.sp_teammate_form.person_last_name        IS 'Meeskonnaliikme perenimi';
COMMENT ON COLUMN forms.sp_teammate_form.person_citizenship_code IS 'Meeskonnaliikme kodakondsuse kood';
COMMENT ON COLUMN forms.sp_teammate_form.person_code_foreign     IS 'Meeskonnaliikme välisriigi isikukood';
COMMENT ON COLUMN forms.sp_teammate_form.person_birth_date       IS 'Meeskonnaliikme sünniaeg';

CREATE INDEX IF NOT EXISTS idx_sp_teammate_person_code_ee
    ON forms.sp_teammate_form (person_code_ee) WHERE person_code_ee IS NOT NULL;

-- Backfill olemasolevatele ridadele koondvormi drivers[1] põhjal (viimane koondvormi versioon)
UPDATE forms.sp_teammate_form st
SET person_code_ee          = NULLIF(COALESCE(d->>'personalCodeEe', d->>'personal_code_ee'), ''),
    person_first_name       = NULLIF(COALESCE(d->>'firstName', d->>'first_name'), ''),
    person_last_name        = NULLIF(COALESCE(d->>'lastName', d->>'last_name'), ''),
    person_citizenship_code = NULLIF(COALESCE(d->>'citizenshipCode', d->>'citizenship_code'), ''),
    person_code_foreign     = NULLIF(COALESCE(d->>'personalCodeForeign', d->>'personal_code_foreign'), ''),
    person_birth_date       = CASE
        WHEN COALESCE(d->>'birthDate', d->>'birth_date') ~ '^\d{4}-\d{2}-\d{2}'
        THEN LEFT(COALESCE(d->>'birthDate', d->>'birth_date'), 10)::date END
FROM (
    SELECT DISTINCT ON (compound_form_key) compound_form_key, drivers
    FROM forms.compound_form
    ORDER BY compound_form_key, created_at DESC
) cf,
LATERAL (SELECT cf.drivers -> 1 AS d) x
WHERE cf.compound_form_key = st.compound_form_key
  AND x.d IS NOT NULL
  AND st.person_code_ee IS NULL
  AND st.person_first_name IS NULL;
