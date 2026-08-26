/*
description: "Create a new OUTGOING CGR request draft (LJVIS2-138), including a copy-from-existing draft ('Kopeeri päring', LJVIS2-140) — the caller (POST/v1/erru/cgr.yml) pre-fills tmFirstName/tmFamilyName/tmDateOfBirth/tmPlaceOfBirth/certificateNumber/certificateIssueDate/certificateIssueCountry from the source request via GET before calling this same query, there is no separate copy query. Appends the first snapshot of a new erru.cgr_request with status 'initiated'. Allocates both the logical key and the human-readable business_case_id (CGR-EE-AAAA-NNNNN) server-side. cgr_from is hardcoded to EE. An empty cgrTo defaults to the broadcast marker ZZ ('Kõik riigid') per LJVIS2-138 §4. NYSIIS search keys are computed by the caller (TEMPLATES/erru/cgr/nysiis-key.yml) and passed in verbatim — this query never derives them."
namespace: erru
params:
  cgrTo:
    type: string
    required: false
  originatingAuthority:
    type: string
    required: false
  requestSource:
    type: string
    required: false
  requestPurpose:
    type: string
    required: false
  tmFirstName:
    type: string
    required: false
  tmFamilyName:
    type: string
    required: false
  tmDateOfBirth:
    type: string
    required: false
  tmPlaceOfBirth:
    type: string
    required: false
  tmFirstNameSearchKey:
    type: string
    required: false
  tmFamilyNameSearchKey:
    type: string
    required: false
  certificateNumber:
    type: string
    required: false
  certificateIssueDate:
    type: string
    required: false
  certificateIssueCountry:
    type: string
    required: false
  handlerPersonalCode:
    type: string
    required: false
  handlerName:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
*/
WITH ins AS (
  INSERT INTO erru.cgr_request (
    cgr_request_key,
    version,
    direction,
    status,
    business_case_id,
    cgr_from,
    cgr_to,
    originating_authority,
    request_source,
    request_purpose,
    tm_first_name,
    tm_family_name,
    tm_date_of_birth,
    tm_place_of_birth,
    tm_first_name_search_key,
    tm_family_name_search_key,
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    handler_personal_code,
    handler_name,
    created_by
  )
  VALUES (
    nextval('erru.seq_cgr_request_key'),
    1,
    'outgoing',
    'initiated',
    'CGR-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_cgr_business_case_no')::text, 5, '0'),
    'EE',
    COALESCE(NULLIF(:cgrTo, ''), 'ZZ'),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:tmFirstName, ''),
    NULLIF(:tmFamilyName, ''),
    NULLIF(:tmDateOfBirth, '')::DATE,
    NULLIF(:tmPlaceOfBirth, ''),
    NULLIF(:tmFirstNameSearchKey, ''),
    NULLIF(:tmFamilyNameSearchKey, ''),
    NULLIF(:certificateNumber, ''),
    NULLIF(:certificateIssueDate, '')::DATE,
    NULLIF(:certificateIssueCountry, ''),
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  )
  RETURNING cgr_request_key, business_case_id, version, status
)
SELECT cgr_request_key AS id, business_case_id, version, status FROM ins;
