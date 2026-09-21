-- liquibase formatted sql
-- changeset ljvis:20261124100000 ignore:true splitStatements:false
--
-- *** AJUTINE — ÜHEKORDNE TESTANDMESTIK, EEMALDA PEALE KLIENDI TESTIMISE LÕPPU ***
--
-- AJUTINE — ühekordne testandmestik kliendi (RS) NCR→välisriigi kontrollkaart
-- andmeülekande testimiseks. Eemaldada järgneva rollback-migratsiooniga peale
-- testimise lõppu, ENNE et see jõuaks tootmisse päris kasutajateni.
-- (vt "NCR → välisriigi kontrollkaart: andmeülekande testimine" PR / plaan)
--
-- Erinevalt tavapärasest DSL/Liquibase/test/ mustrist (Newman-only, ei rakendu
-- automaatselt kunagi) läheb see fail TEAdlikult reaalsesse changelog/ kausta,
-- et see rakenduks deploy'ga kliendi keskkonnas ja klient saaks NCR→kontrollkaart
-- andmeülekandet oma keskkonnas käsitsi testida. Järgneva PR-iga (rollback) tuleb
-- need viis rida eemaldada.
--
-- Viis stsenaariumit, kõik direction='incoming', status='received', et need
-- ilmuksid NCR loendis "Loo kontrollkaart" nupuga:
--   1. Kliendi saadetud reaalne näide (PDF): NO→EE, HorseTrans OÜ, SI912 (2x 202-Trahv)
--      + VSI819 (203-Keeld).
--   2. Kõikehõlmav sünteetiline maksimum: MSI+VSI+SI korraga, kõik valikulised
--      NCR väljad täidetud — katab võimalikult palju create-from-ncr.yml mapitavaid
--      välju ühe kirjega.
--   3. Ainult üks MSI, sanktsioonita (penaltiesImposed tühi) — testib fallback'i,
--      kui NCR pool pole sanktsiooni veel kinnitanud.
--   4. Kaks VSI kirjet erineva infringementType/penaltyTypeImposed väärtusega —
--      testib mitme sama raskusastme rikkumise õiget eristumist (mitte kokkuliitmist).
--   5. Puhas/probleemivaba kontroll (check_result='CleanCheck', ilma rikkumisteta) —
--      testib, et kontrollkaart genereerub ka ilma rikkumisteta.
--
-- business_case_id prefiks 'TEST-NCR-TRANSFER-0{1..5}' — kõrge, selgelt eristuv
-- testivõti, ei kollideeru päris ERRU-andmete formaadiga (EE-NCR-AAAA-NNNNN vms).
--

-- ── 1. Kliendi PDF põhjal: NO → EE, HorseTrans OÜ ──────────────────────────────────
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'TEST-NCR-TRANSFER-01') THEN
        RAISE NOTICE 'NCR transfer test fixture TEST-NCR-TRANSFER-01 already exists, skipping';
        RETURN;
    END IF;

    v_key := nextval('erru.seq_ncr_message_key');

    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
        originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, minor_infringement, serious_infringements,
        created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'TEST-NCR-TRANSFER-01', 'aaaaaaaa-bbbb-cccc-dddd-100000000001'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-100000000011'::UUID,
        now() - INTERVAL '2 days', 'NO', 'EE',
        'Statens vegvesen', 'RSI', 'Control',
        'HorseTrans OÜ', 'RVSK045264',
        '597BCH', 'EE',
        'Fail', DATE '2026-06-23',
        '{"dateOfInfringement":"2026-08-04","numberOfInfringements":2}'::JSONB,
        '[{"category":"SI","infringementType":"912","dateOfInfringement":"2026-06-05","detectionCheckDate":"2026-06-05","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":122087187,"penaltyTypeImposed":"202","finalDecisionDate":"2026-07-17","isExecuted":"Yes"},{"penaltyImposedIdentifier":122087188,"penaltyTypeImposed":"202","finalDecisionDate":"2026-07-17","isExecuted":"Yes"}]},{"category":"VSI","infringementType":"819","dateOfInfringement":"2026-06-23","detectionCheckDate":"2026-06-23","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":122087030,"penaltyTypeImposed":"203","finalDecisionDate":"2026-08-04","isExecuted":"Yes"}]}]'::JSONB,
        'system'
    );
END $$;

-- ── 2. Kõikehõlmav sünteetiline maksimum: PL → EE ──────────────────────────────────
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'TEST-NCR-TRANSFER-02') THEN
        RAISE NOTICE 'NCR transfer test fixture TEST-NCR-TRANSFER-02 already exists, skipping';
        RETURN;
    END IF;

    v_key := nextval('erru.seq_ncr_message_key');

    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
        originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, minor_infringement, serious_infringements,
        created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'TEST-NCR-TRANSFER-02', 'aaaaaaaa-bbbb-cccc-dddd-100000000002'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-100000000012'::UUID,
        now() - INTERVAL '3 days', 'PL', 'EE',
        'Inspekcja Transportu Drogowego', 'RSI', 'Control',
        'Maksimum Logistics OÜ', 'PL-CL-11223',
        'PL-TEST-9002', 'PL',
        'Fail', DATE '2026-06-10',
        '{"dateOfInfringement":"2026-06-10","numberOfInfringements":3}'::JSONB,
        '[' ||
        '{"category":"MSI","infringementType":"101","dateOfInfringement":"2026-06-08","detectionCheckDate":"2026-06-08","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":222000001,"penaltyTypeImposed":"101","finalDecisionDate":"2026-06-09","isExecuted":"Yes"}],"penaltiesRequested":[]},' ||
        '{"category":"VSI","infringementType":"602","dateOfInfringement":"2026-06-09","detectionCheckDate":"2026-06-09","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":222000002,"penaltyTypeImposed":"203","finalDecisionDate":"2026-06-10","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":222000003,"penaltyTypeRequested":"303","duration":14}]},' ||
        '{"category":"SI","infringementType":"912","dateOfInfringement":"2026-06-10","detectionCheckDate":"2026-06-10","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":222000004,"penaltyTypeImposed":"202","finalDecisionDate":"2026-06-10","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":222000005,"penaltyTypeRequested":"305"}]}' ||
        ']')::JSONB,
        'system'
    );
END $$;

-- ── 3. Ainult üks MSI, sanktsioonita: LV → EE ──────────────────────────────────────
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'TEST-NCR-TRANSFER-03') THEN
        RAISE NOTICE 'NCR transfer test fixture TEST-NCR-TRANSFER-03 already exists, skipping';
        RETURN;
    END IF;

    v_key := nextval('erru.seq_ncr_message_key');

    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
        originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, minor_infringement, serious_infringements,
        created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'TEST-NCR-TRANSFER-03', 'aaaaaaaa-bbbb-cccc-dddd-100000000003'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-100000000013'::UUID,
        now() - INTERVAL '1 day', 'LV', 'EE',
        'CVIP Latvia', 'RSI', 'Control',
        'Pending Sanction SIA', 'LV-CL-33445',
        'LV-TEST-9003', 'LV',
        'Fail', DATE '2026-07-01',
        NULL,
        '[{"category":"MSI","infringementType":"101","dateOfInfringement":"2026-07-01","detectionCheckDate":"2026-07-01","appealPossible":false,"penaltiesImposed":[],"penaltiesRequested":[]}]'::JSONB,
        'system'
    );
END $$;

-- ── 4. Kaks VSI kirjet erineva karistusliigiga: DE → EE ────────────────────────────
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'TEST-NCR-TRANSFER-04') THEN
        RAISE NOTICE 'NCR transfer test fixture TEST-NCR-TRANSFER-04 already exists, skipping';
        RETURN;
    END IF;

    v_key := nextval('erru.seq_ncr_message_key');

    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
        originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, minor_infringement, serious_infringements,
        created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'TEST-NCR-TRANSFER-04', 'aaaaaaaa-bbbb-cccc-dddd-100000000004'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-100000000014'::UUID,
        now() - INTERVAL '4 days', 'DE', 'EE',
        'Bundesamt für Güterverkehr', 'RSI', 'Control',
        'Doppelt Vergehen GmbH via EE', 'DE-CL-55667',
        'DE-TEST-9004', 'DE',
        'Fail', DATE '2026-05-20',
        NULL,
        '[' ||
        '{"category":"VSI","infringementType":"601","dateOfInfringement":"2026-05-18","detectionCheckDate":"2026-05-18","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":333000001,"penaltyTypeImposed":"201","finalDecisionDate":"2026-05-19","isExecuted":"Yes"}]},' ||
        '{"category":"VSI","infringementType":"819","dateOfInfringement":"2026-05-20","detectionCheckDate":"2026-05-20","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":333000002,"penaltyTypeImposed":"204","finalDecisionDate":"2026-05-20","isExecuted":"No","notExecutedReason":"Appeal pending"}]}' ||
        ']')::JSONB,
        'system'
    );
END $$;

-- ── 5. Puhas/probleemivaba kontroll: LT → EE ───────────────────────────────────────
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'TEST-NCR-TRANSFER-05') THEN
        RAISE NOTICE 'NCR transfer test fixture TEST-NCR-TRANSFER-05 already exists, skipping';
        RETURN;
    END IF;

    v_key := nextval('erru.seq_ncr_message_key');

    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
        originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, minor_infringement, serious_infringements,
        created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'TEST-NCR-TRANSFER-05', 'aaaaaaaa-bbbb-cccc-dddd-100000000005'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-100000000015'::UUID,
        now() - INTERVAL '5 days', 'LT', 'EE',
        'Lietuvos transporto saugos administracija', 'RSI', 'Control',
        'Clean Check UAB', 'LT-CL-77889',
        'LT-TEST-9005', 'LT',
        'CleanCheck', DATE '2026-04-15',
        NULL, NULL,
        'system'
    );
END $$;
