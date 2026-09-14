-- liquibase formatted sql
-- changeset ljvis:20261116110000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('NU_MESSAGE_STATUS', 'NU_MEMBER_STATE_STATUS')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
