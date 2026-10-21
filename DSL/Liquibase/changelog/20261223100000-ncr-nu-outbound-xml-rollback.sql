-- liquibase formatted sql
-- changeset ljvis:20261223100000-rollback ignore:true splitStatements:false
-- Refuse rollback while the new lifecycle states or transport history exist. Keep classifier history.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM erru.nu_message WHERE status IN ('sending','send_unknown'))
 OR EXISTS (SELECT 1 FROM erru.ncr_message WHERE status IN ('sending','send_unknown') OR response_technical_id IS NOT NULL)
 OR EXISTS (SELECT 1 FROM erru.xml_outbound_dispatch WHERE message_type IN ('NCR','NCR_RESPONSE','NU')) THEN
  RAISE EXCEPTION 'NCR/NU send history requires the outbound XML lifecycle migration';
 END IF;
END $$;
DROP FUNCTION IF EXISTS erru.ncr_begin_response(TEXT, TEXT);
DROP FUNCTION IF EXISTS erru.ncr_begin_send(TEXT, TEXT);
DROP INDEX IF EXISTS erru.idx_ncr_outgoing_workflow;
ALTER TABLE erru.ncr_message DROP COLUMN IF EXISTS response_technical_id, DROP COLUMN IF EXISTS response_sent_at;
ALTER TABLE erru.ncr_message DROP CONSTRAINT IF EXISTS chk_ncr_status;
ALTER TABLE erru.ncr_message ADD CONSTRAINT chk_ncr_status CHECK
 (status IN ('initiated','sent','acknowledged','responded','received','viewed','answer_drafted','forwarded','answered','error'));
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
    IF r.status IN ('sent','received','acknowledged') THEN
      r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.status := 'error';
      r.created_at := clock_timestamp(); r.created_by := 'system'; r.error_message := event_kind || ': ' || code;
      INSERT INTO erru.nu_message SELECT r.*;
    ELSIF r.status <> 'error' THEN result := 'transition_not_allowed'; END IF;
  END IF;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome,parent_id)
    VALUES(e.nu_message_key,event_kind,event_uuid,workflow,COALESCE(e.business_case_id,p->>'businessCaseId'),peer,'EE',p,result,e.id) RETURNING id INTO event_key;
  RETURN jsonb_build_object('httpStatus',CASE WHEN e.id IS NULL THEN 202 ELSE 200 END,'outcome',result,'eventId',event_key::TEXT);
END $$;
DROP FUNCTION IF EXISTS erru.nu_apply_ack(UUID, UUID, TEXT, JSONB);
CREATE OR REPLACE FUNCTION erru.nu_finish_send(k BIGINT, members JSONB, failure TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r erru.nu_message; e erru.nu_exchange_event;
BEGIN
  PERFORM pg_advisory_xact_lock(k);
  SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
  SELECT * INTO e FROM erru.nu_exchange_event WHERE nu_message_key=k AND kind='Request' ORDER BY id DESC LIMIT 1;
  IF e.id IS NULL THEN RETURN '{"code":"not_sendable"}'; END IF;
  IF EXISTS (SELECT 1 FROM erru.nu_exchange_event WHERE parent_id=e.id AND kind='SendResult') THEN
    RETURN jsonb_build_object('id',k,'status',r.status);
  END IF;
  INSERT INTO erru.nu_exchange_event(nu_message_key,kind,technical_id,workflow_id,business_case_id,source,destination,payload,outcome,parent_id)
    VALUES(k,'SendResult',gen_random_uuid(),e.workflow_id,e.business_case_id,'EE',e.destination,
      jsonb_build_object('memberStates',members,'error',failure),CASE WHEN failure IS NULL THEN 'success' ELSE 'failure' END,e.id);
  IF r.status = 'sent' THEN
    r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.created_at := clock_timestamp();
    r.status := CASE WHEN failure IS NULL THEN 'sent' ELSE 'error' END;
    r.error_message := failure; r.member_states := members;
    INSERT INTO erru.nu_message SELECT r.*;
  END IF;
  RETURN jsonb_build_object('id',k,'status',r.status);
END $$;

DROP FUNCTION IF EXISTS erru.nu_mark_dispatch(BIGINT, TEXT, TEXT);
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
  r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1; r.status := 'sent';
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
ALTER TABLE erru.nu_message DROP CONSTRAINT IF EXISTS chk_nu_status;
ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_status CHECK
 (status IN ('initiated','sent','received','acknowledged','error'));
ALTER TABLE erru.nu_message DROP CONSTRAINT IF EXISTS chk_nu_status_matches_direction;
ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_status_matches_direction CHECK
 (status = 'error' OR (direction = 'outgoing' AND status IN ('initiated','sent'))
  OR (direction = 'incoming' AND status IN ('received','acknowledged')));
ALTER TABLE erru.xml_outbound_dispatch DROP CONSTRAINT IF EXISTS xml_outbound_dispatch_message_type_check;
ALTER TABLE erru.xml_outbound_dispatch ADD CONSTRAINT xml_outbound_dispatch_message_type_check
 CHECK (message_type IN ('CGR','CTUD'));
