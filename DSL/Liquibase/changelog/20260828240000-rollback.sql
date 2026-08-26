-- liquibase formatted sql
-- changeset ljvis:20260828240000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    FOR v_key IN
        SELECT classifier_key FROM classifier.classifier
        WHERE code IN ('NCR_REQUEST_STATUS', 'NCR_RESPONSE_STATUS', 'NCR_ACK_STATUS',
                       'NCR_CHECK_RESULT', 'NCR_INFRINGEMENT_CATEGORY',
                       'NCR_PENALTY_TYPE_REQUESTED', 'NCR_PENALTY_TYPE_IMPOSED_REQ',
                       'NCR_PENALTY_TYPE_IMPOSED_RES', 'NCR_IS_EXECUTED',
                       'NCR_REQUEST_SOURCE', 'NCR_REQUEST_PURPOSE')
    LOOP
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END LOOP;
END $$;
