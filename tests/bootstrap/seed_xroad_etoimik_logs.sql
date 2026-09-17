-- eToimiku X-tee logide seed Playwright E2E testidele (xroad-etoimik-logs.spec.ts).
-- Käsitsi käivitatav — jooksuta PÄRAST seed_test_data.sql-i.
-- Idempotentne: fikseeritud UUID-d + WHERE NOT EXISTS.
--
-- Lisab xroad.xroad_integration_log tabelisse 6 kirjet:
--   2x result_status='found'     (created_at täna/eile — vaikefiltri sisse)
--   2x result_status='not_found' (created_at täna/eile — vaikefiltri sisse)
--   1x result_status='error'     (created_at täna — vaikefiltri sisse)
--   1x result_status='found'     (created_at 10 päeva tagasi — VÄLJASPOOL vaikefiltrit,
--                                  testib et date-range filter tegelikult filtreerib)
--
-- source_record_id='95002001' on plausibel (kasutatud user-guide fixture'ites
-- compound_form_key'ina), aga logivaate link ei eelda sihtvormi olemasolu
-- Playwright CI-pinus — testitakse vaid, et href genereeritakse õige mustriga.
--
-- Käivitamine (dev):
--   psql -h localhost -p 54321 -U ljvis -d ljvis_db -f tests/bootstrap/seed_xroad_etoimik_logs.sql

BEGIN;

DO $$
BEGIN

  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000001'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6',
    '{"reference_number":"2026-VT-001","personal_code":"39001010001"}',
    '{"case_number":"2026-VT-001","decisions":["Rahatrahv (100 EUR)"]}',
    842, true, NULL, 'found', '39001010001',
    'compound_form', '95002001', now() - INTERVAL '3 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000001'::UUID
  );

  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000002'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6.cron.sp_driver',
    '{"reference_number":"2026-VT-002","personal_code":"38505050002"}',
    '{"case_number":"2026-VT-002","decisions":["Sõidukeeld (30 päeva)"]}',
    655, true, NULL, 'found', '38505050002',
    'sp_driver_form', '95002101', now() - INTERVAL '1 day' - INTERVAL '2 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000002'::UUID
  );

  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000003'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6',
    '{"reference_number":"2026-VT-003","personal_code":"39002020003"}',
    'null',
    412, true, NULL, 'not_found', '39002020003',
    'compound_form', '95002002', now() - INTERVAL '5 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000003'::UUID
  );

  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000004'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6.cron.tram',
    '{"reference_number":"2026-VT-004","personal_code":"38007070004"}',
    'null',
    398, true, NULL, 'not_found', '38007070004',
    'tram_control_card', '95002201', now() - INTERVAL '1 day' - INTERVAL '4 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000004'::UUID
  );

  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000005'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6',
    '{"reference_number":"2026-VT-005","personal_code":"39003030005"}',
    '{"faultCode":"Server.ServerProxy.ServiceFailed"}',
    120, false, 'XTR HTTP 500', 'error', '39003030005',
    'compound_form', '95002003', now() - INTERVAL '1 hour'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000005'::UUID
  );

  -- Väljaspool vaikefiltrit (eile-täna) — testib date-range filtreerimist.
  INSERT INTO xroad.xroad_integration_log (
    id, service_code, request_xml, response_xml, duration_ms, success,
    error_message, result_status, person_identifier, source_type,
    source_record_id, created_at
  )
  SELECT
    'e5000001-0000-4000-8000-000000000006'::UUID,
    'etoimik.AnnaIsikuKvalifikatsioonid.v6',
    '{"reference_number":"2026-VT-006","personal_code":"39004040006"}',
    '{"case_number":"2026-VT-006","decisions":["Hoiatus"]}',
    701, true, NULL, 'found', '39004040006',
    'compound_form', '95002004', now() - INTERVAL '10 days'
  WHERE NOT EXISTS (
    SELECT 1 FROM xroad.xroad_integration_log
    WHERE id = 'e5000001-0000-4000-8000-000000000006'::UUID
  );

END $$;

COMMIT;
