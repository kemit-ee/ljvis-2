-- liquibase formatted sql
-- changeset ljvis:20260907100000 splitStatements:false
--
-- Seab COUNTRY klassifikaatori 27 EL liikmesriigi väärtustele description = 'ERRU_MEMBER'.

DO $$
DECLARE
    v_country_key BIGINT;
BEGIN
    SELECT c.classifier_key INTO v_country_key
    FROM classifier.classifier c
    WHERE c.code = 'COUNTRY';

    IF NOT FOUND THEN
        RAISE NOTICE 'COUNTRY classifier not found, skipping';
        RETURN;
    END IF;

    UPDATE classifier.classifier_value
    SET description = 'ERRU_MEMBER'
    WHERE classifier_key = v_country_key
      AND code IN ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
                   'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
                   'PL','PT','RO','SK','SI','ES','SE');
END $$;
