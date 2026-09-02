-- liquibase formatted sql
-- changeset ljvis:20260831100000-rollback ignore:true splitStatements:false

DO $$
DECLARE
    v_doc_key BIGINT;
    v_other_key BIGINT;
BEGIN
    SELECT classifier_key INTO v_doc_key   FROM classifier.classifier WHERE code = 'DOC_RIGHT_CHECK';
    SELECT classifier_key INTO v_other_key FROM classifier.classifier WHERE code = 'OTHER_DOCUMENTS';

    IF v_doc_key IS NOT NULL THEN
        UPDATE classifier.classifier_value
        SET name = 'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (sõitjatevedu)'
        WHERE classifier_key = v_doc_key AND code = 'TEGEVUSLOA_ARAKIRI_01';

        UPDATE classifier.classifier_value
        SET name = 'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (veosevedu)'
        WHERE classifier_key = v_doc_key AND code = 'TEGEVUSLOA_ARAKIRI_02';
    END IF;

    IF v_other_key IS NOT NULL THEN
        UPDATE classifier.classifier_value
        SET name = 'Veose saatedokument'
        WHERE classifier_key = v_other_key AND code = 'VEOSE_DOKUMENDID';
    END IF;
END $$;
