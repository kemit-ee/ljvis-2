-- liquibase formatted sql
-- changeset ljvis:20261223100000 ignore:true splitStatements:false
-- Outgoing NCR (request and response) and NU leave as ERRU 3.5 XML through the adapter. The Hub
-- answers HTTP 202 only; acknowledgements and responses arrive later through /erru/xml. The
-- envelope is persisted before dispatch and an uncertain transmission is never retried.

-- The shared transport journal also holds NCR, NCR response and NU.
ALTER TABLE erru.xml_outbound_dispatch DROP CONSTRAINT IF EXISTS xml_outbound_dispatch_message_type_check;
ALTER TABLE erru.xml_outbound_dispatch ADD CONSTRAINT xml_outbound_dispatch_message_type_check
  CHECK (message_type IN ('CGR','CTUD','NCR','NCR_RESPONSE','NU'));

-- ── NU: initiated -> sending -> sent (+ send_unknown, error) ─────────────────────────────────
ALTER TABLE erru.nu_message DROP CONSTRAINT IF EXISTS chk_nu_status;
ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_status CHECK
  (status IN ('initiated','sending','send_unknown','sent','received','acknowledged','error'));
ALTER TABLE erru.nu_message DROP CONSTRAINT IF EXISTS chk_nu_status_matches_direction;
ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_status_matches_direction CHECK
  (status = 'error' OR (direction = 'outgoing' AND status IN ('initiated','sending','send_unknown','sent'))
   OR (direction = 'incoming' AND status IN ('received','acknowledged')));

CREATE OR REPLACE FUNCTION erru.nu_begin_send(k BIGINT, expected_version INTEGER, first_key TEXT, family_key TEXT, actor TEXT, actor_name TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r erru.nu_message; g forms.good_repute_form; h JSONB; p JSONB; v JSONB;
BEGIN
  PERFORM pg_advisory_xact_lock(k);
  SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
  IF r.status IS DISTINCT FROM 'initiated' OR r.direction <> 'outgoing' THEN RETURN '{"code":"not_sendable"}'; END IF;
  IF expected_version IS DISTINCT FROM r.version THEN RETURN '{"code":"version_conflict"}'; END IF;
  SELECT * INTO g FROM forms.good_repute_form WHERE good_repute_form_key=r.source_good_repute_form_key ORDER BY created_at DESC,id DESC LIMIT 1;
  IF g.status IS DISTINCT FROM 'published' OR g.fitness_status IS DISTINCT FROM 'unfit'
    OR g.unfit_until_date IS NULL OR g.unfit_until_date < (clock_timestamp() AT TIME ZONE 'Europe/Tallinn')::DATE
    THEN RETURN '{"code":"source_not_eligible"}'; END IF;
  IF length(first_key)>100 OR length(family_key)>100
    OR (r.tm_first_name IS NOT NULL AND (COALESCE(first_key,'')='' OR COALESCE(family_key,'')=''))
    THEN RETURN '{"code":"nysiis_unavailable"}'; END IF;
  p := erru.nu_message_identity(r) || jsonb_build_object('nuTo',r.nu_to,'businessCaseId',r.business_case_id,
    'originatingAuthority',r.originating_authority,'requestSource',r.request_source,'requestPurpose',r.request_purpose,
    'unfitStartDate',r.unfit_start_date,'tmFirstNameSearchKey',nullif(first_key,''),'tmFamilyNameSearchKey',nullif(family_key,''));
  v := erru.nu_validate(p,'outgoing');
  IF v->>'valid' IS DISTINCT FROM 'true' THEN RETURN v; END IF;
  r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.status := 'sending';
  r.technical_id := gen_random_uuid(); r.workflow_id := gen_random_uuid(); r.sent_at := date_trunc('second',clock_timestamp());
  r.tm_first_name_search_key := nullif(first_key,''); r.tm_family_name_search_key := nullif(family_key,'');
  r.handler_personal_code := actor; r.handler_name := actor_name; r.created_by := actor; r.created_at := clock_timestamp();
  INSERT INTO erru.nu_message SELECT r.*;
  h := jsonb_build_object('version','3.5','technicalId',r.technical_id,'workflowId',r.workflow_id,
    'sentAt',to_char(r.sent_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'from',r.nu_from,'to',COALESCE(r.nu_to,'ZZ'));
  p := p || h;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome)
    VALUES(k,'Request',r.technical_id,r.workflow_id,r.business_case_id,r.nu_from,COALESCE(r.nu_to,'ZZ'),p,'started');
  RETURN p;
END $$;

-- nu_finish_send recorded a synchronous acknowledgement. The outcome is now nu_mark_dispatch and the
-- acknowledgements arrive through nu_apply_ack, so the old function would only mislead.
DROP FUNCTION IF EXISTS erru.nu_finish_send(BIGINT, JSONB, TEXT);

-- Hub HTTP outcome of the dispatch: sending -> sent | error | send_unknown. Repeating it changes nothing.
CREATE OR REPLACE FUNCTION erru.nu_mark_dispatch(k BIGINT, outcome TEXT, failure TEXT) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE r erru.nu_message; e erru.nu_exchange_event;
BEGIN
  IF outcome NOT IN ('accepted','rejected','unknown') THEN RETURN '{"code":"invalid_outcome"}'; END IF;
  PERFORM pg_advisory_xact_lock(k);
  SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
  SELECT * INTO e FROM erru.nu_exchange_event WHERE nu_message_key=k AND kind='Request' ORDER BY id DESC LIMIT 1;
  IF e.id IS NULL OR r.direction IS DISTINCT FROM 'outgoing' THEN RETURN '{"code":"not_sendable"}'; END IF;
  IF r.status IS DISTINCT FROM 'sending' THEN
    RETURN jsonb_build_object('id',k,'status',r.status,'changed',false);
  END IF;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome,parent_id)
    VALUES(k,'SendResult',gen_random_uuid(),e.workflow_id,e.business_case_id,'EE',e.destination,
      jsonb_build_object('dispatch',outcome,'error',failure),CASE WHEN outcome='accepted' THEN 'success' ELSE 'failure' END,e.id);
  r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.created_at := clock_timestamp();
  r.status := CASE outcome WHEN 'accepted' THEN 'sent' WHEN 'rejected' THEN 'error' ELSE 'send_unknown' END;
  r.error_message := CASE WHEN outcome='accepted' THEN NULL ELSE failure END;
  INSERT INTO erru.nu_message SELECT r.*;
  RETURN jsonb_build_object('id',k,'status',r.status,'changed',true);
END $$;

-- Merge one NotifyUnfitness_Acknowledgement into the outgoing message identified by workflow_id.
-- A returned NULL means no outgoing message has that workflow. Replays change nothing.
CREATE OR REPLACE FUNCTION erru.nu_apply_ack(p_workflow UUID, p_technical UUID, p_from TEXT, p_members JSONB) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE r erru.nu_message; k BIGINT; merged JSONB; inserted INTEGER;
BEGIN
  SELECT m.nu_message_key INTO k FROM erru.nu_message m
    WHERE m.workflow_id = p_workflow AND m.direction = 'outgoing' ORDER BY m.created_at DESC, m.id DESC LIMIT 1;
  IF k IS NULL THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(k);
  SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
  IF r.status NOT IN ('sending','send_unknown','sent') THEN
    RETURN jsonb_build_object('status','ignored','id',k,'businessCaseId',r.business_case_id);
  END IF;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome)
    VALUES(k,'Acknowledgement',p_technical,p_workflow,r.business_case_id,p_from,'EE',jsonb_build_object('memberStates',p_members),'received')
    ON CONFLICT (kind, source, technical_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN jsonb_build_object('status','already_acknowledged','id',k,'businessCaseId',r.business_case_id);
  END IF;
  -- Replace an answered member state in place; append member states not seen before.
  SELECT COALESCE(jsonb_agg(x.e ORDER BY x.ord), '[]'::JSONB) INTO merged FROM (
    SELECT COALESCE((SELECT n FROM jsonb_array_elements(p_members) n WHERE n->>'memberStateCode' = o.e->>'memberStateCode' LIMIT 1), o.e) AS e,
           o.ord
      FROM jsonb_array_elements(COALESCE(r.member_states, '[]'::JSONB)) WITH ORDINALITY AS o(e, ord)
    UNION ALL
    SELECT m.n, 1000000 + m.ord
      FROM jsonb_array_elements(p_members) WITH ORDINALITY AS m(n, ord)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(r.member_states, '[]'::JSONB)) o2
                         WHERE o2->>'memberStateCode' = m.n->>'memberStateCode')
  ) x;
  IF merged = r.member_states THEN
    RETURN jsonb_build_object('status','already_acknowledged','id',k,'businessCaseId',r.business_case_id);
  END IF;
  r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.created_at := clock_timestamp();
  r.status := 'sent'; r.member_states := merged; r.error_message := NULL; r.created_by := 'system';
  INSERT INTO erru.nu_message SELECT r.*;
  RETURN jsonb_build_object('status','acknowledged','id',k,'businessCaseId',r.business_case_id);
END $$;

-- A Hub ErrorNotification also ends a request whose dispatch is still sending or of unknown outcome.
CREATE OR REPLACE FUNCTION erru.nu_record_exchange_result(p JSONB, event_kind TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE e erru.nu_exchange_event; old erru.nu_exchange_event; r erru.nu_message; original XML;
  original_id TEXT; original_workflow TEXT; original_case TEXT; original_from TEXT; original_to TEXT;
  event_uuid UUID; workflow UUID; peer TEXT; code TEXT; result TEXT; count_keys INTEGER; event_key BIGINT;
BEGIN
  IF event_kind IS DISTINCT FROM 'ErrorNotification' THEN RETURN '{"httpStatus":400,"code":"invalid_value"}'; END IF;
  IF COALESCE(p->>'technicalId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
    OR COALESCE(p->>'workflowId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' THEN
    RETURN '{"httpStatus":400,"code":"invalid_value"}';
  END IF;
  BEGIN
    event_uuid := (p->>'technicalId')::UUID; workflow := (p->>'workflowId')::UUID;
  EXCEPTION WHEN OTHERS THEN RETURN '{"httpStatus":400,"code":"invalid_value"}'; END;
  IF event_uuid IS NULL OR workflow IS NULL THEN RETURN '{"httpStatus":400,"code":"required"}'; END IF;
  peer := p->>'from'; code := p->>'statusCode';
  IF length(COALESCE(peer,''))<>2 OR length(COALESCE(p->>'businessCaseId','')) NOT BETWEEN 1 AND 36
    OR code IS NULL OR code NOT IN ('InvalidFormat','InvalidData','Timeout','ServerError','Other','ResponseNotCorrelated','DuplicateRequest','DuplicateResponse')
    OR length(COALESCE(p->>'statusMessage',''))>512 OR p->>'originalMessage' IS NULL OR p->>'originalMessage' = '' THEN
    RETURN '{"httpStatus":400,"code":"invalid_value"}';
  END IF;
  BEGIN
    IF COALESCE(p->>'to','') <> 'EE'
      OR COALESCE(p->>'sentAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'
      OR (p->>'sentAt')::TIMESTAMPTZ < '1753-01-01T00:00:00Z'::TIMESTAMPTZ
      OR to_char((p->>'sentAt')::TIMESTAMPTZ AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') <> p->>'sentAt' THEN
      RETURN '{"httpStatus":400,"code":"invalid_value"}';
    END IF;
  EXCEPTION WHEN OTHERS THEN RETURN '{"httpStatus":400,"code":"invalid_value"}'; END;
  BEGIN
    IF p->>'originalMessage' ~* '<![[:space:]]*(DOCTYPE|ENTITY)' THEN RETURN '{"httpStatus":400,"code":"invalid_value"}'; END IF;
    original := XMLPARSE(DOCUMENT (p->>'originalMessage'));
    IF (xpath('string(local-name(/*))',original))[1]::TEXT NOT IN ('NotifyUnfitness_Request','NotifyUnfitness_Acknowledgement')
      OR (xpath('string(namespace-uri(/*))',original))[1]::TEXT <> 'https://webgate.ec.testa.eu/move-hub/erru/3.5' THEN
      RETURN '{"httpStatus":400,"code":"invalid_value"}';
    END IF;
    original_id := (xpath('string(/*/*[local-name()="Header"]/@technicalId)',original))[1]::TEXT;
    original_workflow := (xpath('string(/*/*[local-name()="Header"]/@workflowId)',original))[1]::TEXT;
    original_case := (xpath('string(/*/*[local-name()="Body"]/@businessCaseId)',original))[1]::TEXT;
    original_from := (xpath('string(/*/*[local-name()="Header"]/@from)',original))[1]::TEXT;
    original_to := (xpath('string(/*/*[local-name()="Header"]/@to)',original))[1]::TEXT;
  EXCEPTION WHEN OTHERS THEN original_id := NULL; END;
  IF original_id = event_uuid::TEXT THEN RETURN '{"httpStatus":400,"code":"invalid_value"}'; END IF;
  IF (NULLIF(original_workflow,'') IS NOT NULL AND original_workflow <> workflow::TEXT)
    OR (NULLIF(original_case,'') IS NOT NULL AND original_case <> p->>'businessCaseId') THEN
    result := 'conflicting_identifiers';
  ELSIF NULLIF(original_id,'') IS NOT NULL THEN
    SELECT * INTO e FROM erru.nu_exchange_event WHERE technical_id::TEXT=original_id
      AND kind IN ('Request','Acknowledgement') AND workflow_id=workflow AND business_case_id=p->>'businessCaseId'
      AND source=original_from AND destination=original_to
      AND (peer=source OR peer=destination OR destination='ZZ') ORDER BY id LIMIT 1;
  ELSE
    SELECT count(DISTINCT nu_message_key) INTO count_keys FROM erru.nu_exchange_event
      WHERE workflow_id=workflow AND business_case_id=p->>'businessCaseId' AND kind IN ('Request','Acknowledgement')
      AND (peer=source OR peer=destination OR destination='ZZ');
    IF count_keys=1 THEN
      SELECT * INTO e FROM erru.nu_exchange_event WHERE workflow_id=workflow AND business_case_id=p->>'businessCaseId'
        AND kind IN ('Request','Acknowledgement') AND (peer=source OR peer=destination OR destination='ZZ') ORDER BY id LIMIT 1;
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(event_kind || peer || event_uuid::TEXT,0));
  SELECT * INTO old FROM erru.nu_exchange_event WHERE kind=event_kind AND source=peer AND technical_id=event_uuid;
  IF FOUND THEN
    IF old.payload <> p THEN RETURN '{"httpStatus":409,"code":"duplicate_conflict"}'; END IF;
    RETURN jsonb_build_object('httpStatus',CASE WHEN old.nu_message_key IS NULL THEN 202 ELSE 200 END,'outcome',old.outcome,'duplicate',true);
  END IF;
  result := COALESCE(result,CASE WHEN e.id IS NULL THEN 'uncorrelated' ELSE 'failure' END);
  IF e.nu_message_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(e.nu_message_key);
    SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=e.nu_message_key ORDER BY created_at DESC,id DESC LIMIT 1;
    IF r.status IN ('sending','send_unknown','sent','received','acknowledged') THEN
      r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.status := 'error';
      r.created_at := clock_timestamp(); r.created_by := 'system'; r.error_message := event_kind || ': ' || code;
      INSERT INTO erru.nu_message SELECT r.*;
    ELSIF r.status <> 'error' THEN result := 'transition_not_allowed'; END IF;
  END IF;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome,parent_id)
    VALUES(e.nu_message_key,event_kind,event_uuid,workflow,COALESCE(e.business_case_id,p->>'businessCaseId'),peer,'EE',p,result,e.id) RETURNING id INTO event_key;
  RETURN jsonb_build_object('httpStatus',CASE WHEN e.id IS NULL THEN 202 ELSE 200 END,'outcome',result,'eventId',event_key::TEXT);
END $$;

-- ── NCR: initiated -> sending -> sent -> acknowledged -> responded (+ send_unknown, error) ───
-- Incoming answers go answer_drafted -> sending -> answered.
ALTER TABLE erru.ncr_message DROP CONSTRAINT IF EXISTS chk_ncr_status;
ALTER TABLE erru.ncr_message ADD CONSTRAINT chk_ncr_status CHECK
  (status IN ('initiated','sending','send_unknown','sent','acknowledged','responded',
              'received','viewed','answer_drafted','forwarded','answered','error'));
ALTER TABLE erru.ncr_message
  ADD COLUMN IF NOT EXISTS response_technical_id UUID,
  ADD COLUMN IF NOT EXISTS response_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN erru.ncr_message.response_technical_id IS 'Header technicalId of the NotifyCheckResult_Response we send for an INCOMING message. Reserved by erru.ncr_begin_response before dispatch. The workflow_id of the incoming message is reused.';
COMMENT ON COLUMN erru.ncr_message.response_sent_at IS 'Header sentAt of the NotifyCheckResult_Response we send for an INCOMING message.';
COMMENT ON COLUMN erru.ncr_message.status IS 'Lifecycle status. Outgoing: initiated -> sending (envelope reserved) -> sent (Hub HTTP 202) -> acknowledged (NotifyCheckResult_Acknowledgement) -> responded (NotifyCheckResult_Response); send_unknown = outcome uncertain, never resent automatically; error may be retried. Incoming: received -> viewed -> {forwarded | answer_drafted -> sending -> answered}.';

CREATE INDEX IF NOT EXISTS idx_ncr_outgoing_workflow ON erru.ncr_message (workflow_id, created_at DESC) WHERE direction = 'outgoing';

-- Reserve an outgoing NCR request (initiated|error -> sending) before any network I/O.
CREATE OR REPLACE FUNCTION erru.ncr_begin_send(p_business_case_id TEXT, p_actor TEXT)
RETURNS TABLE (technical_id UUID, workflow_id UUID, sent_at TEXT, status TEXT, version INTEGER)
LANGUAGE plpgsql AS $$
DECLARE r erru.ncr_message;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.ncr:' || p_business_case_id, 0));
  SELECT * INTO r FROM erru.ncr_message m WHERE m.business_case_id = p_business_case_id
    ORDER BY m.created_at DESC, m.id DESC LIMIT 1;
  IF NOT FOUND OR r.direction <> 'outgoing' OR r.status NOT IN ('initiated','error') THEN RETURN; END IF;
  r.id := nextval(pg_get_serial_sequence('erru.ncr_message','id'));
  r.version := r.version + 1;
  r.status := 'sending';
  r.technical_id := gen_random_uuid();
  r.workflow_id := COALESCE(r.workflow_id, gen_random_uuid());
  r.sent_at := date_trunc('second', clock_timestamp());
  r.ack_status_code := NULL; r.ack_status_message := NULL; r.ack_received_at := NULL;
  r.error_message := NULL;
  r.created_by := p_actor; r.created_at := clock_timestamp();
  INSERT INTO erru.ncr_message SELECT r.*;
  RETURN QUERY SELECT r.technical_id, r.workflow_id,
    to_char(r.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), r.status::TEXT, r.version;
END $$;

-- Reserve the response to an incoming NCR (answer_drafted|error -> sending). The incoming
-- message keeps its own technical_id and workflow_id; the response gets a new technicalId.
CREATE OR REPLACE FUNCTION erru.ncr_begin_response(p_business_case_id TEXT, p_actor TEXT)
RETURNS TABLE (technical_id UUID, workflow_id UUID, sent_at TEXT, status TEXT, version INTEGER)
LANGUAGE plpgsql AS $$
DECLARE r erru.ncr_message;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('erru.ncr:' || p_business_case_id, 0));
  SELECT * INTO r FROM erru.ncr_message m WHERE m.business_case_id = p_business_case_id
    ORDER BY m.created_at DESC, m.id DESC LIMIT 1;
  IF NOT FOUND OR r.direction <> 'incoming' OR r.status NOT IN ('answer_drafted','error')
     OR r.workflow_id IS NULL THEN RETURN; END IF;
  r.id := nextval(pg_get_serial_sequence('erru.ncr_message','id'));
  r.version := r.version + 1;
  r.status := 'sending';
  r.response_technical_id := gen_random_uuid();
  r.response_sent_at := date_trunc('second', clock_timestamp());
  r.error_message := NULL;
  r.created_by := p_actor; r.created_at := clock_timestamp();
  INSERT INTO erru.ncr_message SELECT r.*;
  RETURN QUERY SELECT r.response_technical_id, r.workflow_id,
    to_char(r.response_sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), r.status::TEXT, r.version;
END $$;

INSERT INTO classifier.classifier_value
  (classifier_value_key, classifier_key, code, name, valid_from, created_by)
SELECT nextval('classifier.seq_classifier_value_key'), c.classifier_key, s.code, s.name,
       CURRENT_DATE, 'ljvis2'
FROM (SELECT DISTINCT ON (classifier_key, code) classifier_key, code FROM classifier.classifier
      WHERE code IN ('NU_MESSAGE_STATUS','NCR_REQUEST_STATUS') ORDER BY classifier_key, code, created_at DESC, id DESC) c
JOIN (VALUES ('NU_MESSAGE_STATUS','sending','Saatmine pooleli'),
             ('NU_MESSAGE_STATUS','send_unknown','Saatmise tulemus teadmata'),
             ('NCR_REQUEST_STATUS','sending','Saatmine pooleli'),
             ('NCR_REQUEST_STATUS','send_unknown','Saatmise tulemus teadmata')) s(clf, code, name)
  ON s.clf = c.code
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier_value v
                  WHERE v.classifier_key = c.classifier_key AND v.code = s.code);
