-- liquibase formatted sql
-- changeset ljvis:20260909223000 splitStatements:false
--
-- Norra on MOVEHUBi liikmesriikide tabeli järgi ERRU-ga liitunud.

DO $$
DECLARE
    v_classifier_key BIGINT;
BEGIN
    SELECT classifier_key
      INTO v_classifier_key
      FROM classifier.classifier
     WHERE code = 'ERRU_MEMBER'
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_classifier_key IS NULL THEN
        RAISE EXCEPTION 'ERRU_MEMBER classifier does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM classifier.classifier_value
         WHERE classifier_key = v_classifier_key
           AND code = 'NO'
    ) THEN
        INSERT INTO classifier.classifier_value
            (classifier_value_key, classifier_key, code, name, valid_from, created_by)
        VALUES
            (nextval('classifier.seq_classifier_value_key'), v_classifier_key,
             'NO', 'Norra', CURRENT_DATE, 'ljvis2');
    END IF;
END $$;
