-- liquibase formatted sql
-- changeset ljvis:20260828275000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('EU_INFRINGEMENT', 'CARGO_CABOTAGE_VIOLATION', 'PASSENGER_CABOTAGE_VIOLATION')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
