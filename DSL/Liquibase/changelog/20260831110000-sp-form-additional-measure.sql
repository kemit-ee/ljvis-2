-- liquibase formatted sql
-- changeset ljvis:20260831110000 ignore:true splitStatements:false

-- Kontrolli tulemus: üks põhiotsus (result_type) + üks valikuline lisameede.
-- result_type jääb: KORRAS / HOIATUS / ALUSTATI. Uus veerg additional_measure
-- hoiab lisameedet: ETTEKIRJUTUS / JUHTIMISELT / AREST / AUTOVEDU (NULL = puudub).
--
-- Migratsioon: ainult iga vormi UUSIM snapshot-rida (kasutaja otsus). Vanemad
-- snapshot-read säilitavad vana result_type väärtuse (get-snapshot vaates
-- kuvatakse tulemus tühjana).

ALTER TABLE forms.sp_driver_form   ADD COLUMN additional_measure VARCHAR(30);
ALTER TABLE forms.sp_teammate_form ADD COLUMN additional_measure VARCHAR(30);

COMMENT ON COLUMN forms.sp_driver_form.additional_measure   IS 'Valikuline lisameede põhiotsuse (result_type) kõrval: ETTEKIRJUTUS / JUHTIMISELT / AREST / AUTOVEDU. NULL = lisameedet ei rakendatud.';
COMMENT ON COLUMN forms.sp_teammate_form.additional_measure IS 'Valikuline lisameede põhiotsuse (result_type) kõrval: ETTEKIRJUTUS / JUHTIMISELT / AREST / AUTOVEDU. NULL = lisameedet ei rakendatud.';

WITH latest AS (
    SELECT DISTINCT ON (sp_driver_form_key) id
    FROM forms.sp_driver_form
    ORDER BY sp_driver_form_key, created_at DESC
)
UPDATE forms.sp_driver_form s
SET additional_measure = s.result_type,
    result_type        = 'ALUSTATI'
FROM latest l
WHERE s.id = l.id
  AND s.result_type IN ('ETTEKIRJUTUS', 'JUHTIMISELT', 'AREST', 'AUTOVEDU');

WITH latest AS (
    SELECT DISTINCT ON (sp_teammate_form_key) id
    FROM forms.sp_teammate_form
    ORDER BY sp_teammate_form_key, created_at DESC
)
UPDATE forms.sp_teammate_form s
SET additional_measure = s.result_type,
    result_type        = 'ALUSTATI'
FROM latest l
WHERE s.id = l.id
  AND s.result_type IN ('ETTEKIRJUTUS', 'JUHTIMISELT', 'AREST', 'AUTOVEDU');
