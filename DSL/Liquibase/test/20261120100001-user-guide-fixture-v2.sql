-- liquibase formatted sql
-- changeset ljvis:20261120100001 ignore:true splitStatements:false
--
-- Kasutusjuhendi ekraanipiltide täiendavad näidisandmed (capture.mjs v2).
--
-- Lisab:
--   1. notifications.notification — 4 in-app teavitust (lugemata + loetud,
--      erinevate tüüpidega ja vormilingiga), et teavituste lehel nähtaks "Ava vorm"
--   2. notifications.outbound_log — 5 saadetud kirja erineva staatusega
--      (sent/error), et "Saadetud kirjad" vahekaardil oleks sisu
--   3. risk.company_risk_score — 4 eelarvutatud riskiskoori (Punane, Kollane,
--      Roheline, Hall), et riskihindamise vaates nähtaks kõik värvid
--
-- Idempotentne: WHERE NOT EXISTS muster kõigis INSERT-ides.
--
-- Eeldab: 20260903100000-user-guide-fixture-forms.sql on rakendatud (kasutab
-- compound_form_key 95002001..95002005 ja risk-fixture reg-koode 90000001..90000006).

DO $$
DECLARE
  v_by TEXT := 'fixture-v2';
BEGIN

  -- ================================================================
  -- 1. In-app teavitused (notifications.notification)
  -- ================================================================

  -- Sõidukeeld (lugemata) — seotud avaldatud koondvormiga 95002001
  INSERT INTO notifications.notification (
    id, type, required_permission,
    related_entity_type, related_entity_id,
    title_et, body_et, created_at, created_by
  )
  SELECT
    'a1000001-0000-4000-8000-000000000001'::UUID,
    'driving_ban', 'compound_form.read',
    'compound_form', '95002001',
    'Sõidukeeld rakendatud — KOOND-2026-4001',
    'Autojuhi Andres Lepiku sõidumeeriku analüüs tuvastas ületamised. Kontrolli vorm KOOND-2026-4001/1.',
    now() - INTERVAL '2 hours', v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.notification
    WHERE id = 'a1000001-0000-4000-8000-000000000001'::UUID
  );

  -- NCR raske rikkumise teade (lugemata) — seotud koondvormiga 95002005
  INSERT INTO notifications.notification (
    id, type, required_permission,
    related_entity_type, related_entity_id,
    title_et, body_et, created_at, created_by
  )
  SELECT
    'a1000001-0000-4000-8000-000000000002'::UUID,
    'ncr_violation', 'ncr.read',
    'compound_form', '95002005',
    'Uus NCR teade — KOOND-2026-4005',
    'Saadeti ERRU NCR raske rikkumise teade vedajale Viru Ekspress OÜ (reg. 14033221).',
    now() - INTERVAL '1 day', v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.notification
    WHERE id = 'a1000001-0000-4000-8000-000000000002'::UUID
  );

  -- Vedajale saadetud raskete rikkumiste teavitus — seotud koondvormiga 95002002
  INSERT INTO notifications.notification (
    id, type, required_permission,
    related_entity_type, related_entity_id,
    title_et, body_et, created_at, created_by
  )
  SELECT
    'a1000001-0000-4000-8000-000000000003'::UUID,
    'carrier_violation', 'compound_form.read',
    'compound_form', '95002002',
    'Raskete rikkumiste teavitus saadetud — KOOND-2026-4002',
    'Vedajale Baltic Cargo OÜ edastati teavitus tuvastatud raskete rikkumiste kohta.',
    now() - INTERVAL '5 days', v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.notification
    WHERE id = 'a1000001-0000-4000-8000-000000000003'::UUID
  );

  -- NCR vastussõnum — teavitus ilma "Ava vorm" nuputa (entity_id puudub)
  INSERT INTO notifications.notification (
    id, type, required_permission,
    related_entity_type, related_entity_id,
    title_et, body_et, created_at, created_by
  )
  SELECT
    'a1000001-0000-4000-8000-000000000004'::UUID,
    'ncr_response', 'ncr.read',
    NULL, NULL,
    'NCR vastussõnum saabunud Saksamaalt',
    'Saksamaa pädev asutus on vastanud NCR päringule esialgse meetme rakendamise kinnitusega.',
    now() - INTERVAL '3 days', v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.notification
    WHERE id = 'a1000001-0000-4000-8000-000000000004'::UUID
  );

  -- ================================================================
  -- 2. Saadetud kirjad (notifications.outbound_log)
  -- ================================================================

  -- 1) Saadetud: sõidukeeld vedajale
  INSERT INTO notifications.outbound_log (
    id, message_type, send_date, status,
    related_entity_type, related_entity_id,
    notification_key, recipient_address,
    pk_template_id, pk_sending_operation_id,
    template_variables, requested_send_time,
    pk_operation_restart_allowed, pk_completed_at,
    created_by
  )
  SELECT
    'b2000001-0000-4000-8000-000000000001'::UUID,
    'driving_ban', now() - INTERVAL '2 hours', 'sent',
    'compound_form', '95002001',
    'driving-ban-95002001-001', 'andres.lepik@raplapiiim.ee',
    'driving-ban-v1', 'send-op-drban-001',
    '{"formNumber":"KOOND-2026-4001/1","driverName":"Andres Lepik","banDays":15}'::jsonb,
    now() - INTERVAL '2 hours', true,
    now() - INTERVAL '2 hours' + INTERVAL '3 seconds',
    v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.outbound_log
    WHERE id = 'b2000001-0000-4000-8000-000000000001'::UUID
  );

  -- 2) Saadetud: raskete rikkumiste teavitus vedajale
  INSERT INTO notifications.outbound_log (
    id, message_type, send_date, status,
    related_entity_type, related_entity_id,
    notification_key, recipient_address,
    pk_template_id, pk_sending_operation_id,
    template_variables, requested_send_time,
    pk_operation_restart_allowed, pk_completed_at,
    created_by
  )
  SELECT
    'b2000001-0000-4000-8000-000000000002'::UUID,
    'carrier_violation', now() - INTERVAL '5 days', 'sent',
    'compound_form', '95002002',
    'carrier-violation-95002002-001', 'info@balticcargo.ee',
    'carrier-violation-v1', 'send-op-cviol-001',
    '{"formNumber":"KOOND-2026-4002/1","companyName":"Baltic Cargo OÜ","regCode":"12077665"}'::jsonb,
    now() - INTERVAL '5 days', true,
    now() - INTERVAL '5 days' + INTERVAL '4 seconds',
    v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.outbound_log
    WHERE id = 'b2000001-0000-4000-8000-000000000002'::UUID
  );

  -- 3) Viga: NCR raske rikkumise teade (saatmine ebaõnnestus)
  INSERT INTO notifications.outbound_log (
    id, message_type, send_date, status,
    related_entity_type, related_entity_id,
    notification_key, recipient_address,
    pk_template_id, pk_sending_operation_id,
    template_variables, requested_send_time,
    pk_operation_restart_allowed, failure_reason,
    created_by
  )
  SELECT
    'b2000001-0000-4000-8000-000000000003'::UUID,
    'ncr_violation', now() - INTERVAL '1 day', 'error',
    'compound_form', '95002005',
    'ncr-violation-95002005-001', 'info@viruekspress.ee',
    'ncr-violation-v1', 'send-op-ncrviol-001',
    '{"formNumber":"KOOND-2026-4005/1","companyName":"Viru Ekspress OÜ"}'::jsonb,
    now() - INTERVAL '1 day', true,
    'Postkast 2.0 tagastas HTTP 502: teenus ajutiselt kättesaamatu.',
    v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.outbound_log
    WHERE id = 'b2000001-0000-4000-8000-000000000003'::UUID
  );

  -- 4) Saadetud: kabotaaži kontrolli teavitus tööinspektsioonile
  INSERT INTO notifications.outbound_log (
    id, message_type, send_date, status,
    related_entity_type, related_entity_id,
    notification_key, recipient_address,
    pk_template_id, pk_sending_operation_id,
    template_variables, requested_send_time,
    pk_operation_restart_allowed, pk_completed_at,
    created_by
  )
  SELECT
    'b2000001-0000-4000-8000-000000000004'::UUID,
    'labor_kabotage', now() - INTERVAL '8 days', 'sent',
    'compound_form', '95002003',
    'labor-kabotage-95002003-001', 'kontroll@ti.ee',
    'labor-kabotage-v1', 'send-op-kabotage-001',
    '{"formNumber":"KOOND-2026-4003/1","companyName":"Baltic Cargo OÜ","vehicleRegNr":"789GHI"}'::jsonb,
    now() - INTERVAL '8 days', false,
    now() - INTERVAL '8 days' + INTERVAL '2 seconds',
    v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.outbound_log
    WHERE id = 'b2000001-0000-4000-8000-000000000004'::UUID
  );

  -- 5) Saadetud: välisriigi ettepaneku teavitus
  INSERT INTO notifications.outbound_log (
    id, message_type, send_date, status,
    related_entity_type, related_entity_id,
    notification_key, recipient_address,
    pk_template_id, pk_sending_operation_id,
    template_variables, requested_send_time,
    pk_operation_restart_allowed, pk_completed_at,
    created_by
  )
  SELECT
    'b2000001-0000-4000-8000-000000000005'::UUID,
    'labor_foreign_proposal', now() - INTERVAL '12 days', 'sent',
    NULL, NULL,
    'labor-foreign-proposal-001', 'marko.tamm@raplapiiim.ee',
    'labor-foreign-proposal-v1', 'send-op-lfp-001',
    '{"proposalCountry":"DE","proposalDate":"2026-11-08"}'::jsonb,
    now() - INTERVAL '12 days', false,
    now() - INTERVAL '12 days' + INTERVAL '5 seconds',
    v_by
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications.outbound_log
    WHERE id = 'b2000001-0000-4000-8000-000000000005'::UUID
  );

  -- ================================================================
  -- 3. Riskiskoorid (risk.company_risk_score) — kõik 4 värvi
  -- ================================================================
  -- Eelarvutatud skoorid vastavalt calculate_risk_score.sql loogikale:
  -- Punane: R>=201, Kollane: 101<=R<=200, Roheline: R<=100, Hall: r=0/NULL

  INSERT INTO risk.company_risk_score (
    company_reg_code, company_name, risk_score, risk_band_code,
    total_controls, g_factor, window_start, window_end,
    calculation_trigger, algorithm_version, created_at, created_by
  )
  SELECT v.reg_code, v.co_name, v.score, v.band, v.controls, v.gf,
         v.ws, v.we, v.trigger, v.alg, now() - INTERVAL '1 hour', v_by
  FROM (VALUES
    ('90000001', 'Riskiskoori Test AS Punane',     230.0000::NUMERIC(12,4), 'Punane',  2, 1.00::NUMERIC(4,2), CURRENT_DATE - 365, CURRENT_DATE, 'cron', '2022-695-v1'),
    ('90000006', 'Riskiskoori Test AS Kollane',    120.0000::NUMERIC(12,4), 'Kollane', 1, 1.00::NUMERIC(4,2), CURRENT_DATE - 365, CURRENT_DATE, 'cron', '2022-695-v1'),
    ('90000002', 'Riskiskoori Test OU Nullpunkt',    0.0000::NUMERIC(12,4), 'Roheline',1, 1.00::NUMERIC(4,2), CURRENT_DATE - 365, CURRENT_DATE, 'cron', '2022-695-v1'),
    ('90000003', 'Riskiskoori Test AS Valistatud', NULL::NUMERIC(12,4),    'Hall',     1, 1.00::NUMERIC(4,2), CURRENT_DATE - 365, CURRENT_DATE, 'cron', '2022-695-v1')
  ) AS v(reg_code, co_name, score, band, controls, gf, ws, we, trigger, alg)
  WHERE NOT EXISTS (
    SELECT 1 FROM risk.company_risk_score
    WHERE company_reg_code = v.reg_code
  );

  RAISE NOTICE 'Kasutusjuhendi fixture v2 loodud (teavitused + riskiskoorid).';
END $$;
