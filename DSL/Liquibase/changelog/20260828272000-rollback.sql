-- liquibase formatted sql
-- changeset ljvis:20260828272000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('EHAK')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
