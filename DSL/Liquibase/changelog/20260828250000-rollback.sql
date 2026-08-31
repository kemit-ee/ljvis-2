-- liquibase formatted sql
-- changeset ljvis:20260828250000-rollback ignore:true

DO $$
DECLARE v_key BIGINT;
BEGIN
    SELECT classifier_key INTO v_key FROM classifier.classifier WHERE code = 'NCR_COMMUNITY_LICENCE_STATUS';
    IF FOUND THEN
        DELETE FROM classifier.classifier_value WHERE classifier_key = v_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_key;
    END IF;
END $$;
