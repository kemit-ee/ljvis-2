-- liquibase formatted sql
-- changeset ljvis:20261117120000 ignore:true splitStatements:false
ALTER TABLE erru.nu_message
  ALTER COLUMN tm_first_name_search_key TYPE VARCHAR(100),
  ALTER COLUMN tm_family_name_search_key TYPE VARCHAR(100);

CREATE FUNCTION erru.nu_validate(p JSONB, kind TEXT) RETURNS JSONB
-- Date/time input casts are STABLE in PostgreSQL.
LANGUAGE plpgsql STABLE AS $$
DECLARE f TEXT; v TEXT; lim INTEGER; d DATE; item JSONB; fields TEXT[];
BEGIN
  IF kind = 'ack' THEN
    IF jsonb_typeof(p->'memberStates') IS DISTINCT FROM 'array' THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field','memberStates','code','required');
    END IF;
    IF jsonb_array_length(p->'memberStates') = 0 THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field','memberStates','code','required');
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p->'memberStates') LOOP
      IF jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR jsonb_typeof(item->'memberStateCode') IS DISTINCT FROM 'string'
        OR jsonb_typeof(item->'respondingAuthority') IS DISTINCT FROM 'string'
        OR jsonb_typeof(item->'statusCode') IS DISTINCT FROM 'string'
        OR (item ? 'statusMessage' AND jsonb_typeof(item->'statusMessage') IS DISTINCT FROM 'string')
        OR length(btrim(COALESCE(item->>'memberStateCode',''))) <> 2
        OR length(btrim(COALESCE(item->>'respondingAuthority',''))) NOT BETWEEN 1 AND 50
        OR COALESCE(item->>'statusCode','') NOT IN ('OK','Timeout','NotAvailable')
        OR length(COALESCE(item->>'statusMessage','')) > 512 THEN
        RETURN jsonb_build_object('type','VALIDATION_ERROR','field','memberStates','code','invalid_value');
      END IF;
    END LOOP;
    RETURN '{"valid":true}'::JSONB;
  END IF;
  fields := ARRAY['originatingAuthority','requestSource','requestPurpose'];
  IF kind = 'inbound' THEN
    fields := fields || ARRAY['technicalId','workflowId','sentAt','from','businessCaseId'];
  ELSE
    fields := fields || ARRAY['unfitStartDate'];
  END IF;
  FOREACH f IN ARRAY fields LOOP
    IF length(btrim(COALESCE(p->>f,''))) = 0 THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','required');
    END IF;
  END LOOP;
  IF COALESCE(p->>'requestSource','') NOT IN ('CA','RSI','Hub','Other') THEN
    RETURN jsonb_build_object('type','VALIDATION_ERROR','field','requestSource','code','invalid_value');
  END IF;
  IF COALESCE(p->>'requestPurpose','') NOT IN ('Issue','Control','Heartbeat','Other') THEN
    RETURN jsonb_build_object('type','VALIDATION_ERROR','field','requestPurpose','code','invalid_value');
  END IF;
  FOREACH f IN ARRAY ARRAY['technicalId','workflowId'] LOOP
    IF kind = 'inbound' AND COALESCE(p->>f,'') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','invalid_value');
    END IF;
  END LOOP;
  IF kind = 'inbound' THEN
    BEGIN
      v := p->>'sentAt';
      IF v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'
        OR v::TIMESTAMPTZ < '1753-01-01T00:00:00Z'::TIMESTAMPTZ
        OR to_char(v::TIMESTAMPTZ AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') <> v THEN
        RETURN jsonb_build_object('type','VALIDATION_ERROR','field','sentAt','code','invalid_date');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field','sentAt','code','invalid_date');
    END;
  END IF;
  FOREACH f IN ARRAY ARRAY['nuTo','from','certificateIssueCountry'] LOOP
    v := btrim(COALESCE(p->>f,''));
    IF v <> '' AND length(v) <> 2 THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','invalid_country_code');
    END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['originatingAuthority','businessCaseId','tmFirstName','tmFamilyName','tmPlaceOfBirth','tmFirstNameSearchKey','tmFamilyNameSearchKey','certificateNumber'] LOOP
    lim := CASE f WHEN 'originatingAuthority' THEN 50 WHEN 'businessCaseId' THEN 36 WHEN 'tmPlaceOfBirth' THEN 50 WHEN 'certificateNumber' THEN 20 ELSE 100 END;
    IF length(COALESCE(p->>f,'')) > lim THEN
      RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code',CASE WHEN f LIKE 'tm%' OR f = 'certificateNumber' THEN 'source_exceeds_erru_limit' ELSE 'max_length_exceeded' END);
    END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['tmDateOfBirth','certificateIssueDate','unfitStartDate'] LOOP
    v := p->>f;
    IF COALESCE(v,'') <> '' THEN
      BEGIN
        d := v::DATE;
        IF v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR to_char(d,'YYYY-MM-DD') <> v THEN
          RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','invalid_date');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','invalid_date');
      END;
    END IF;
  END LOOP;
  IF kind = 'inbound' AND p->>'requestPurpose' = 'Heartbeat' THEN RETURN '{"valid":true}'::JSONB; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['tmFirstName','tmFamilyName','tmDateOfBirth','tmPlaceOfBirth','tmFirstNameSearchKey','tmFamilyNameSearchKey']) x WHERE btrim(COALESCE(p->>x,'')) <> '') THEN
    FOREACH f IN ARRAY ARRAY['tmFirstName','tmFamilyName','tmDateOfBirth'] LOOP
      IF btrim(COALESCE(p->>f,'')) = '' THEN RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','required'); END IF;
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['certificateNumber','certificateIssueDate','certificateIssueCountry']) x WHERE btrim(COALESCE(p->>x,'')) <> '') THEN
    FOREACH f IN ARRAY ARRAY['certificateNumber','certificateIssueDate','certificateIssueCountry'] LOOP
      IF btrim(COALESCE(p->>f,'')) = '' THEN RETURN jsonb_build_object('type','VALIDATION_ERROR','field',f,'code','required'); END IF;
    END LOOP;
  END IF;
  IF btrim(COALESCE(p->>'tmFirstName','')) = '' AND btrim(COALESCE(p->>'certificateNumber','')) = '' THEN
    RETURN jsonb_build_object('type','VALIDATION_ERROR','field','tmFirstName','code','required');
  END IF;
  RETURN '{"valid":true}'::JSONB;
END $$;

ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_complete_blocks CHECK (
  (num_nonnulls(tm_first_name,tm_family_name,tm_date_of_birth,tm_place_of_birth,tm_first_name_search_key,tm_family_name_search_key)=0 OR num_nonnulls(tm_first_name,tm_family_name,tm_date_of_birth)=3)
  AND num_nonnulls(certificate_number,certificate_issue_date,certificate_issue_country) IN (0,3)
  AND (tm_first_name IS NOT NULL OR certificate_number IS NOT NULL)
  AND length(tm_place_of_birth) <= 50 AND length(certificate_number) <= 20
  AND request_source IN ('CA','RSI','Hub','Other') AND request_purpose IN ('Issue','Control','Heartbeat','Other')
  AND (direction <> 'incoming' OR (sent_at IS NOT NULL AND technical_id IS NOT NULL AND workflow_id IS NOT NULL))
) NOT VALID;

ALTER TABLE erru.nu_message ADD CONSTRAINT chk_nu_required_fields CHECK (
  originating_authority IS NOT NULL AND btrim(originating_authority) <> ''
  AND request_source IS NOT NULL AND request_purpose IS NOT NULL
  AND (tm_first_name IS NULL OR (btrim(tm_first_name) <> '' AND btrim(tm_family_name) <> ''))
  AND (certificate_number IS NULL OR (btrim(certificate_number) <> '' AND length(btrim(certificate_issue_country)) = 2))
  AND (direction <> 'incoming' OR sent_at >= '1753-01-01T00:00:00Z'::TIMESTAMPTZ)
) NOT VALID;
