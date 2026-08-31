-- liquibase formatted sql
-- changeset ljvis:20260828210000 splitStatements:false
--
-- ERRU CTUD klassifikaatorid (10 tk): CTUD_REQUEST_STATUS, CTUD_RESPONSE_STATUS,
-- CTUD_DIRECTION, CTUD_REQUEST_SOURCE, CTUD_REQUEST_PURPOSE, CTUD_SEARCH_METHOD,
-- COMMUNITY_LICENCE_STATUS, COMMUNITY_LICENCE_TYPE, RISK_BAND, COMPETENT_AUTHORITY.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.
-- COUNTRY klassifikaator peab olema eelnevalt laetud (20260828205000).

DO $$
DECLARE
    v_clf RECORD;
    v_val RECORD;
    v_key BIGINT;
BEGIN
    FOR v_clf IN
        SELECT * FROM (VALUES
            ('CTUD_REQUEST_STATUS',      'CTUD päringu staatus',              'CTUD päringu elukaare staatused. Väljaminev: initiated -> sent -> responded. Sissetulev: received -> answered. Mõlemad: error. (LJVIS2-142)'),
            ('CTUD_RESPONSE_STATUS',     'CTUD vastuse staatus',              'Sihtriigi vastuse tulemus. Found/NotFound tagastab sihtriik; Timeout/NotAvailable määrab ERRU keskus (Hub) ega ole veaolukord. (LJVIS2-142)'),
            ('CTUD_DIRECTION',           'CTUD päringu suund',                'Kas Eesti küsib teiselt liikmesriigilt (outgoing) või teine liikmesriik küsib Eestilt (incoming).'),
            ('CTUD_REQUEST_SOURCE',      'CTUD päringu allikas',              'Päringu esitamise allikas (ERRU globalRequestSourceType).'),
            ('CTUD_REQUEST_PURPOSE',     'CTUD päringu eesmärk',              'Päringu esitamise eesmärk (ERRU globalRequestPurposeType). Heartbeat on olemas standardis, kuid CTUD raames elumärgi kontrolle ei teenindata.'),
            ('CTUD_SEARCH_METHOD',       'CTUD otsingu meetod',               'Vastuse koostamiseks kasutatud otsingu meetod.'),
            ('COMMUNITY_LICENCE_STATUS', 'Ühenduse tegevusloa staatus',       'Ühenduse tegevusloa staatus registris (ERRU globalCommunityLicenceStatusType).'),
            ('COMMUNITY_LICENCE_TYPE',   'Ühenduse tegevusloa liik',          'Ühenduse tegevusloa liik registris (ERRU globalCommunityLicenceType).'),
            ('RISK_BAND',                'Riskivahemik',                      'Veoettevõtja riskivahemik. Eesti tagastab Grey kuni riskihindamise mooduli (EPIC 16) valmimiseni.'),
            ('COMPETENT_AUTHORITY',      'Pädev asutus',                      'ERRU sõnumivahetuses osalevad Eesti pädevad asutused. Kood on ERRU sõnumivormingus (EE-XXX).')
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
                -- CTUD_REQUEST_STATUS (LJVIS2-142 kuvasildid)
                ('CTUD_REQUEST_STATUS',      'initiated',                 'Algatatud'),
                ('CTUD_REQUEST_STATUS',      'sent',                      'Päring saadetud'),
                ('CTUD_REQUEST_STATUS',      'responded',                 'Vastus saadud'),
                ('CTUD_REQUEST_STATUS',      'received',                  'Saabunud'),
                ('CTUD_REQUEST_STATUS',      'answered',                  'Vastus saadetud'),
                ('CTUD_REQUEST_STATUS',      'error',                     'Viga'),
                -- CTUD_RESPONSE_STATUS (LJVIS2-142 kuvasildid)
                ('CTUD_RESPONSE_STATUS',     'Found',                     'Leitud'),
                ('CTUD_RESPONSE_STATUS',     'NotFound',                  'Ei leitud'),
                ('CTUD_RESPONSE_STATUS',     'Timeout',                   'Aegumine'),
                ('CTUD_RESPONSE_STATUS',     'NotAvailable',              'Ei ole saadaval'),
                -- CTUD_DIRECTION (LJVIS2-145 kuvasildid)
                ('CTUD_DIRECTION',           'outgoing',                  'Väljaminev'),
                ('CTUD_DIRECTION',           'incoming',                  'Sissetulev'),
                -- CTUD_REQUEST_SOURCE (globalRequestSourceType)
                ('CTUD_REQUEST_SOURCE',      'CA',                        'Pädev asutus'),
                ('CTUD_REQUEST_SOURCE',      'RSI',                       'Tehnokontroll'),
                ('CTUD_REQUEST_SOURCE',      'Hub',                       'ERRU keskus'),
                ('CTUD_REQUEST_SOURCE',      'Other',                     'Muu'),
                -- CTUD_REQUEST_PURPOSE (globalRequestPurposeType)
                ('CTUD_REQUEST_PURPOSE',     'Issue',                     'Väljaandmine'),
                ('CTUD_REQUEST_PURPOSE',     'Control',                   'Järelevalve'),
                ('CTUD_REQUEST_PURPOSE',     'Heartbeat',                 'Elumärk'),
                ('CTUD_REQUEST_PURPOSE',     'Other',                     'Muu'),
                -- CTUD_SEARCH_METHOD (ctudTransportUndertakingType/@searchMethod, real ERRU 3.5 XSD —
                -- .ai/ERRU_DOCS/ERRU 3.0 tehniline spetsifikatsioon/.../3.0/CheckTransportUndertakingData_Types.xsd.
                -- Corrected from the earlier 2.4-derived guess: no 'TrueCopy' value exists on this
                -- attribute (a true-copy number is just an alternate community-licence-number search
                -- input, not a distinct search-method outcome); 'Name' is actually 'CompanyName'; 'Local'
                -- was missing entirely.
                ('CTUD_SEARCH_METHOD',       'CompanyName',               'Veoettevõtja nime järgi'),
                ('CTUD_SEARCH_METHOD',       'CommunityLicence',          'Ühenduse tegevusloa numbri järgi'),
                ('CTUD_SEARCH_METHOD',       'VehicleRegistration',       'Sõiduki registreerimisnumbri järgi'),
                ('CTUD_SEARCH_METHOD',       'Local',                     'Siseriikliku andmestiku järgi'),
                -- COMMUNITY_LICENCE_STATUS (globalCommunityLicenceStatusType)
                ('COMMUNITY_LICENCE_STATUS', 'Active',                    'Kehtiv'),
                ('COMMUNITY_LICENCE_STATUS', 'Suspended',                 'Peatatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Withdrawn',                 'Kehtetuks tunnistatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Expired',                   'Aegunud'),
                ('COMMUNITY_LICENCE_STATUS', 'LostOrStolen',              'Kaotatud või varastatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Annulled',                  'Tühistatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Returned',                  'Tagastatud'),
                -- COMMUNITY_LICENCE_TYPE (globalCommunityLicenceType). Compact codes per the LJVIS2-144
                -- task example ("CommunityLicenceGoods"), which differs from the real ERRU 3.5 XSD's
                -- long literal strings ("Community licence for goods transport") — kept as the task's
                -- own contract, not silently switched to the XSD spelling; see .ai/erru-full-plan.md
                -- §"Открытые вопросы" for this task-vs-spec discrepancy. The 5th value below (light
                -- goods vehicles ≤3.5t) was added in ERRU 3.1 and is genuinely missing until now.
                ('COMMUNITY_LICENCE_TYPE',   'CommunityLicencePassenger', 'Ühenduse tegevusluba sõitjate veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'NationalLicencePassenger',  'Riigisisene tegevusluba sõitjate veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'CommunityLicenceGoods',     'Ühenduse tegevusluba veose veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'CommunityLicenceGoodsLight','Ühenduse tegevusluba veose veoks (kuni 3,5t sõidukid)'),
                ('COMMUNITY_LICENCE_TYPE',   'NationalLicenceGoods',      'Riigisisene tegevusluba veose veoks'),
                -- RISK_BAND (globalRiskBandType, real ERRU 3.5 XSD: Red/Amber/Green/Grey). Corrected
                -- from the earlier guess 'Yellow', which is not a valid ERRU wire value — confirmed
                -- also by MOVEHUB's own simulated test data (ErruTestData.xml) using 'Amber'.
                ('RISK_BAND',                'Red',                       'Punane'),
                ('RISK_BAND',                'Amber',                     'Kollakas'),
                ('RISK_BAND',                'Green',                     'Roheline'),
                ('RISK_BAND',                'Grey',                      'Hall'),
                -- COMPETENT_AUTHORITY (ERRU wire codes)
                ('COMPETENT_AUTHORITY',      'EE-PPA',                    'Politsei- ja Piirivalveamet'),
                ('COMPETENT_AUTHORITY',      'EE-TI',                     'Tööinspektsioon'),
                ('COMPETENT_AUTHORITY',      'EE-MTA',                    'Maksu- ja Tolliamet'),
                ('COMPETENT_AUTHORITY',      'EE-ERAA',                   'Eesti Rahvusvaheliste Autovedajate Assotsiatsioon'),
                ('COMPETENT_AUTHORITY',      'EE-KLIM',                   'Kliimaministeerium'),
                ('COMPETENT_AUTHORITY',      'EE-TRAM',                   'Transpordiamet')
            ) AS t(clf_code, code, name)
            WHERE t.clf_code = v_clf.code
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_key, v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
        END LOOP;
    END LOOP;
END $$;
