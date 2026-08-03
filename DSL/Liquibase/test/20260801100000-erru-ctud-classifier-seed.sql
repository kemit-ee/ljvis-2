-- liquibase formatted sql
-- changeset ljvis:20260801100000 ignore:true splitStatements:false
--
-- Test/dev-only seed for the ERRU CTUD module (LJVIS2-142 / -143 / -144 / -145).
--
-- NOTE: the COUNTRY ("Riik") classifier is seeded by 20260526100001-seed-data.sql and is
-- already present in dev/CI. This file must NOT re-insert it. ctud_from / ctud_to /
-- vehicle_registration_country all reference COUNTRY.
--
-- Code values are the ERRU wire values, not invented codes: request source/purpose and
-- community licence status come verbatim from ERRU 2.4 Global_Types.xsd, which the 3.5
-- specification carries over unchanged. Two sets are taken from the 3.5 task spec instead
-- of 2.4, because 3.5 restructured them:
--   * COMMUNITY_LICENCE_TYPE — 2.4 used long literal strings ("Community licence for goods
--     transport"); the 3.5 spec example (LJVIS2-144) uses compact codes ("CommunityLicenceGoods").
--   * CTUD_SEARCH_METHOD — did not exist in 2.4 CCL at all (only CGR had searchMethod:
--     CPC/NYSIIS/Local). Values inferred from the 3.5 spec example ("CommunityLicence")
--     plus the three documented search criteria. Confirm against the real 3.5 XSD when available.
--
-- Competent-authority codes are stored in ERRU wire form (EE-PPA, ...) so that no
-- transformation step is needed between the database and the outgoing message.

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
                -- CTUD_SEARCH_METHOD
                ('CTUD_SEARCH_METHOD',       'CommunityLicence',          'Ühenduse tegevusloa numbri järgi'),
                ('CTUD_SEARCH_METHOD',       'TrueCopy',                  'Kinnitatud ärakirja numbri järgi'),
                ('CTUD_SEARCH_METHOD',       'Name',                      'Veoettevõtja nime järgi'),
                ('CTUD_SEARCH_METHOD',       'VehicleRegistration',       'Sõiduki registreerimisnumbri järgi'),
                -- COMMUNITY_LICENCE_STATUS (globalCommunityLicenceStatusType)
                ('COMMUNITY_LICENCE_STATUS', 'Active',                    'Kehtiv'),
                ('COMMUNITY_LICENCE_STATUS', 'Suspended',                 'Peatatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Withdrawn',                 'Kehtetuks tunnistatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Expired',                   'Aegunud'),
                ('COMMUNITY_LICENCE_STATUS', 'LostOrStolen',              'Kaotatud või varastatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Annulled',                  'Tühistatud'),
                ('COMMUNITY_LICENCE_STATUS', 'Returned',                  'Tagastatud'),
                -- COMMUNITY_LICENCE_TYPE (globalCommunityLicenceType, 3.5 compact codes)
                ('COMMUNITY_LICENCE_TYPE',   'CommunityLicencePassenger', 'Ühenduse tegevusluba sõitjate veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'NationalLicencePassenger',  'Riigisisene tegevusluba sõitjate veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'CommunityLicenceGoods',     'Ühenduse tegevusluba veose veoks'),
                ('COMMUNITY_LICENCE_TYPE',   'NationalLicenceGoods',      'Riigisisene tegevusluba veose veoks'),
                -- RISK_BAND
                ('RISK_BAND',                'Green',                     'Roheline'),
                ('RISK_BAND',                'Yellow',                    'Kollane'),
                ('RISK_BAND',                'Red',                       'Punane'),
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
