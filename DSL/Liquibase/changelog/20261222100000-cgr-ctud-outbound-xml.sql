-- liquibase formatted sql
-- changeset ljvis:20261222100000 ignore:true splitStatements:false
-- Outgoing CGR and CTUD leave as ERRU 3.5 XML through the adapter. The Hub answers HTTP 202 only;
-- the business answer arrives later through /erru/xml. Persist the envelope before dispatch and
-- never retry an uncertain transmission.

-- CGR lifecycle: initiated -> sending -> sent -> responded (+ send_unknown, error)
ALTER TABLE erru.cgr_request DROP CONSTRAINT IF EXISTS chk_cgr_status;
ALTER TABLE erru.cgr_request ADD CONSTRAINT chk_cgr_status CHECK
  (status IN ('initiated','sending','send_unknown','sent','responded','received','answered','error'));
ALTER TABLE erru.cgr_request DROP CONSTRAINT IF EXISTS chk_cgr_status_matches_direction;
ALTER TABLE erru.cgr_request ADD CONSTRAINT chk_cgr_status_matches_direction CHECK
  (status = 'error' OR (direction = 'outgoing' AND status IN
   ('initiated','sending','send_unknown','sent','responded')) OR
   (direction = 'incoming' AND status IN ('received','answered')));

-- CTUD lifecycle: initiated -> sending -> sent -> responded (+ send_unknown, error)
ALTER TABLE erru.ctud_request DROP CONSTRAINT IF EXISTS chk_ctud_status;
ALTER TABLE erru.ctud_request ADD CONSTRAINT chk_ctud_status CHECK
  (status IN ('initiated','sending','send_unknown','sent','responded','received','answered','error'));
ALTER TABLE erru.ctud_request DROP CONSTRAINT IF EXISTS chk_ctud_status_matches_direction;
ALTER TABLE erru.ctud_request ADD CONSTRAINT chk_ctud_status_matches_direction CHECK
  (status = 'error' OR (direction = 'outgoing' AND status IN
   ('initiated','sending','send_unknown','sent','responded')) OR
   (direction = 'incoming' AND status IN ('received','answered')));

COMMENT ON COLUMN erru.cgr_request.status IS 'Lifecycle status. Outgoing: initiated -> sending (envelope reserved) -> sent (Hub HTTP 202) -> responded (member_states filled from asynchronous CheckGoodRepute_Response messages; more responses merge into the same document). send_unknown = dispatch outcome uncertain, never resent automatically. Incoming: received -> answered. Shared: error. Transitions are enforced by erru.cgr_begin_send, erru.cgr_apply_response and DSL/Resql/ljvis/POST/erru/cgr/append-transition.sql.';
COMMENT ON COLUMN erru.ctud_request.status IS 'Lifecycle status. Outgoing: initiated -> sending (envelope reserved) -> sent (Hub HTTP 202) -> responded (asynchronous CheckTransportUndertakingData_Response). send_unknown = dispatch outcome uncertain, never resent automatically. Incoming: received -> answered. Shared: error.';

CREATE INDEX IF NOT EXISTS idx_cgr_outgoing_workflow ON erru.cgr_request (workflow_id, created_at DESC) WHERE direction = 'outgoing';
CREATE INDEX IF NOT EXISTS idx_ctud_outgoing_workflow ON erru.ctud_request (workflow_id, created_at DESC) WHERE direction = 'outgoing';

-- Reserve the envelope before any network I/O. p_target is empty for the original send (draft or
-- definite rejection retry) and a member state code for a per-country resend, which keeps the
-- status and the workflow_id but takes a new technical_id.
CREATE OR REPLACE FUNCTION erru.cgr_begin_send(p_key BIGINT, p_actor TEXT, p_first_key TEXT, p_family_key TEXT, p_target TEXT)
RETURNS TABLE (technical_id UUID, workflow_id UUID, sent_at TEXT, status TEXT, version INTEGER)
LANGUAGE plpgsql AS $$
DECLARE v erru.cgr_request%ROWTYPE; v_resend BOOLEAN := COALESCE(p_target, '') <> '';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.cgr:' || p_key, 0));
  SELECT * INTO v FROM erru.cgr_request r WHERE r.cgr_request_key = p_key
    ORDER BY r.version DESC, r.id DESC LIMIT 1;
  IF NOT FOUND OR v.direction <> 'outgoing' THEN RETURN; END IF;
  IF v_resend THEN
    IF v.status NOT IN ('sent','responded') THEN RETURN; END IF;
  ELSE
    IF v.status NOT IN ('initiated','error') THEN RETURN; END IF;
    v.status := 'sending';
    v.workflow_id := COALESCE(v.workflow_id, gen_random_uuid());
  END IF;
  v.version := v.version + 1;
  v.technical_id := gen_random_uuid();
  v.sent_at := date_trunc('second', clock_timestamp());
  v.error_message := NULL;
  v.created_by := p_actor;
  v.tm_first_name_search_key := COALESCE(NULLIF(p_first_key, ''), v.tm_first_name_search_key);
  v.tm_family_name_search_key := COALESCE(NULLIF(p_family_key, ''), v.tm_family_name_search_key);
  RETURN QUERY INSERT INTO erru.cgr_request (
    cgr_request_key, version, direction, status, business_case_id, technical_id, workflow_id, sent_at,
    cgr_from, cgr_to, originating_authority, request_source, request_purpose,
    tm_first_name, tm_family_name, tm_date_of_birth, tm_place_of_birth,
    tm_first_name_search_key, tm_family_name_search_key,
    certificate_number, certificate_issue_date, certificate_issue_country,
    member_states, handler_personal_code, handler_name, error_message, created_by
  ) VALUES (
    v.cgr_request_key, v.version, v.direction, v.status, v.business_case_id, v.technical_id, v.workflow_id, v.sent_at,
    v.cgr_from, v.cgr_to, v.originating_authority, v.request_source, v.request_purpose,
    v.tm_first_name, v.tm_family_name, v.tm_date_of_birth, v.tm_place_of_birth,
    v.tm_first_name_search_key, v.tm_family_name_search_key,
    v.certificate_number, v.certificate_issue_date, v.certificate_issue_country,
    v.member_states, v.handler_personal_code, v.handler_name, v.error_message, v.created_by
  ) RETURNING erru.cgr_request.technical_id, erru.cgr_request.workflow_id,
              to_char(erru.cgr_request.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              erru.cgr_request.status::TEXT, erru.cgr_request.version;
END $$;

-- Merge one asynchronous response into the outgoing request identified by workflow_id. Entries
-- are replaced per memberStateCode. Replaying identical content creates no snapshot.
CREATE OR REPLACE FUNCTION erru.cgr_apply_response(p_workflow UUID, p_states JSONB)
RETURNS TABLE (id BIGINT, business_case_id TEXT, version INTEGER, status TEXT, workflow_id TEXT)
LANGUAGE plpgsql AS $$
DECLARE v erru.cgr_request%ROWTYPE; v_key BIGINT; v_merged JSONB;
BEGIN
  SELECT r.cgr_request_key INTO v_key FROM erru.cgr_request r
    WHERE r.workflow_id = p_workflow AND r.direction = 'outgoing'
    ORDER BY r.created_at DESC, r.id DESC LIMIT 1;
  IF v_key IS NULL THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.cgr:' || v_key, 0));
  SELECT * INTO v FROM erru.cgr_request r WHERE r.cgr_request_key = v_key
    ORDER BY r.version DESC, r.id DESC LIMIT 1;
  IF v.status NOT IN ('sending','send_unknown','sent','responded') THEN RETURN; END IF;
  -- Replace an answered member state in place so its position (and therefore replay equality) stays
  -- stable; entries of member states not seen before are appended in arrival order.
  SELECT COALESCE(jsonb_agg(x.e ORDER BY x.ord), '[]'::JSONB) INTO v_merged FROM (
    SELECT COALESCE((SELECT n FROM jsonb_array_elements(p_states) n WHERE n->>'memberStateCode' = o.e->>'memberStateCode' LIMIT 1), o.e) AS e,
           o.ord
      FROM jsonb_array_elements(COALESCE(v.member_states, '[]'::JSONB)) WITH ORDINALITY AS o(e, ord)
    UNION ALL
    SELECT m.n, 1000000 + m.ord
      FROM jsonb_array_elements(p_states) WITH ORDINALITY AS m(n, ord)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v.member_states, '[]'::JSONB)) o2
                         WHERE o2->>'memberStateCode' = m.n->>'memberStateCode')
  ) x;
  IF v.status = 'responded' AND v_merged = v.member_states THEN RETURN; END IF;
  RETURN QUERY INSERT INTO erru.cgr_request (
    cgr_request_key, version, direction, status, business_case_id, technical_id, workflow_id, sent_at,
    cgr_from, cgr_to, originating_authority, request_source, request_purpose,
    tm_first_name, tm_family_name, tm_date_of_birth, tm_place_of_birth,
    tm_first_name_search_key, tm_family_name_search_key,
    certificate_number, certificate_issue_date, certificate_issue_country,
    member_states, handler_personal_code, handler_name, error_message, created_by
  ) VALUES (
    v.cgr_request_key, v.version + 1, v.direction, 'responded', v.business_case_id, v.technical_id, v.workflow_id, v.sent_at,
    v.cgr_from, v.cgr_to, v.originating_authority, v.request_source, v.request_purpose,
    v.tm_first_name, v.tm_family_name, v.tm_date_of_birth, v.tm_place_of_birth,
    v.tm_first_name_search_key, v.tm_family_name_search_key,
    v.certificate_number, v.certificate_issue_date, v.certificate_issue_country,
    v_merged, v.handler_personal_code, v.handler_name, NULL, 'system'
  ) RETURNING erru.cgr_request.cgr_request_key, erru.cgr_request.business_case_id::TEXT,
              erru.cgr_request.version, erru.cgr_request.status::TEXT, erru.cgr_request.workflow_id::TEXT;
END $$;

CREATE OR REPLACE FUNCTION erru.ctud_begin_send(p_key BIGINT, p_actor TEXT)
RETURNS TABLE (technical_id UUID, workflow_id UUID, sent_at TEXT, status TEXT, version INTEGER)
LANGUAGE plpgsql AS $$
DECLARE v erru.ctud_request%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.ctud:' || p_key, 0));
  SELECT * INTO v FROM erru.ctud_request r WHERE r.ctud_request_key = p_key
    ORDER BY r.version DESC, r.id DESC LIMIT 1;
  IF NOT FOUND OR v.direction <> 'outgoing' OR v.status NOT IN ('initiated','error') THEN RETURN; END IF;
  v.version := v.version + 1;
  v.status := 'sending';
  v.technical_id := gen_random_uuid();
  v.workflow_id := COALESCE(v.workflow_id, gen_random_uuid());
  v.sent_at := date_trunc('second', clock_timestamp());
  v.error_message := NULL;
  v.created_by := p_actor;
  RETURN QUERY INSERT INTO erru.ctud_request (
    ctud_request_key, version, direction, status, business_case_id, technical_id, workflow_id, sent_at,
    ctud_from, ctud_to, originating_authority, request_source, request_purpose,
    transport_undertaking_name, community_licence_number, vehicle_registration_number,
    vehicle_registration_country, request_all_vehicles,
    responding_authority, response_status_code, response_status_message, response_content,
    handler_personal_code, handler_name, error_message, created_by
  ) VALUES (
    v.ctud_request_key, v.version, v.direction, v.status, v.business_case_id, v.technical_id, v.workflow_id, v.sent_at,
    v.ctud_from, v.ctud_to, v.originating_authority, v.request_source, v.request_purpose,
    v.transport_undertaking_name, v.community_licence_number, v.vehicle_registration_number,
    v.vehicle_registration_country, v.request_all_vehicles,
    NULL, NULL, NULL, NULL,
    v.handler_personal_code, v.handler_name, v.error_message, v.created_by
  ) RETURNING erru.ctud_request.technical_id, erru.ctud_request.workflow_id,
              to_char(erru.ctud_request.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              erru.ctud_request.status::TEXT, erru.ctud_request.version;
END $$;

-- Transport journal shared by outgoing CGR and CTUD (RSI keeps xml_rsi_dispatch). One row per
-- technical_id; a CGR resend has its own technical_id but shares the workflow_id.
CREATE TABLE IF NOT EXISTS erru.xml_outbound_dispatch (
 technical_id UUID PRIMARY KEY,
 workflow_id UUID NOT NULL,
 message_type TEXT NOT NULL CHECK (message_type IN ('CGR','CTUD')),
 xml_body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','accepted','rejected')),
 hub_http_status INTEGER,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_xml_outbound_dispatch_workflow ON erru.xml_outbound_dispatch (workflow_id);
COMMENT ON TABLE erru.xml_outbound_dispatch IS 'Outgoing CGR/CTUD transport journal. Reserved before the HTTP call, so a crash leaves status unknown. Retain XML for reconciliation. No automatic retries.';

INSERT INTO classifier.classifier_value
  (classifier_value_key, classifier_key, code, name, valid_from, created_by)
SELECT nextval('classifier.seq_classifier_value_key'), c.classifier_key, s.code, s.name,
       CURRENT_DATE, 'ljvis2'
FROM (SELECT DISTINCT ON (classifier_key, code) classifier_key, code FROM classifier.classifier
      WHERE code IN ('CGR_REQUEST_STATUS','CTUD_REQUEST_STATUS') ORDER BY classifier_key, code, created_at DESC, id DESC) c
JOIN (VALUES ('CGR_REQUEST_STATUS','sending','Saatmine pooleli'),
             ('CGR_REQUEST_STATUS','send_unknown','Saatmise tulemus teadmata'),
             ('CGR_REQUEST_STATUS','responded','Vastus saadud'),
             ('CTUD_REQUEST_STATUS','sending','Saatmine pooleli'),
             ('CTUD_REQUEST_STATUS','send_unknown','Saatmise tulemus teadmata')) s(clf, code, name)
  ON s.clf = c.code
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier_value v
                  WHERE v.classifier_key = c.classifier_key AND v.code = s.code);
