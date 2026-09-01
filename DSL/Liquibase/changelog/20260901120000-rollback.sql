-- liquibase formatted sql
-- changeset ljvis:20260901120000-rollback ignore:true splitStatements:false
--
-- Rollback 20260901120000: eemaldab DANGEROUS_GOODS_INFRINGEMENTS_NEW
-- klassifikaatori ja kõik selle väärtused.

DO $$
    DECLARE
        v_clf_key BIGINT;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        DELETE FROM classifier.classifier_value WHERE classifier_key = v_clf_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_clf_key;
    END $$;
