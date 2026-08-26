-- liquibase formatted sql
-- changeset ljvis:20260828230000 splitStatements:false
--
-- ERRU RSI klassifikaatorid (5 tk): RSI_REQUEST_STATUS, RSI_RESPONSE_STATUS,
-- RSI_REQUEST_SOURCE, RSI_REQUEST_PURPOSE, RSI_VEHICLE_CATEGORY.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
DECLARE
    v_clf RECORD;
    v_val RECORD;
    v_key BIGINT;
BEGIN
    FOR v_clf IN
        SELECT * FROM (VALUES
            ('RSI_REQUEST_STATUS',      'RSI teate staatus',                 'RSI tehnokontrolli teate elukaare staatused. Väljaminev: initiated -> sent -> responded (vastus saabub eraldi korrelatsioonisõnumina). Sissetulev: received -> answered. Mõlemad: error (lõppolek, uuesti saatmist ei ole). (LJVIS2-146)'),
            ('RSI_RESPONSE_STATUS',     'RSI vastuse staatus',                'Sõiduki registreerimisriigi vastuse tulemus: OK (sõiduk leitud) või NotFound (sõidukit ei leitud). (LJVIS2-146/-147)'),
            ('RSI_REQUEST_SOURCE',      'RSI päringu allikas',                'Teate esitamise allikas (ERRU globalRequestSourceType). Väljaminevatel RSI teadetel süsteemi määratud konstant RSI.'),
            ('RSI_REQUEST_PURPOSE',     'RSI päringu eesmärk',                'Teate esitamise eesmärk (ERRU globalRequestPurposeType). Väljaminevatel RSI teadetel süsteemi määratud konstant Control.'),
            ('RSI_VEHICLE_CATEGORY',    'RSI sõiduki kategooria',             'ERRU rsiVehicleCategoryType — sõiduki/haagise kategooria tehnokontrolli teates. Kodumaine kategooria teisendatakse saatmisel; kui vastet ei ole, jääb väli tühjaks käsitsi valimiseks (LJVIS2-148 §4.1).')
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
                -- RSI_REQUEST_STATUS (LJVIS2-146 kuvasildid)
                ('RSI_REQUEST_STATUS',      'initiated',                 'Salvestatud'),
                ('RSI_REQUEST_STATUS',      'sent',                      'Teade saadetud'),
                ('RSI_REQUEST_STATUS',      'responded',                 'Vastus saadud'),
                ('RSI_REQUEST_STATUS',      'received',                  'Saabunud'),
                ('RSI_REQUEST_STATUS',      'answered',                  'Vastus saadetud'),
                ('RSI_REQUEST_STATUS',      'error',                     'Viga'),
                -- RSI_RESPONSE_STATUS
                ('RSI_RESPONSE_STATUS',     'OK',                        'Sõiduk leitud'),
                ('RSI_RESPONSE_STATUS',     'NotFound',                  'Sõidukit ei leitud'),
                -- RSI_REQUEST_SOURCE (globalRequestSourceType)
                ('RSI_REQUEST_SOURCE',      'CA',                        'Pädev asutus'),
                ('RSI_REQUEST_SOURCE',      'RSI',                       'Tehnokontroll'),
                ('RSI_REQUEST_SOURCE',      'Hub',                       'ERRU keskus'),
                ('RSI_REQUEST_SOURCE',      'Other',                     'Muu'),
                -- RSI_REQUEST_PURPOSE (globalRequestPurposeType)
                ('RSI_REQUEST_PURPOSE',     'Issue',                     'Väljaandmine'),
                ('RSI_REQUEST_PURPOSE',     'Control',                   'Järelevalve'),
                ('RSI_REQUEST_PURPOSE',     'Heartbeat',                 'Elumärk'),
                ('RSI_REQUEST_PURPOSE',     'Other',                     'Muu'),
                -- RSI_VEHICLE_CATEGORY (rsiVehicleCategoryType, RoadSideInspection_Types.xsd)
                ('RSI_VEHICLE_CATEGORY',    'M1',                        'M1 — sõitjateveo mootorsõiduk kuni 8 istekohaga'),
                ('RSI_VEHICLE_CATEGORY',    'M2',                        'M2 — sõitjateveo mootorsõiduk üle 8 istekoha, täismass ≤ 5t'),
                ('RSI_VEHICLE_CATEGORY',    'M3',                        'M3 — sõitjateveo mootorsõiduk üle 8 istekoha, täismass > 5t'),
                ('RSI_VEHICLE_CATEGORY',    'N1',                        'N1 — kaubaveo mootorsõiduk, täismass ≤ 3,5t'),
                ('RSI_VEHICLE_CATEGORY',    'N2',                        'N2 — kaubaveo mootorsõiduk, täismass 3,5–12t'),
                ('RSI_VEHICLE_CATEGORY',    'N3',                        'N3 — kaubaveo mootorsõiduk, täismass > 12t'),
                ('RSI_VEHICLE_CATEGORY',    'O1',                        'O1 — haagis, täismass ≤ 0,75t'),
                ('RSI_VEHICLE_CATEGORY',    'O2',                        'O2 — haagis, täismass 0,75–3,5t'),
                ('RSI_VEHICLE_CATEGORY',    'O3',                        'O3 — haagis, täismass 3,5–10t'),
                ('RSI_VEHICLE_CATEGORY',    'O4',                        'O4 — haagis, täismass > 10t'),
                ('RSI_VEHICLE_CATEGORY',    'L1e',                       'L1e — kahe rattaga mopeed'),
                ('RSI_VEHICLE_CATEGORY',    'L2e',                       'L2e — kolme rattaga mopeed'),
                ('RSI_VEHICLE_CATEGORY',    'L3e',                       'L3e — kahe rattaga mootorratas'),
                ('RSI_VEHICLE_CATEGORY',    'L4e',                       'L4e — külgkorviga mootorratas'),
                ('RSI_VEHICLE_CATEGORY',    'L5e',                       'L5e — kolme rattaga mootorsõiduk'),
                ('RSI_VEHICLE_CATEGORY',    'L6e',                       'L6e — kergnelikäivur'),
                ('RSI_VEHICLE_CATEGORY',    'L7e',                       'L7e — nelikäivur'),
                ('RSI_VEHICLE_CATEGORY',    'C',                        'C — muu ERRU sõiduki kategooria'),
                ('RSI_VEHICLE_CATEGORY',    'R1a',                       'R1a — põllu-/metsamajanduslik haagis, täismass ≤ 1,5t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R1b',                       'R1b — põllu-/metsamajanduslik haagis, täismass ≤ 1,5t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R2a',                       'R2a — põllu-/metsamajanduslik haagis, täismass 1,5–3,5t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R2b',                       'R2b — põllu-/metsamajanduslik haagis, täismass 1,5–3,5t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R3a',                       'R3a — põllu-/metsamajanduslik haagis, täismass 3,5–21t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R3b',                       'R3b — põllu-/metsamajanduslik haagis, täismass 3,5–21t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R4a',                       'R4a — põllu-/metsamajanduslik haagis, täismass > 21t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'R4b',                       'R4b — põllu-/metsamajanduslik haagis, täismass > 21t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'S1a',                       'S1a — vahetatav põllu-/metsamajanduslik seadus, täismass ≤ 3,5t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'S1b',                       'S1b — vahetatav põllu-/metsamajanduslik seadus, täismass ≤ 3,5t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'S2a',                       'S2a — vahetatav põllu-/metsamajanduslik seadus, täismass > 3,5t, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'S2b',                       'S2b — vahetatav põllu-/metsamajanduslik seadus, täismass > 3,5t, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T1a',                       'T1a — põllu-/metsamajanduslik traktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T1b',                       'T1b — põllu-/metsamajanduslik traktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T2a',                       'T2a — kitsarööpmeline traktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T2b',                       'T2b — kitsarööpmeline traktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T3a',                       'T3a — kergtraktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T3b',                       'T3b — kergtraktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.1a',                     'T4.1a — kõrge kliirensiga traktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.1b',                     'T4.1b — kõrge kliirensiga traktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.2a',                     'T4.2a — eriti lai traktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.2b',                     'T4.2b — eriti lai traktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.3a',                     'T4.3a — madala telgevahega traktor, kiirus ≤ 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T4.3b',                     'T4.3b — madala telgevahega traktor, kiirus > 40 km/h'),
                ('RSI_VEHICLE_CATEGORY',    'T5',                        'T5 — kiirusega üle 40 km/h traktor')
            ) AS t(clf_code, code, name)
            WHERE t.clf_code = v_clf.code
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_key, v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
        END LOOP;
    END LOOP;
END $$;
