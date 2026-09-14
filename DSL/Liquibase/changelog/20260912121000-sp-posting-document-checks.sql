-- liquibase formatted sql
-- changeset ljvis:20260912121000 ignore:true splitStatements:false
DO $$
DECLARE
    v_classifier_key BIGINT;
    v_row RECORD;
BEGIN
    SELECT classifier_key INTO v_classifier_key
      FROM classifier.classifier
     WHERE code = 'OTHER_DOCUMENTS'
     ORDER BY created_at DESC LIMIT 1;

    FOR v_row IN SELECT * FROM (VALUES
        ('LAHETUSDEKLARATSIOON_PRAEGUNE',
         'Autojuht teostab vedu, mille osas rakendub Eestisse lähetamise nõue (lähetusdeklaratsiooni kontroll)'),
        ('LAHETUSDEKLARATSIOON_VARASEM',
         'Autojuht on eelnevalt teostanud veo, mille osas rakendus Eestisse lähetamise nõue (lähetusdeklaratsiooni kontroll)')
    ) AS t(code, name)
    LOOP
        INSERT INTO classifier.classifier_value
            (classifier_value_key, classifier_key, code, name, valid_from, created_by)
        SELECT nextval('classifier.seq_classifier_value_key'), v_classifier_key,
               v_row.code, v_row.name, CURRENT_DATE, 'system'
         WHERE v_classifier_key IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM classifier.classifier_value
                WHERE classifier_key = v_classifier_key AND code = v_row.code
           );
    END LOOP;
END $$;
