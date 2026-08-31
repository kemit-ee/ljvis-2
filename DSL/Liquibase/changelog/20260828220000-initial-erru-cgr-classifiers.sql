-- liquibase formatted sql
-- changeset ljvis:20260828220000 splitStatements:false
--
-- ERRU CGR klassifikaatorid (7 tk): CGR_REQUEST_STATUS, CGR_MEMBER_STATE_STATUS,
-- CGR_REQUEST_SOURCE, CGR_REQUEST_PURPOSE, CGR_SEARCH_METHOD,
-- CERTIFICATE_VALIDITY, FITNESS_STATUS.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
DECLARE
    v_clf RECORD;
    v_val RECORD;
    v_key BIGINT;
BEGIN
    FOR v_clf IN
        SELECT * FROM (VALUES
            ('CGR_REQUEST_STATUS',       'CGR päringu staatus',               'CGR mainepäringu elukaare staatused. Väljaminev: initiated -> sent (sent on lõppolek, koondvastus salvestatakse samas kutses). Sissetulev: received -> answered. Mõlemad: error. (LJVIS2-66)'),
            ('CGR_MEMBER_STATE_STATUS',  'Liikmesriigi vastuse staatus',       'Riigipõhise CGR vastuse tulemus. Found/NotFound tagastab sihtriik; Timeout/NotAvailable määrab ERRU keskus (Hub) ega ole veaolukord. (LJVIS2-66)'),
            ('CGR_REQUEST_SOURCE',       'CGR päringu allikas',                'Päringu esitamise allikas (ERRU globalRequestSourceType).'),
            ('CGR_REQUEST_PURPOSE',      'CGR päringu eesmärk',                'Päringu esitamise eesmärk (ERRU globalRequestPurposeType). Heartbeat-proovipäringuid CGR raames ei salvestata.'),
            ('CGR_SEARCH_METHOD',        'CGR otsingu meetod',                 'Vastuse koostamiseks kasutatud otsingu meetod: NYSIIS (nime foneetiline otsing) või CPC (tunnistuse number).'),
            ('CERTIFICATE_VALIDITY',     'Kutsetunnistuse kehtivus',           'Ametialase pädevuse tunnistuse (CPC) kehtivus vastuse hetkel.'),
            ('FITNESS_STATUS',           'Sobivuse staatus',                   'Veokorraldusjuhi sobivuse hinnang (Fit/Unfit).')
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
                -- CGR_REQUEST_STATUS (LJVIS2-66 kuvasildid)
                ('CGR_REQUEST_STATUS',       'initiated',                 'Salvestatud'),
                ('CGR_REQUEST_STATUS',       'sent',                      'Päring saadetud'),
                ('CGR_REQUEST_STATUS',       'received',                  'Saabunud'),
                ('CGR_REQUEST_STATUS',       'answered',                  'Vastus saadetud'),
                ('CGR_REQUEST_STATUS',       'error',                     'Viga'),
                -- CGR_MEMBER_STATE_STATUS (LJVIS2-66 kuvasildid)
                ('CGR_MEMBER_STATE_STATUS',  'Found',                     'Vastus saadud'),
                ('CGR_MEMBER_STATE_STATUS',  'NotFound',                  'Sihtriigilt vastus saadud, kuid leidu ei tuvastatud'),
                ('CGR_MEMBER_STATE_STATUS',  'Timeout',                   'Sihtriik ei vastanud õigeaegselt'),
                ('CGR_MEMBER_STATE_STATUS',  'NotAvailable',              'Sihtriik ei ole kättesaadav'),
                -- CGR_REQUEST_SOURCE (globalRequestSourceType)
                ('CGR_REQUEST_SOURCE',       'CA',                        'Pädev asutus'),
                ('CGR_REQUEST_SOURCE',       'RSI',                       'Tehnokontroll'),
                ('CGR_REQUEST_SOURCE',       'Hub',                       'ERRU keskus'),
                ('CGR_REQUEST_SOURCE',       'Other',                     'Muu'),
                -- CGR_REQUEST_PURPOSE (globalRequestPurposeType)
                ('CGR_REQUEST_PURPOSE',      'Issue',                     'Väljaandmine'),
                ('CGR_REQUEST_PURPOSE',      'Control',                   'Järelevalve'),
                ('CGR_REQUEST_PURPOSE',      'Heartbeat',                 'Elumärk'),
                ('CGR_REQUEST_PURPOSE',      'Other',                     'Muu'),
                -- CGR_SEARCH_METHOD (cgrTransportManagerResponseType/@searchMethod, real ERRU 3.5 XSD —
                -- .ai/ERRU_DOCS/ERRU 3.0 tehniline spetsifikatsioon/.../3.0/CheckGoodRepute_Types.xsd)
                ('CGR_SEARCH_METHOD',        'NYSIIS',                    'Nime foneetilise otsingu järgi'),
                ('CGR_SEARCH_METHOD',        'CPC',                       'Kutsetunnistuse numbri järgi'),
                ('CGR_SEARCH_METHOD',        'Local',                     'Siseriikliku andmestiku järgi'),
                -- CERTIFICATE_VALIDITY
                ('CERTIFICATE_VALIDITY',     'Valid',                     'Kehtiv'),
                ('CERTIFICATE_VALIDITY',     'Invalid',                   'Kehtetu'),
                -- FITNESS_STATUS
                ('FITNESS_STATUS',           'Fit',                       'Sobib'),
                ('FITNESS_STATUS',           'Unfit',                     'Ei sobi')
            ) AS t(clf_code, code, name)
            WHERE t.clf_code = v_clf.code
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_key, v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
        END LOOP;
    END LOOP;
END $$;
