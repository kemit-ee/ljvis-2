-- liquibase formatted sql
-- changeset ljvis:20261109100002 ignore:true splitStatements:false
--
-- Dev-only fixture laiendus: ERRU sissetulevad teated kokku 10 igast liigist.
--
-- NCR  lisatav 3 (kokku: 4 + 3 eelmistest + 3 siin = 10):
--   FR  viewed        (2 snapshot: received → viewed)
--   HU  answer_drafted (2 snapshot: received → answer_drafted)
--   AT  error          (ERRU Hub HTTP 503)
--
-- RSI  lisatav 7 (kokku: 3 eelmistest + 7 siin = 10):
--   SE  received  — mitu puudust, keeld
--   FR  received  — läbitud (inspection_passed=true)
--   CZ  received  — pidur + tahhograaf
--   HU  answered  — OK vastus
--   RO  error     — XML skeemi valideerimise viga
--   NL  answered  — OK vastus, 5 kontrollelementi
--   AT  received  — rool, keeld
--
-- CTUD lisatav 7 (kokku: 3 eelmistest + 7 siin = 10):
--   SE  received  — konkreetne sõiduk
--   FR  received  — kõik sõidukid
--   CZ  received  — konkreetne sõiduk
--   HU  answered  — Found (vastus olemas)
--   RO  error     — ERRU Hub NotAvailable
--   NL  answered  — NotFound
--   AT  received  — ettevõtte päring
--
-- Järgmine PR eemaldab kõik fixture failid.
--

DO $$
DECLARE
    v_key BIGINT;
    v_key2 BIGINT;
BEGIN

-- ════════════════════════════════════════════════════════════════════
-- NCR LISAD (3 tk → kokku 10)
-- ════════════════════════════════════════════════════════════════════

-- NCR 8: FR → EE, received → viewed (2 snapshooti, sama võti)
IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'FR-NCR-2026-F008') THEN
    v_key := nextval('erru.seq_ncr_message_key');
    -- snapshot 1: received
    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ncr_from, ncr_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, serious_infringements, created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'FR-NCR-2026-F008', 'aa000008-0000-0000-0000-000000000008'::UUID, 'bb000008-0000-0000-0000-000000000008'::UUID,
        '2026-06-20 11:00:00+03', 'FR', 'EE',
        'DREAL Île-de-France', 'RSI', 'Control',
        'AS Tallinna Kaubaveod', 'EE-CL-88008',
        'EE-012-XY', 'EE',
        'Fail', '2026-06-19',
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-06-19","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":60}]}]'::jsonb,
        'system', now() - INTERVAL '14 days'
    );
    -- snapshot 2: viewed
    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ncr_from, ncr_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, serious_infringements, created_by, created_at
    ) VALUES (
        v_key, 2, 'incoming', 'viewed',
        'FR-NCR-2026-F008', 'aa000008-0000-0000-0000-000000000008'::UUID, 'bb000008-0000-0000-0000-000000000008'::UUID,
        '2026-06-20 11:00:00+03', 'FR', 'EE',
        'DREAL Île-de-France', 'RSI', 'Control',
        'AS Tallinna Kaubaveod', 'EE-CL-88008',
        'EE-012-XY', 'EE',
        'Fail', '2026-06-19',
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-06-19","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":60}]}]'::jsonb,
        'system', now() - INTERVAL '13 days' + INTERVAL '2 hours'
    );
END IF;

-- NCR 9: HU → EE, received → answer_drafted (vastuse mustand koostatud)
IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'HU-NCR-2026-F009') THEN
    v_key := nextval('erru.seq_ncr_message_key');
    -- snapshot 1: received
    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ncr_from, ncr_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, serious_infringements,
        minor_infringement, created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'HU-NCR-2026-F009', 'aa000009-0000-0000-0000-000000000009'::UUID, 'bb000009-0000-0000-0000-000000000009'::UUID,
        '2026-07-05 14:30:00+03', 'HU', 'EE',
        'ITM Hungary', 'RSI', 'Control',
        'OÜ Eesti Ekspress Veod', 'EE-CL-99009',
        'EE-456-ZW', 'EE',
        'Fail', '2026-07-04',
        '[{"category":"VSI","infringementType":"201","dateOfInfringement":"2026-07-04","appealPossible":false,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"305"}]}]'::jsonb,
        '{"dateOfInfringement":"2026-07-04","numberOfInfringements":1}'::jsonb,
        'system', now() - INTERVAL '7 days'
    );
    -- snapshot 2: answer_drafted (vastuse mustand koostatud, EE poolel)
    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ncr_from, ncr_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, serious_infringements,
        minor_infringement, created_by, created_at
    ) VALUES (
        v_key, 2, 'incoming', 'answer_drafted',
        'HU-NCR-2026-F009', 'aa000009-0000-0000-0000-000000000009'::UUID, 'bb000009-0000-0000-0000-000000000009'::UUID,
        '2026-07-05 14:30:00+03', 'HU', 'EE',
        'ITM Hungary', 'RSI', 'Control',
        'OÜ Eesti Ekspress Veod', 'EE-CL-99009',
        'EE-456-ZW', 'EE',
        'Fail', '2026-07-04',
        '[{"category":"VSI","infringementType":"201","dateOfInfringement":"2026-07-04","appealPossible":false,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"305"}]}]'::jsonb,
        '{"dateOfInfringement":"2026-07-04","numberOfInfringements":1}'::jsonb,
        'system', now() - INTERVAL '6 days'
    );
END IF;

-- NCR 10: AT → EE, error (ERRU Hub ei vastanud)
IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'AT-NCR-2026-E010') THEN
    v_key := nextval('erru.seq_ncr_message_key');
    INSERT INTO erru.ncr_message (
        ncr_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ncr_from, ncr_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        check_result, check_date, serious_infringements,
        error_message, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'error',
        'AT-NCR-2026-E010', 'aa000010-0000-0000-0000-000000000010'::UUID, 'bb000010-0000-0000-0000-000000000010'::UUID,
        '2026-08-07 08:15:00+03', 'AT', 'EE',
        'BMK Austria', 'RSI', 'Control',
        'AS Lääne-Viru Transport', 'EE-CL-10010',
        'EE-789-PQ', 'EE',
        'Fail', '2026-08-06',
        '[{"category":"MSI","infringementType":"501","dateOfInfringement":"2026-08-06","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":120}]}]'::jsonb,
        'ERRU Hub connection failed: HTTP 503 Service Unavailable after 3 retries (timeout 30s each). Message stored but not processed.',
        'system'
    );
END IF;

-- ════════════════════════════════════════════════════════════════════
-- RSI LISAD (7 tk → kokku 10)
-- ════════════════════════════════════════════════════════════════════

-- RSI 4: SE → EE, received, mitu EOV puudust, sõidukeeld
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'SE-RSI-2026-R004') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'SE-RSI-2026-R004', 'cc000004-0000-0000-0000-000000000004'::UUID, 'dd000004-0000-0000-0000-000000000004'::UUID,
        '2026-06-12 09:00:00+03', 'SE', 'EE',
        'Transportstyrelsen', 'RSI', 'Control',
        'EE-222-BC', 'EE', 'N3',
        'WDB9634031L222222',
        'Malmö, E6 veiingsstasjon', '2026-06-12 07:30:00+03', 'Transportstyrelsen Malmö',
        false, false, true,
        '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"EOV"},{"defectCode":"BRAKE_DISTRIBUTION","severity":"OV"}]},{"itemCode":"STEERING","result":"non_compliant","defects":[{"defectCode":"PLAY","severity":"EOV"}]},{"itemCode":"TYRES","result":"non_compliant","defects":[{"defectCode":"TYRE_CONDITION","severity":"OV"}]},{"itemCode":"LIGHTS","result":"checked"},{"itemCode":"TACHOGRAPH","result":"checked"}]'::jsonb,
        'system'
    );
END IF;

-- RSI 5: FR → EE, received, läbitud (inspection_passed=true, CleanCheck)
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'FR-RSI-2026-R005') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'FR-RSI-2026-R005', 'cc000005-0000-0000-0000-000000000005'::UUID, 'dd000005-0000-0000-0000-000000000005'::UUID,
        '2026-07-08 16:00:00+03', 'FR', 'EE',
        'DREAL Normandie', 'RSI', 'Control',
        'EE-333-CD', 'EE', 'N2',
        'WDB9634031L333333',
        'Rouen, A13 aire de repos', '2026-07-08 14:15:00+03', 'DREAL Rouen',
        true, false, false,
        '[{"itemCode":"BRAKES","result":"checked"},{"itemCode":"STEERING","result":"checked"},{"itemCode":"LIGHTS","result":"checked"},{"itemCode":"TACHOGRAPH","result":"checked"}]'::jsonb,
        'system'
    );
END IF;

-- RSI 6: CZ → EE, received, pidur EOV + tahhograaf puudus
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'CZ-RSI-2026-R006') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'CZ-RSI-2026-R006', 'cc000006-0000-0000-0000-000000000006'::UUID, 'dd000006-0000-0000-0000-000000000006'::UUID,
        '2026-07-25 12:30:00+03', 'CZ', 'EE',
        'MDCR Czech Republic', 'RSI', 'Control',
        'EE-444-DE', 'EE', 'N3',
        'WDB9634031L444444',
        'Brno, D1 km 201', '2026-07-25 10:00:00+03', 'MDCR Brno',
        false, true, false,
        '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"EOV"}]},{"itemCode":"TACHOGRAPH","result":"non_compliant","defects":[{"defectCode":"TACHOGRAPH_SEAL","severity":"OV"}]},{"itemCode":"LIGHTS","result":"checked"},{"itemCode":"STEERING","result":"checked"}]'::jsonb,
        'system'
    );
END IF;

-- RSI 7: HU → EE, answered, response OK (EE kinnitas sõiduki registreerituse)
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'HU-RSI-2026-R007') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    -- snapshot 1: received
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'HU-RSI-2026-R007', 'cc000007-0000-0000-0000-000000000007'::UUID, 'dd000007-0000-0000-0000-000000000007'::UUID,
        '2026-08-01 10:00:00+03', 'HU', 'EE',
        'ITM Hungary', 'RSI', 'Control',
        'EE-555-EF', 'EE', 'N2',
        'WDB9634031L555555',
        'Budapest, M7 pihenő', '2026-08-01 08:30:00+03', 'ITM Budapest',
        false, false, false,
        '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"OV"}]},{"itemCode":"LIGHTS","result":"checked"}]'::jsonb,
        'system', now() - INTERVAL '10 days'
    );
    -- snapshot 2: answered (EE vastas: sõiduk registreeritud)
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, response_status_code, created_by, created_at
    ) VALUES (
        v_key, 2, 'incoming', 'answered',
        'HU-RSI-2026-R007', 'cc000007-0000-0000-0000-000000000007'::UUID, 'dd000007-0000-0000-0000-000000000007'::UUID,
        '2026-08-01 10:00:00+03', 'HU', 'EE',
        'ITM Hungary', 'RSI', 'Control',
        'EE-555-EF', 'EE', 'N2',
        'WDB9634031L555555',
        'Budapest, M7 pihenő', '2026-08-01 08:30:00+03', 'ITM Budapest',
        false, false, false,
        '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"OV"}]},{"itemCode":"LIGHTS","result":"checked"}]'::jsonb,
        'OK', 'system', now() - INTERVAL '9 days' + INTERVAL '4 hours'
    );
END IF;

-- RSI 8: RO → EE, error (XML skeemi valideerimise viga)
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'RO-RSI-2026-E008') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, error_message, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'error',
        'RO-RSI-2026-E008', 'cc000008-0000-0000-0000-000000000008'::UUID, 'dd000008-0000-0000-0000-000000000008'::UUID,
        '2026-08-14 07:00:00+03', 'RO', 'EE',
        'ARR Romania', 'RSI', 'Control',
        'EE-666-FG', 'EE', 'N3',
        'Timișoara, A1 km 502', '2026-08-14 05:45:00+03', 'ARR Timișoara',
        NULL, false, false,
        '[]'::jsonb,
        'XML schema validation failure: unexpected element <rsiCheckedItemType2> at line 87, col 14. Expected: rsiCheckedItemType. Message rejected by ERRU Hub (HTTP 400).',
        'system'
    );
END IF;

-- RSI 9: NL → EE, answered, OK, 5 kontrollelementi
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'NL-RSI-2026-R009') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, response_status_code, created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'answered',
        'NL-RSI-2026-R009', 'cc000009-0000-0000-0000-000000000009'::UUID, 'dd000009-0000-0000-0000-000000000009'::UUID,
        '2026-08-20 13:00:00+03', 'NL', 'EE',
        'ILT Netherlands', 'RSI', 'Control',
        'EE-777-GH', 'EE', 'N3',
        'WDB9634031L777777',
        'Rotterdam, A15 weigh station', '2026-08-20 11:00:00+03', 'ILT Rotterdam',
        false, false, false,
        '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"OV"}]},{"itemCode":"STEERING","result":"checked"},{"itemCode":"LIGHTS","result":"checked"},{"itemCode":"TACHOGRAPH","result":"non_compliant","defects":[{"defectCode":"TACHOGRAPH_MISSING","severity":"OV"}]},{"itemCode":"TYRES","result":"checked"}]'::jsonb,
        'OK', 'system', now() - INTERVAL '3 days'
    );
END IF;

-- RSI 10: AT → EE, received, roolipuudus EOV, keeld
IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'AT-RSI-2026-R010') THEN
    v_key := nextval('erru.seq_rsi_message_key');
    INSERT INTO erru.rsi_message (
        rsi_message_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        rsi_from, rsi_to, originating_authority, request_source, request_purpose,
        vehicle_registration_number, vehicle_registration_country, vehicle_category,
        vehicle_identification_number,
        inspection_location, inspection_datetime, inspection_authority_or_name,
        inspection_passed, pti_requested, vehicle_prohibition_or_restriction,
        checked_items, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'AT-RSI-2026-R010', 'cc000010-0000-0000-0000-000000000010'::UUID, 'dd000010-0000-0000-0000-000000000010'::UUID,
        '2026-09-04 06:00:00+03', 'AT', 'EE',
        'BMK Austria', 'RSI', 'Control',
        'EE-888-HI', 'EE', 'N2',
        'WDB9634031L888888',
        'Wien, A1 Raststätte West', '2026-09-04 04:30:00+03', 'BMK Wien',
        false, false, true,
        '[{"itemCode":"STEERING","result":"non_compliant","defects":[{"defectCode":"PLAY","severity":"EOV"}]},{"itemCode":"BRAKES","result":"checked"},{"itemCode":"LIGHTS","result":"checked"}]'::jsonb,
        'system'
    );
END IF;

-- ════════════════════════════════════════════════════════════════════
-- CTUD LISAD (7 tk → kokku 10)
-- ════════════════════════════════════════════════════════════════════

-- CTUD 4: SE → EE, received, konkreetne sõiduk
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'SE-CTUD-2026-C004') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'SE-CTUD-2026-C004', 'ee000004-0000-0000-0000-000000000004'::UUID, 'ff000004-0000-0000-0000-000000000004'::UUID,
        '2026-06-18 08:00:00+03', 'SE', 'EE',
        'Transportstyrelsen', 'CTUD', 'CheckTransportUndertakingData',
        'AS Rapla Piim', 'EE-CL-55001',
        'EE-012-XY', 'EE',
        false, 'system'
    );
END IF;

-- CTUD 5: FR → EE, received, kõik sõidukid (ettevõtte täisaudit)
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'FR-CTUD-2026-C005') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'FR-CTUD-2026-C005', 'ee000005-0000-0000-0000-000000000005'::UUID, 'ff000005-0000-0000-0000-000000000005'::UUID,
        '2026-07-14 10:30:00+03', 'FR', 'EE',
        'DREAL Île-de-France', 'CTUD', 'CheckTransportUndertakingData',
        'AS Tallinna Kaubaveod', 'EE-CL-88008',
        NULL, NULL,
        true, 'system'
    );
END IF;

-- CTUD 6: CZ → EE, received, konkreetne sõiduk + registreerimisnumber
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'CZ-CTUD-2026-C006') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'CZ-CTUD-2026-C006', 'ee000006-0000-0000-0000-000000000006'::UUID, 'ff000006-0000-0000-0000-000000000006'::UUID,
        '2026-07-30 14:00:00+03', 'CZ', 'EE',
        'MDCR Czech Republic', 'CTUD', 'CheckTransportUndertakingData',
        'OÜ Eesti Ekspress Veod', 'EE-CL-99009',
        'EE-444-DE', 'EE',
        false, 'system'
    );
END IF;

-- CTUD 7: HU → EE, answered, Found (andmed leitud, täisandmed vastuses)
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'HU-CTUD-2026-C007') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    -- snapshot 1: received
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'HU-CTUD-2026-C007', 'ee000007-0000-0000-0000-000000000007'::UUID, 'ff000007-0000-0000-0000-000000000007'::UUID,
        '2026-08-05 09:00:00+03', 'HU', 'EE',
        'ITM Hungary', 'CTUD', 'CheckTransportUndertakingData',
        'AS Tallinna Ekspress', 'EE-CL-33003',
        NULL, NULL,
        true, 'system', now() - INTERVAL '8 days'
    );
    -- snapshot 2: answered, Found (EE leidis ettevõtte andmed)
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, response_status_code, response_content,
        created_by, created_at
    ) VALUES (
        v_key, 2, 'incoming', 'answered',
        'HU-CTUD-2026-C007', 'ee000007-0000-0000-0000-000000000007'::UUID, 'ff000007-0000-0000-0000-000000000007'::UUID,
        '2026-08-05 09:00:00+03', 'HU', 'EE',
        'ITM Hungary', 'CTUD', 'CheckTransportUndertakingData',
        'AS Tallinna Ekspress', 'EE-CL-33003',
        NULL, NULL,
        true, 'Found',
        '{"transportUndertakingName":"AS Tallinna Ekspress","legalForm":"AS","numberOfEmployees":42,"numberOfVehicles":18,"riskRating":12,"riskBand":"I","searchMethod":"communityLicenceNumber","address":{"address":"Tehnika 7","postCode":"10149","city":"Tallinn","country":"EE"},"communityLicenceDetails":[{"licenceNumber":"EE-CL-33003","startDate":"2022-03-01","endDate":"2027-03-01","status":"Valid","numberOfCertifiedTrueCopies":18}],"vehicleRegistrations":["EE-789-GH","EE-100-AB","EE-200-CD"]}'::jsonb,
        'system', now() - INTERVAL '7 days' + INTERVAL '3 hours'
    );
END IF;

-- CTUD 8: RO → EE, error (ERRU Hub NotAvailable — hooldus)
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'RO-CTUD-2026-E008') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, error_message, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'error',
        'RO-CTUD-2026-E008', 'ee000008-0000-0000-0000-000000000008'::UUID, 'ff000008-0000-0000-0000-000000000008'::UUID,
        '2026-08-13 03:30:00+03', 'RO', 'EE',
        'ARR Romania', 'CTUD', 'CheckTransportUndertakingData',
        'OÜ Pärnu Veod', 'EE-CL-55555',
        NULL, NULL,
        false,
        'ERRU Hub returned globalSearchResponseStatusCode=NotAvailable: "System under scheduled maintenance window 03:00–05:00 UTC. Retry after 05:15 UTC." Request could not be processed.',
        'system'
    );
END IF;

-- CTUD 9: NL → EE, answered, NotFound (ettevõtet ei leitud)
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'NL-CTUD-2026-C009') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, response_status_code, response_status_message,
        created_by, created_at
    ) VALUES (
        v_key, 1, 'incoming', 'answered',
        'NL-CTUD-2026-C009', 'ee000009-0000-0000-0000-000000000009'::UUID, 'ff000009-0000-0000-0000-000000000009'::UUID,
        '2026-08-25 11:00:00+03', 'NL', 'EE',
        'ILT Netherlands', 'CTUD', 'CheckTransportUndertakingData',
        'Tundmatu OÜ', 'EE-CL-00000',
        'EE-999-ZZ', 'EE',
        false, 'NotFound', 'Transport undertaking with community licence EE-CL-00000 not found in Estonian ERRU registry.',
        'system', now() - INTERVAL '2 days'
    );
END IF;

-- CTUD 10: AT → EE, received, ettevõtte audit (kõik sõidukid)
IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'AT-CTUD-2026-C010') THEN
    v_key := nextval('erru.seq_ctud_request_key');
    INSERT INTO erru.ctud_request (
        ctud_request_key, version, direction, status,
        business_case_id, technical_id, workflow_id, sent_at,
        ctud_from, ctud_to, originating_authority, request_source, request_purpose,
        transport_undertaking_name, community_licence_number,
        vehicle_registration_number, vehicle_registration_country,
        request_all_vehicles, created_by
    ) VALUES (
        v_key, 1, 'incoming', 'received',
        'AT-CTUD-2026-C010', 'ee000010-0000-0000-0000-000000000010'::UUID, 'ff000010-0000-0000-0000-000000000010'::UUID,
        '2026-09-05 10:00:00+03', 'AT', 'EE',
        'BMK Austria', 'CTUD', 'CheckTransportUndertakingData',
        'AS Lääne-Viru Transport', 'EE-CL-10010',
        NULL, NULL,
        true, 'system'
    );
END IF;

END $$;
