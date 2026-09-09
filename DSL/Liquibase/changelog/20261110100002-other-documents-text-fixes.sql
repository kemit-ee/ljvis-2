-- liquibase formatted sql
-- changeset ljvis:20261110100002 ignore:true splitStatements:false
--
-- Uuendab OTHER_DOCUMENTS klassifikaatori tekste pabervormiga vastavusse:
--
--   SOIDUKIJUHI_TOO_LEPING — "VÕI sellest lepingust osapoolte kinnitatud väljavõte"
--     lisatud, "(riigisisesel veoseveol kontroll TÖR-st)" eemaldatud
--     (pabervorm ei tee sellel punktil vahet, tekst kehtib mõlema veoliigi jaoks).
--

DO $$
DECLARE
    v_key BIGINT;
BEGIN
    SELECT classifier_key INTO v_key
    FROM classifier.classifier
    WHERE code = 'OTHER_DOCUMENTS';

    IF v_key IS NULL THEN
        RAISE EXCEPTION 'Klassifikaator OTHER_DOCUMENTS puudub';
    END IF;

    UPDATE classifier.classifier_value
    SET name = 'Mootorsõidukijuhi töö- või võlaõiguslik leping või sellest lepingust osapoolte kinnitatud väljavõte'
    WHERE classifier_key = v_key
      AND code = 'SOIDUKIJUHI_TOO_LEPING';
END $$;
