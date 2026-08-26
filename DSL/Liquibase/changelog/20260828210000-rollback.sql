-- liquibase formatted sql
-- changeset ljvis:20260828210000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('CTUD_REQUEST_STATUS', 'CTUD_RESPONSE_STATUS', 'CTUD_DIRECTION',
                       'CTUD_REQUEST_SOURCE', 'CTUD_REQUEST_PURPOSE', 'CTUD_SEARCH_METHOD',
                       'COMMUNITY_LICENCE_STATUS', 'COMMUNITY_LICENCE_TYPE',
                       'RISK_BAND', 'COMPETENT_AUTHORITY')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
