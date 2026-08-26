-- liquibase formatted sql
-- changeset ljvis:20260828220000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('CGR_REQUEST_STATUS', 'CGR_MEMBER_STATE_STATUS', 'CGR_REQUEST_SOURCE',
                       'CGR_REQUEST_PURPOSE', 'CGR_SEARCH_METHOD', 'CERTIFICATE_VALIDITY', 'FITNESS_STATUS')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
