-- liquibase formatted sql
-- changeset ljvis:20261021182827 ignore:true splitStatements:false
-- Persist the envelope before dispatch. Never retry an uncertain transmission.
ALTER TABLE erru.rsi_message DROP CONSTRAINT IF EXISTS chk_rsi_status;
ALTER TABLE erru.rsi_message ADD CONSTRAINT chk_rsi_status CHECK
  (status IN ('initiated','sending','send_unknown','sent','responded','received','answered','error'));
ALTER TABLE erru.rsi_message DROP CONSTRAINT IF EXISTS chk_rsi_status_matches_direction;
ALTER TABLE erru.rsi_message ADD CONSTRAINT chk_rsi_status_matches_direction CHECK
  (status = 'error' OR (direction = 'outgoing' AND status IN
   ('initiated','sending','send_unknown','sent','responded')) OR
   (direction = 'incoming' AND status IN ('received','answered')));

-- Serialize snapshot writers. Reject stale edits and stale completion snapshots.
CREATE OR REPLACE FUNCTION erru.guard_rsi_snapshot() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE previous_version INTEGER;
BEGIN
  IF NEW.direction <> 'outgoing' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.rsi:' || NEW.rsi_message_key, 0));
  SELECT version INTO previous_version FROM erru.rsi_message
    WHERE rsi_message_key = NEW.rsi_message_key ORDER BY version DESC, id DESC LIMIT 1;
  IF previous_version IS NOT NULL AND NEW.version <> previous_version + 1 THEN
    RAISE EXCEPTION 'Concurrent RSI revision; reload the message' USING ERRCODE = '40001';
  END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_rsi_snapshot ON erru.rsi_message;
CREATE TRIGGER trg_guard_rsi_snapshot BEFORE INSERT ON erru.rsi_message
  FOR EACH ROW EXECUTE FUNCTION erru.guard_rsi_snapshot();

CREATE OR REPLACE FUNCTION erru.rsi_begin_send(p_key BIGINT, p_version INTEGER, p_actor TEXT)
RETURNS SETOF erru.rsi_message LANGUAGE plpgsql AS $$
DECLARE v erru.rsi_message%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.rsi:' || p_key, 0));
  SELECT * INTO v FROM erru.rsi_message WHERE rsi_message_key = p_key
    ORDER BY version DESC, id DESC LIMIT 1;
  IF NOT FOUND OR v.direction <> 'outgoing' OR v.status <> 'initiated'
      OR v.version <> p_version THEN RETURN; END IF;
  v.version := v.version + 1;
  v.status := 'sending';
  v.technical_id := gen_random_uuid();
  v.workflow_id := gen_random_uuid();
  v.sent_at := date_trunc('second', clock_timestamp());
  v.created_by := p_actor;
  RETURN QUERY INSERT INTO erru.rsi_message (
    rsi_message_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
    rsi_from,
    rsi_to,
    originating_authority,
    request_source,
    request_purpose,
    vehicle_category,
    vehicle_registration_number,
    vehicle_registration_country,
    vehicle_identification_number,
    odometer_reading,
    driver_first_name,
    driver_family_name,
    driver_licence_number,
    driver_licence_country,
    identification_details,
    inspection_identifier,
    inspection_location,
    inspection_datetime,
    inspection_authority_or_name,
    inspection_passed,
    pti_requested,
    vehicle_prohibition_or_restriction,
    checked_items,
    response_status_code,
    response_status_message,
    handler_personal_code,
    handler_name,
    error_message,
    created_by
  ) SELECT
    v.rsi_message_key,
    v.version,
    v.direction,
    v.status,
    v.business_case_id,
    v.technical_id,
    v.workflow_id,
    v.sent_at,
    v.rsi_from,
    v.rsi_to,
    v.originating_authority,
    v.request_source,
    v.request_purpose,
    v.vehicle_category,
    v.vehicle_registration_number,
    v.vehicle_registration_country,
    v.vehicle_identification_number,
    v.odometer_reading,
    v.driver_first_name,
    v.driver_family_name,
    v.driver_licence_number,
    v.driver_licence_country,
    v.identification_details,
    v.inspection_identifier,
    v.inspection_location,
    v.inspection_datetime,
    v.inspection_authority_or_name,
    v.inspection_passed,
    v.pti_requested,
    v.vehicle_prohibition_or_restriction,
    v.checked_items,
    v.response_status_code,
    v.response_status_message,
    v.handler_personal_code,
    v.handler_name,
    v.error_message,
    v.created_by
  RETURNING *;
END $$;

INSERT INTO classifier.classifier_value
  (classifier_value_key, classifier_key, code, name, valid_from, created_by)
SELECT nextval('classifier.seq_classifier_value_key'), c.classifier_key, s.code, s.name,
       CURRENT_DATE, 'ljvis2'
FROM (SELECT DISTINCT ON (classifier_key) classifier_key FROM classifier.classifier
      WHERE code = 'RSI_REQUEST_STATUS' ORDER BY classifier_key, created_at DESC, id DESC) c
CROSS JOIN (VALUES ('sending','Saatmine pooleli'),
                   ('send_unknown','Saatmise tulemus teadmata')) s(code,name)
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier_value v
                  WHERE v.classifier_key = c.classifier_key AND v.code = s.code);

-- Reserve before network I/O. A crash leaves unknown and must never cause an automatic resend.
CREATE TABLE IF NOT EXISTS erru.xml_rsi_dispatch (
 technical_id UUID PRIMARY KEY,
 workflow_id UUID NOT NULL UNIQUE,
 xml_body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','accepted','rejected')),
 hub_http_status INTEGER,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 completed_at TIMESTAMPTZ
);
COMMENT ON TABLE erru.xml_rsi_dispatch IS 'Outgoing RSI transport journal. One dispatch per technical/workflow ID. Retain XML for reconciliation. No automatic retries.';
