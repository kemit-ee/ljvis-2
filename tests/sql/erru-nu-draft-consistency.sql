\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.assert(ok BOOLEAN, message TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
DO $$
DECLARE g forms.good_repute_form; r erru.nu_message; x JSONB; h JSONB; k BIGINT; old_source BIGINT;
  p JSONB := '{"nuTo":"DE","originatingAuthority":"EE-PPA","requestSource":"CA","requestPurpose":"Issue","unfitStartDate":"2026-01-01"}';
BEGIN
  INSERT INTO forms.good_repute_form(good_repute_form_key,form_number,status,personal_code,first_name,last_name,date_of_birth,
    certificate_number,certificate_issue_date,certificate_country_code,fitness_status,unfit_from_date,unfit_until_date)
    VALUES(nextval('forms.seq_good_repute_form_key'),'NU-CONSISTENCY','published','TEST','Test','Manager','1980-01-01',
      'CERT','2020-01-01','EE','unfit',current_date-1,current_date+30) RETURNING * INTO g;
  old_source := g.id;
  x := erru.nu_save_draft(NULL,NULL,g.good_repute_form_key,g.id,p,'test'); k := (x->>'id')::BIGINT;
  PERFORM pg_temp.assert(k IS NOT NULL,'create from preview');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,NULL,NULL,NULL,p,'test')->>'code'='version_conflict','save requires expected version');
  x := erru.nu_save_draft(k,1,NULL,NULL,p || '{"nuTo":"FR"}','test');
  PERFORM pg_temp.assert(x->>'version'='2','revision advances version');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,1,NULL,NULL,p,'test')->>'code'='version_conflict','stale save rejected');
  PERFORM pg_temp.assert(erru.nu_begin_send(k,1,'A','B','test','Test')->>'code'='version_conflict','save during NYSIIS rejects stale send');
  PERFORM pg_temp.assert(NOT EXISTS(SELECT 1 FROM erru.nu_exchange_event WHERE nu_message_key=k),'conflicts do not reserve a send');
  -- Source remains eligible, but its protected identity/certificate changed.
  g.id := nextval('forms.good_repute_form_id_seq'); g.created_at := clock_timestamp(); g.certificate_number := 'NEW-CERT';
  INSERT INTO forms.good_repute_form SELECT g.*;
  PERFORM pg_temp.assert(erru.nu_begin_send(k,2,'A','B','test','Test')->>'code'='source_changed','changed certificate rejected');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,2,NULL,NULL,p,'test')->>'code'='source_changed','save cannot silently replace protected data');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,2,NULL,old_source,p,'test')->>'code'='source_changed','stale source preview rejected');
  PERFORM pg_temp.assert(erru.nu_save_draft(NULL,NULL,g.good_repute_form_key,old_source,p,'test')->>'code'='source_changed','stale create preview rejected');
  x := erru.nu_save_draft(k,2,NULL,g.id,p || '{"nuTo":"FR"}','test');
  PERFORM pg_temp.assert(x->>'version'='3','explicit source refresh saved');
  h := erru.nu_begin_send(k,3,'A','B','test','Test');
  PERFORM pg_temp.assert(h->>'nuTo'='FR' AND h->>'certificateNumber'='NEW-CERT','wire payload comes from reserved revision');
  SELECT * INTO r FROM erru.nu_message WHERE nu_message_key=k ORDER BY created_at DESC,id DESC LIMIT 1;
  PERFORM pg_temp.assert(r.version=4 AND r.technical_id::TEXT=h->>'technicalId','reservation is persisted');
  PERFORM pg_temp.assert((SELECT payload FROM erru.nu_exchange_event WHERE nu_message_key=k AND kind='Request')=h,'entire wire body is auditable');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,4,NULL,g.id,p,'test')->>'code'='not_editable','sent cannot reopen historical draft');
  PERFORM erru.nu_finish_send(k,NULL,'connection refused');
  PERFORM pg_temp.assert(erru.nu_save_draft(k,5,NULL,g.id,p,'test')->>'code'='not_editable','error cannot reopen historical draft');
  PERFORM pg_temp.assert(erru.nu_begin_send(k,5,'A','B','test','Test')->>'code'='not_sendable','failed request cannot resend');
  PERFORM pg_temp.assert((SELECT count(*)=count(DISTINCT version) AND max(version)=count(*) FROM erru.nu_message WHERE nu_message_key=k),'versions unique and monotonic');
  BEGIN
    r.id := nextval('erru.nu_message_id_seq'); INSERT INTO erru.nu_message SELECT r.*;
    RAISE EXCEPTION 'Duplicate version was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  -- Eligibility rechecked when reserving: inclusive end date and future start.
  g.id := nextval('forms.good_repute_form_id_seq'); g.created_at := clock_timestamp();
  g.unfit_from_date := current_date+1; g.unfit_until_date := current_date+2;
  INSERT INTO forms.good_repute_form SELECT g.*;
  x := erru.nu_save_draft(NULL,NULL,g.good_repute_form_key,g.id,p,'test'); k := (x->>'id')::BIGINT;
  g.id := nextval('forms.good_repute_form_id_seq'); g.created_at := clock_timestamp(); g.fitness_status := 'fit';
  INSERT INTO forms.good_repute_form SELECT g.*;
  PERFORM pg_temp.assert(erru.nu_begin_send(k,1,'A','B','test','Test')->>'code'='source_not_eligible','latest source eligibility checked at reservation');
END $$;
ROLLBACK;
\echo NU draft consistency checks passed
