-- liquibase formatted sql
-- changeset ljvis:20260828205000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    SELECT classifier_key INTO v_key FROM classifier.classifier WHERE code = 'COUNTRY';
    IF FOUND THEN
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END IF;
END $$;
