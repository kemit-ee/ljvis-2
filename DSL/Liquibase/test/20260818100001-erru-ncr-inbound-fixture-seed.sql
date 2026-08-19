-- liquibase formatted sql
-- changeset ljvis:20260818100001 ignore:true splitStatements:false
--
-- Test/dev-only fixture: one INCOMING NCR message in status='received' (LJVIS2-63 Newman tests).
-- Stage 11 (LJVIS2-64, mock/inbound endpoints) does not exist yet, so there is no real inbound
-- path to generate this fixture through the API — it is inserted directly here, exactly as an
-- inbound ERRU message would land in the table. Two requested penalties (ids 1 and 2) let the
-- Newman suite exercise the response-coverage validation (missing / duplicate / complete).
--
DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM erru.ncr_message WHERE business_case_id = 'LV-NCR-2026-TEST0001') THEN
        RAISE NOTICE 'NCR inbound fixture LV-NCR-2026-TEST0001 already exists, skipping';
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
        'LV-NCR-2026-TEST0001', 'aaaaaaaa-bbbb-cccc-dddd-000000000001'::UUID, 'aaaaaaaa-bbbb-cccc-dddd-000000000011'::UUID,
        now() - INTERVAL '1 day', 'LV', 'EE',
        'CVIP Latvia', 'RSI', 'Control',
        'Test Transport SIA', 'LV-CL-99887',
        'LV-TEST-9001', 'LV',
        'Fail', (CURRENT_DATE - 2),
        '{"dateOfInfringement":"2026-01-10","numberOfInfringements":1}'::JSONB,
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-01-10","detectionCheckDate":"2026-01-10","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-01-11","penaltyTypeImposed":"202","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":30},{"penaltyRequestedIdentifier":2,"penaltyTypeRequested":"305"}]}]'::JSONB,
        'system'
    );
END $$;
