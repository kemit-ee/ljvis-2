-- liquibase formatted sql
-- changeset ljvis:20260831110000-rollback ignore:true splitStatements:false

-- Taasta migreeritud uusimad read (võimalusel) ja kustuta veerg.
WITH latest AS (
    SELECT DISTINCT ON (sp_driver_form_key) id
    FROM forms.sp_driver_form
    ORDER BY sp_driver_form_key, created_at DESC
)
UPDATE forms.sp_driver_form s
SET result_type = s.additional_measure,
    additional_measure = NULL
FROM latest l
WHERE s.id = l.id
  AND s.result_type = 'ALUSTATI'
  AND s.additional_measure IN ('ETTEKIRJUTUS', 'JUHTIMISELT', 'AREST', 'AUTOVEDU');

WITH latest AS (
    SELECT DISTINCT ON (sp_teammate_form_key) id
    FROM forms.sp_teammate_form
    ORDER BY sp_teammate_form_key, created_at DESC
)
UPDATE forms.sp_teammate_form s
SET result_type = s.additional_measure,
    additional_measure = NULL
FROM latest l
WHERE s.id = l.id
  AND s.result_type = 'ALUSTATI'
  AND s.additional_measure IN ('ETTEKIRJUTUS', 'JUHTIMISELT', 'AREST', 'AUTOVEDU');

ALTER TABLE forms.sp_driver_form   DROP COLUMN IF EXISTS additional_measure;
ALTER TABLE forms.sp_teammate_form DROP COLUMN IF EXISTS additional_measure;
