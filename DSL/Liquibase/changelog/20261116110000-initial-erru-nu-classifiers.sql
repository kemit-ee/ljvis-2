-- liquibase formatted sql
-- changeset ljvis:20261116110000 ignore:true splitStatements:false

DO $$
DECLARE
    v_clf RECORD;
    v_val RECORD;
    v_key BIGINT;
BEGIN
    FOR v_clf IN
        SELECT * FROM (VALUES
            ('NU_MESSAGE_STATUS',       'NU sobimatusteate staatus',        'NU sobimatusteate elukaare staatused (LJVIS2-159 — normatiivne allikas kõigile teistele NU funktsionaalsustele). Väljaminev: initiated -> sent. Sissetulev: received -> acknowledged. Mõlemad: error.'),
            ('NU_MEMBER_STATE_STATUS',  'NU koondkinnituse staatus',        'Riigipõhise NU koondkinnituse tulemus (ERRU 3.5 NotifyUnfitness_Acknowledgement, nurMemberStateType/@statusCode: OK/Timeout/NotAvailable). Riigitasandi Timeout/NotAvailable ei ole veaolukord teate tasemel.')
        ) AS t(code, name, description)
    LOOP
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = v_clf.code) THEN
            RAISE NOTICE '% already exists, skipping', v_clf.code;
            CONTINUE;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), v_clf.code, v_clf.name, v_clf.description, 'ljvis2')
        RETURNING classifier_key INTO v_key;

        FOR v_val IN
            SELECT * FROM (VALUES
                ('NU_MESSAGE_STATUS',       'initiated',                 'Salvestatud'),
                ('NU_MESSAGE_STATUS',       'sent',                      'Saadetud'),
                ('NU_MESSAGE_STATUS',       'received',                  'Saabunud'),
                ('NU_MESSAGE_STATUS',       'acknowledged',              'Kinnitus saadetud'),
                ('NU_MESSAGE_STATUS',       'error',                     'Viga'),
                ('NU_MEMBER_STATE_STATUS',  'OK',                        'Vastu võetud'),
                ('NU_MEMBER_STATE_STATUS',  'Timeout',                   'Aegumine'),
                ('NU_MEMBER_STATE_STATUS',  'NotAvailable',              'Ei ole saadaval')
            ) AS t(clf_code, code, name)
            WHERE t.clf_code = v_clf.code
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_key, v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
        END LOOP;
    END LOOP;
END $$;
