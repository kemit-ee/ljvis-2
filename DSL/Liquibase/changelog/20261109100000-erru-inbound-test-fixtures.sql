-- liquibase formatted sql
-- changeset ljvis:20261109100000 ignore:true splitStatements:false
--
-- Dev-only fixture: 10 sissetulevat ERRU teadet (4× NCR, 3× RSI, 3× CTUD)
-- erinevate kuupäevade ja EU liikmesriikidega (LV, PL, DE, FI).
-- Järgmine PR eemaldab selle faili pärast dev-testimist.
--

DO $$
DECLARE
    v_key BIGINT;
BEGIN

    -- ─────────────────────────────────────────────────────────────────────────
    -- NCR 1 — LV, 2026-07-15, Fail (MSI 302)
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'LV-NCR-2026-F001') THEN
        v_key := nextval('erru.seq_ncr_message_key');
        INSERT INTO erru.ncr_message (
            ncr_message_key, version, direction, status,
            business_case_id, technical_id, workflow_id, sent_at,
            ncr_from, ncr_to, originating_authority, request_source, request_purpose,
            transport_undertaking_name, community_licence_number,
            vehicle_registration_number, vehicle_registration_country,
            check_result, check_date, serious_infringements, created_by
        ) VALUES (
            v_key, 1, 'incoming', 'received',
            'LV-NCR-2026-F001', 'aa000001-0000-0000-0000-000000000001'::UUID, 'bb000001-0000-0000-0000-000000000001'::UUID,
            '2026-07-15 08:30:00+03', 'LV', 'EE',
            'RTSA Latvia', 'RSI', 'Control',
            'Baltic Road OÜ', 'LV-CL-10011',
            'LV-1234-AB', 'LV',
            'Fail', '2026-07-14',
            '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-07-14","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":60}]}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- NCR 2 — PL, 2026-08-03, Fail (VSI 201 + SI 101)
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'PL-NCR-2026-F002') THEN
        v_key := nextval('erru.seq_ncr_message_key');
        INSERT INTO erru.ncr_message (
            ncr_message_key, version, direction, status,
            business_case_id, technical_id, workflow_id, sent_at,
            ncr_from, ncr_to, originating_authority, request_source, request_purpose,
            transport_undertaking_name, community_licence_number,
            vehicle_registration_number, vehicle_registration_country,
            check_result, check_date, serious_infringements, created_by
        ) VALUES (
            v_key, 1, 'incoming', 'received',
            'PL-NCR-2026-F002', 'aa000002-0000-0000-0000-000000000002'::UUID, 'bb000002-0000-0000-0000-000000000002'::UUID,
            '2026-08-03 14:10:00+03', 'PL', 'EE',
            'GITD Polska', 'RSI', 'Control',
            'Trans-East sp. z o.o.', 'PL-CL-20022',
            'PL-WA-9982', 'PL',
            'Fail', '2026-08-02',
            '[{"category":"VSI","infringementType":"201","dateOfInfringement":"2026-08-02","appealPossible":false,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"305"}]},{"category":"SI","infringementType":"101","dateOfInfringement":"2026-08-02","appealPossible":false,"penaltiesRequested":[{"penaltyRequestedIdentifier":2,"penaltyTypeRequested":"303","duration":30}]}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- NCR 3 — DE, 2026-08-22, Pass (CleanCheck)
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'DE-NCR-2026-P003') THEN
        v_key := nextval('erru.seq_ncr_message_key');
        INSERT INTO erru.ncr_message (
            ncr_message_key, version, direction, status,
            business_case_id, technical_id, workflow_id, sent_at,
            ncr_from, ncr_to, originating_authority, request_source, request_purpose,
            transport_undertaking_name, community_licence_number,
            vehicle_registration_number, vehicle_registration_country,
            check_result, check_date, serious_infringements, created_by
        ) VALUES (
            v_key, 1, 'incoming', 'received',
            'DE-NCR-2026-P003', 'aa000003-0000-0000-0000-000000000003'::UUID, 'bb000003-0000-0000-0000-000000000003'::UUID,
            '2026-08-22 10:00:00+03', 'DE', 'EE',
            'BAG Deutschland', 'RSI', 'Control',
            'Schnell Transport GmbH', 'DE-CL-30033',
            'DE-B-5501', 'DE',
            'Pass', '2026-08-21',
            '[]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- NCR 4 — FI, 2026-09-01, Fail (MSI 501 + minor infringement)
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'FI-NCR-2026-F004') THEN
        v_key := nextval('erru.seq_ncr_message_key');
        INSERT INTO erru.ncr_message (
            ncr_message_key, version, direction, status,
            business_case_id, technical_id, workflow_id, sent_at,
            ncr_from, ncr_to, originating_authority, request_source, request_purpose,
            transport_undertaking_name, community_licence_number,
            vehicle_registration_number, vehicle_registration_country,
            check_result, check_date,
            minor_infringement, serious_infringements, created_by
        ) VALUES (
            v_key, 1, 'incoming', 'received',
            'FI-NCR-2026-F004', 'aa000004-0000-0000-0000-000000000004'::UUID, 'bb000004-0000-0000-0000-000000000004'::UUID,
            '2026-09-01 09:45:00+03', 'FI', 'EE',
            'Traficom Finland', 'RSI', 'Control',
            'Pohjolan Kuljetus Oy', 'FI-CL-40044',
            'FI-ABC-112', 'FI',
            'Fail', '2026-08-31',
            '{"dateOfInfringement":"2026-08-31","numberOfInfringements":2}'::JSONB,
            '[{"category":"MSI","infringementType":"501","dateOfInfringement":"2026-08-31","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":90}]}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RSI 1 — LV, kontroll 2026-07-10, EE sõiduk, läbitud
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'LV-RSI-2026-R001') THEN
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
            'LV-RSI-2026-R001', 'cc000001-0000-0000-0000-000000000001'::UUID, 'dd000001-0000-0000-0000-000000000001'::UUID,
            '2026-07-10 16:00:00+03', 'LV', 'EE',
            'RTSA Latvia', 'RSI', 'Control',
            '123ABC', 'EE', 'N2',
            'WDB9634031L123456',
            'Riga, A1 highway km 45', '2026-07-10 14:30:00+03', 'RTSA Riga',
            true, false, false,
            '[{"itemCode":"BRAKES","result":"checked"},{"itemCode":"LIGHTS","result":"checked"}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RSI 2 — DE, kontroll 2026-08-15, mittevastavus piduritel
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'DE-RSI-2026-R002') THEN
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
            'DE-RSI-2026-R002', 'cc000002-0000-0000-0000-000000000002'::UUID, 'dd000002-0000-0000-0000-000000000002'::UUID,
            '2026-08-16 11:00:00+03', 'DE', 'EE',
            'BAG Deutschland', 'RSI', 'Control',
            '456DEF', 'EE', 'N3',
            'WDB9634031L654321',
            'Hamburg, A7 Rasthof Nord', '2026-08-15 09:15:00+03', 'BAG Hamburg',
            false, true, false,
            '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"OV"}]},{"itemCode":"TACHOGRAPH","result":"checked"}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RSI 3 — FI, kontroll 2026-09-05, keeld
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.rsi_message WHERE business_case_id = 'FI-RSI-2026-R003') THEN
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
            'FI-RSI-2026-R003', 'cc000003-0000-0000-0000-000000000003'::UUID, 'dd000003-0000-0000-0000-000000000003'::UUID,
            '2026-09-05 07:30:00+03', 'FI', 'EE',
            'Traficom Finland', 'RSI', 'Control',
            '789GHI', 'EE', 'N2',
            'WDB9634031L789012',
            'Helsinki, E18 weigh station', '2026-09-05 06:00:00+03', 'Traficom Helsinki',
            false, false, true,
            '[{"itemCode":"BRAKES","result":"non_compliant","defects":[{"defectCode":"BRAKE_EFFICIENCY","severity":"EOV"}]},{"itemCode":"STEERING","result":"non_compliant","defects":[{"defectCode":"PLAY","severity":"OV"}]},{"itemCode":"TYRES","result":"checked"}]'::JSONB,
            'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- CTUD 1 — PL, päring 2026-07-20
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'PL-CTUD-2026-C001') THEN
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
            'PL-CTUD-2026-C001', 'ee000001-0000-0000-0000-000000000001'::UUID, 'ff000001-0000-0000-0000-000000000001'::UUID,
            '2026-07-20 13:00:00+03', 'PL', 'EE',
            'GITD Polska', 'CTUD', 'CheckTransportUndertakingData',
            'Trans-East sp. z o.o.', 'PL-CL-20022',
            NULL, NULL,
            false, 'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- CTUD 2 — LV, päring 2026-08-10, kõik sõidukid
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'LV-CTUD-2026-C002') THEN
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
            'LV-CTUD-2026-C002', 'ee000002-0000-0000-0000-000000000002'::UUID, 'ff000002-0000-0000-0000-000000000002'::UUID,
            '2026-08-10 09:20:00+03', 'LV', 'EE',
            'RTSA Latvia', 'CTUD', 'CheckTransportUndertakingData',
            'Baltic Road OÜ', 'LV-CL-10011',
            NULL, NULL,
            true, 'system'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- CTUD 3 — DE, päring 2026-09-03, konkreetne sõiduk
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM erru.ctud_request WHERE business_case_id = 'DE-CTUD-2026-C003') THEN
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
            'DE-CTUD-2026-C003', 'ee000003-0000-0000-0000-000000000003'::UUID, 'ff000003-0000-0000-0000-000000000003'::UUID,
            '2026-09-03 15:45:00+03', 'DE', 'EE',
            'BAG Deutschland', 'CTUD', 'CheckTransportUndertakingData',
            'Schnell Transport GmbH', 'DE-CL-30033',
            'DE-B-5501', 'DE',
            false, 'system'
        );
    END IF;

END $$;
