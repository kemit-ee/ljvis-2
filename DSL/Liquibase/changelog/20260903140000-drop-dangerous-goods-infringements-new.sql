-- liquibase formatted sql
-- changeset ljvis:20260903140000 ignore:true splitStatements:false
--
-- DANGEROUS_GOODS_INFRINGEMENTS_NEW eemaldamine (LJVIS2 #231, epic #228).
--
-- See klassifikaator (lisatud 20260901120000) oli üles ehitatud vale
-- grupeeringuga (raskusaste, mitte kontrollkaardi punkt) ega vasta
-- kliimaministri määruse lisa 1 nõuetele. Asendatud klassifikaatoriga
-- ADR_CONTROL_CHECKPOINT (20260903120000, #229). Kuna vana klassifikaator ei
-- ole veel toodangus, ei jäeta seda "deprecated" seisu vaid kustutatakse.
--
-- Idempotentne: kui klassifikaatorit ei ole, on tegu no-op'iga.

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
            RAISE NOTICE 'DANGEROUS_GOODS_INFRINGEMENTS_NEW not present, nothing to drop';
            RETURN;
        END IF;

        DELETE FROM classifier.classifier_value WHERE classifier_key = v_clf_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_clf_key;
    END $$;
