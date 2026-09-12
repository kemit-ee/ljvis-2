\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.assert(ok BOOLEAN, message TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
DO $$
DECLARE p JSONB := '{"technicalId":"11111111-2222-4333-8444-555555555555","workflowId":"11111111-2222-4333-8444-555555555556","sentAt":"2026-09-10T12:00:00Z","from":"DE","businessCaseId":"NU-TEST","originatingAuthority":"DE-CA","requestSource":"CA","requestPurpose":"Issue","tmFirstName":"Test","tmFamilyName":"Manager","tmDateOfBirth":"1980-01-01"}';
  q JSONB;
BEGIN
  PERFORM pg_temp.assert(erru.nu_validate(p,'inbound')->>'valid'='true','missing optional start date accepted');
  PERFORM pg_temp.assert(erru.nu_validate(p-'sentAt','inbound')->>'field'='sentAt','sentAt required');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"sentAt":"2026-02-30T12:00:00Z"}','inbound')->>'code'='invalid_date','invalid timestamp');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"sentAt":"1700-01-01T12:00:00Z"}','inbound')->>'code'='invalid_date','timestamp minimum');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"requestSource":"FAKE"}','inbound')->>'field'='requestSource','source enum');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"requestPurpose":"FAKE"}','inbound')->>'field'='requestPurpose','purpose enum');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"unfitStartDate":"2026-02-30"}','inbound')->>'code'='invalid_date','invalid supplied date rejected');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"unfitStartDate":"2028-02-29"}','inbound')->>'valid'='true','leap date accepted');
  PERFORM pg_temp.assert(erru.nu_validate(p || '{"certificateNumber":"ABC"}','inbound')->>'field'='certificateIssueDate','partial second certificate rejected');
  q := p || '{"certificateNumber":"ABC","certificateIssueDate":"2020-01-01","certificateIssueCountry":"EE"}';
  PERFORM pg_temp.assert(erru.nu_validate(q,'inbound')->>'valid'='true','both complete blocks accepted');
  q := q-'tmFirstName'-'tmFamilyName'-'tmDateOfBirth';
  PERFORM pg_temp.assert(erru.nu_validate(q,'inbound')->>'valid'='true','certificate-only accepted');
  PERFORM pg_temp.assert(erru.nu_validate(q || '{"tmFamilyName":"Partial"}','inbound')->>'field'='tmFirstName','partial second name rejected');
  q := p || '{"certificateNumber":"ABC","certificateIssueDate":"2020-01-01","certificateIssueCountry":"EE"}';
  PERFORM pg_temp.assert(erru.nu_validate('{"memberStates":[{"memberStateCode":"DE","respondingAuthority":"DE-CA","statusCode":"OK"}]}','ack')->>'valid'='true','valid ACK');
  PERFORM pg_temp.assert(erru.nu_validate('{"memberStates":[{"memberStateCode":"DE","statusCode":"OK"}]}','ack')->>'code'='invalid_value','ACK missing authority');
  PERFORM pg_temp.assert(erru.nu_validate('{"memberStates":[{"memberStateCode":"DE","respondingAuthority":"DE-CA","statusCode":"WRONG"}]}','ack')->>'code'='invalid_value','ACK enum');
  PERFORM pg_temp.assert(erru.nu_validate('{"memberStates":[{"memberStateCode":12,"respondingAuthority":"DE-CA","statusCode":"OK"}]}','ack')->>'code'='invalid_value','ACK scalar types');
END $$;
DO $$
DECLARE source_key BIGINT := nextval('forms.seq_good_repute_form_key'); source_id BIGINT; k BIGINT := nextval('erru.seq_nu_message_key'); h JSONB; x JSONB; a JSONB; err JSONB; outcome JSONB; n INT;
BEGIN
  INSERT INTO forms.good_repute_form(good_repute_form_key,form_number,status,personal_code,first_name,last_name,date_of_birth,
    certificate_number,certificate_issue_date,certificate_country_code,fitness_status,unfit_from_date,unfit_until_date)
    VALUES(source_key,'NU-TEST','published','NU-TEST','Test','Manager','1980-01-01','CERT','2020-01-01','EE','unfit',current_date-1,current_date+30)
    RETURNING id INTO source_id;
  INSERT INTO erru.nu_message(nu_message_key,version,direction,status,business_case_id,nu_from,nu_to,originating_authority,request_source,request_purpose,tm_first_name,tm_family_name,tm_date_of_birth,unfit_start_date,created_by,source_good_repute_form_key,certificate_number,certificate_issue_date,certificate_issue_country)
    VALUES(k,1,'outgoing','initiated','NU-TEST-SEND','EE','DE','EE-PPA','CA','Issue','Test','Manager','1980-01-01','2026-01-01','test',source_key,'CERT','2020-01-01','EE');
  h := erru.nu_begin_send(k,1,'A','B','test','Test User');
  PERFORM pg_temp.assert(h->>'technicalId' IS NOT NULL AND h->>'sentAt' IS NOT NULL,'header before transport');
  PERFORM pg_temp.assert(EXISTS(SELECT 1 FROM erru.nu_message WHERE nu_message_key=k AND status='sent' AND technical_id::TEXT=h->>'technicalId'),'same persisted header');
  PERFORM pg_temp.assert(erru.nu_begin_send(k,1,'A','B','test','Test User')->>'code'='not_sendable','second send forbidden');
  x := erru.nu_finish_send(k,'[{"memberStateCode":"DE","respondingAuthority":"DE-CA","statusCode":"OK"}]',NULL);
  PERFORM pg_temp.assert(x->>'status'='sent','send completes without adapter callback');
  SELECT count(*) INTO n FROM erru.nu_message WHERE nu_message_key=k;
  PERFORM erru.nu_finish_send(k,'[]',NULL);
  PERFORM pg_temp.assert((SELECT count(*) FROM erru.nu_message WHERE nu_message_key=k)=n,'synchronous result is idempotent');
  PERFORM pg_temp.assert(to_regprocedure('erru.nu_expire_exchanges()') IS NULL,'no automatic timeout function');
  err := jsonb_build_object('technicalId',gen_random_uuid(),'workflowId',h->>'workflowId','businessCaseId','NU-TEST-SEND','from','DE','to','EE','sentAt','2026-09-10T12:00:00Z','statusCode','ServerError','originalMessage',
    '<NotifyUnfitness_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5"><Header technicalId="'||(h->>'technicalId')||'" workflowId="'||(h->>'workflowId')||'" from="EE" to="DE"/><Body businessCaseId="NU-TEST-SEND"/></NotifyUnfitness_Request>');
  outcome := erru.nu_record_exchange_result(err,'ErrorNotification');
  PERFORM pg_temp.assert(outcome->>'outcome'='failure','ErrorNotification correlated');
  SELECT count(*) INTO n FROM erru.nu_message WHERE nu_message_key=k;
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err,'ErrorNotification')->>'duplicate'='true','ErrorNotification replay');
  PERFORM pg_temp.assert((SELECT count(*) FROM erru.nu_message WHERE nu_message_key=k)=n,'no duplicate snapshot');
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err || '{"statusCode":"Timeout"}','ErrorNotification')->>'httpStatus'='409','conflicting duplicate');
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err || jsonb_build_object('technicalId',gen_random_uuid(),'workflowId',gen_random_uuid()),'ErrorNotification')->>'httpStatus'='202','conflicting correlation does not mutate');
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err || jsonb_build_object('technicalId',gen_random_uuid(),'originalMessage','<!DOCTYPE a [<!ENTITY b "x">]><a/>'),'ErrorNotification')->>'httpStatus'='400','DTD rejected');
  PERFORM pg_temp.assert(erru.nu_finish_send(k,'[]',NULL)->>'status'='error','late success cannot restore error');

  k := nextval('erru.seq_nu_message_key');
  INSERT INTO erru.nu_message(nu_message_key,version,direction,status,business_case_id,technical_id,workflow_id,sent_at,received_at,nu_from,nu_to,originating_authority,request_source,request_purpose,tm_first_name,tm_family_name,tm_date_of_birth,unfit_start_date,created_by)
    VALUES(k,2,'incoming','acknowledged','NU-TEST-ACK',gen_random_uuid(),gen_random_uuid(),now(),now(),'DE','EE','DE-CA','CA','Issue','Test','Manager','1980-01-01',current_date,'system');
  a := erru.nu_register_ack(k);
  PERFORM pg_temp.assert(erru.nu_register_ack(k)=a,'ACK identifiers stable on replay');
  PERFORM pg_temp.assert(NOT (a ? 'eventId'),'ACK has no delivery callback identifier');
  err := jsonb_build_object('technicalId',gen_random_uuid(),'workflowId',a->>'workflowId','businessCaseId','NU-TEST-ACK','from','DE','to','EE','sentAt','2026-09-10T12:00:00Z','statusCode','ServerError','originalMessage',
    '<NotifyUnfitness_Acknowledgement xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5"><Header technicalId="'||(a->>'technicalId')||'" workflowId="'||(a->>'workflowId')||'" from="EE" to="DE"/><Body businessCaseId="NU-TEST-ACK"/></NotifyUnfitness_Acknowledgement>');
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err,'ErrorNotification')->>'outcome'='failure','EN correlated with ACK');
  PERFORM pg_temp.assert((SELECT status FROM erru.nu_message WHERE nu_message_key=k ORDER BY id DESC LIMIT 1)='error','ACK-related EN transitions to error');
  PERFORM pg_temp.assert(erru.nu_record_exchange_result(err,'ErrorNotification')->>'duplicate'='true','ACK-related EN replay');
END $$;
ROLLBACK;
\echo NU validation and EN regression checks passed
