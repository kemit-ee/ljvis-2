-- liquibase formatted sql
-- changeset ljvis:20261110100003 ignore:true splitStatements:false
--
-- Lisa forms.sp_teammate_form tabelile liini_number ja liini_nimetus veerud.
-- 20261110100001 lisas need ainult forms.sp_driver_form-ile, aga
-- drive-rest-form/teammate/*.sql pärivad neid ka sp_teammate_form-ilt
-- (PR #276) → 'column "liini_number" does not exist'. Sama semantika mis
-- sõiduki juhi vormil: liiniveo liini number ja nimetus sõitjateveo korral.
--

ALTER TABLE forms.sp_teammate_form
    ADD COLUMN IF NOT EXISTS liini_number  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS liini_nimetus VARCHAR(255);

COMMENT ON COLUMN forms.sp_teammate_form.liini_number  IS 'Liiniveo liini number. Täidetakse sõitjateveo korral.';
COMMENT ON COLUMN forms.sp_teammate_form.liini_nimetus IS 'Liiniveo liini nimetus. Täidetakse sõitjateveo korral.';
