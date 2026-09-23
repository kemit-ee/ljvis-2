-- liquibase formatted sql
-- changeset ljvis:20261124140000 ignore:true splitStatements:false
--
-- PR #415 ("korrasta NU väljamineva teate väljad") muutis otse juba
-- rakendunud migratsiooni 20261117121000-erru-nu-exchange.sql sisu
-- (funktsioonide nu_save_draft / nu_begin_send kehad), mis rikkus
-- liquibase checksum valideerimise igas keskkonnas, kus see oli juba
-- käivitunud ("Validation Failed: check sum ... was: X but is now: Y").
--
-- Fail 20261117121000-erru-nu-exchange.sql on taastatud algsele (juba
-- rakendunud) kujule. Käesolev migratsioon toob PR #415 tegeliku sisulise
-- muudatuse CREATE OR REPLACE FUNCTION kaudu — see on turvaliselt
-- korduvkäivitatav ja rakendub täpselt üks kord igal keskkonnal (uus
-- migratsiooni id), sõltumata sellest, kas seal on juba vana või uue
-- kujuga funktsioon.
--
-- Reegel edaspidiseks: ÄRA MUUDA juba rakendunud migratsiooni sisu otse —
-- lisa alati uus migratsioon, nagu siin.

CREATE OR REPLACE FUNCTION erru.nu_save_draft(k BIGINT, expected_version INTEGER, source_key BIGINT,
  expected_source_snapshot BIGINT, p JSONB, actor TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r erru.nu_message; g forms.good_repute_form; v JSONB;
BEGIN
  IF k IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(k);
    -- Select latest across ALL statuses. Historical drafts are immutable.
    SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
    IF r.status IS DISTINCT FROM 'initiated' OR r.direction <> 'outgoing' THEN RETURN '{"code":"not_editable"}'; END IF;
    IF expected_version IS DISTINCT FROM r.version THEN RETURN '{"code":"version_conflict"}'; END IF;
    source_key := r.source_good_repute_form_key;
  END IF;
  SELECT * INTO g FROM forms.good_repute_form WHERE good_repute_form_key=source_key ORDER BY created_at DESC,id DESC LIMIT 1;
  IF g.status IS DISTINCT FROM 'published' OR g.fitness_status IS DISTINCT FROM 'unfit'
    OR g.unfit_until_date IS NULL OR g.unfit_until_date < (clock_timestamp() AT TIME ZONE 'Europe/Tallinn')::DATE
    THEN RETURN '{"code":"source_not_eligible"}'; END IF;
  -- The source search remains as a prefill/eligibility step. The official may
  -- correct the outgoing NU fields according to the signed decision.
  IF expected_source_snapshot IS NOT NULL AND expected_source_snapshot <> g.id
    THEN RETURN '{"code":"source_changed"}'; END IF;
  -- Keep the source values as backwards-compatible defaults for direct callers.
  -- Explicit form values in p win because the right-hand JSONB object overrides.
  p := erru.nu_source_identity(g) || p;
  v := erru.nu_validate(p,'outgoing');
  IF v->>'valid' IS DISTINCT FROM 'true' THEN RETURN v; END IF;
  IF k IS NULL THEN
    r.nu_message_key := nextval('erru.seq_nu_message_key'); r.version := 0;
    r.direction := 'outgoing'; r.status := 'initiated'; r.nu_from := 'EE';
    r.business_case_id := 'NU-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_nu_business_case_no')::text,5,'0');
  END IF;
  r.id := nextval('erru.nu_message_id_seq'); r.version := r.version+1;
  r.created_at := clock_timestamp(); r.created_by := actor;
  r.source_good_repute_form_key := g.good_repute_form_key; r.source_snapshot_id := g.id;
  r.nu_to := COALESCE(NULLIF(p->>'nuTo',''),'ZZ'); r.originating_authority := NULLIF(p->>'originatingAuthority','');
  r.request_source := NULLIF(p->>'requestSource',''); r.request_purpose := NULLIF(p->>'requestPurpose','');
  r.unfit_start_date := NULLIF(p->>'unfitStartDate','')::DATE;
  r.tm_first_name := p->>'tmFirstName'; r.tm_family_name := p->>'tmFamilyName';
  r.tm_date_of_birth := (p->>'tmDateOfBirth')::DATE; r.tm_place_of_birth := p->>'tmPlaceOfBirth';
  r.certificate_number := p->>'certificateNumber'; r.certificate_issue_date := (p->>'certificateIssueDate')::DATE;
  r.certificate_issue_country := p->>'certificateIssueCountry';
  INSERT INTO erru.nu_message SELECT r.*;
  RETURN jsonb_build_object('id',r.nu_message_key,'businessCaseId',r.business_case_id,'version',r.version,'status',r.status);
END $$;

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
