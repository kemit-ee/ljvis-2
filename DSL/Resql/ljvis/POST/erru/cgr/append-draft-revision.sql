/*
description: "Revise an OUTGOING CGR request draft (LJVIS2-138, 'täiendamine'). Appends a new snapshot with version + 1, keeping status 'initiated'. Guarded: the INSERT .. SELECT produces zero rows unless the latest snapshot is status='initiated' AND direction='outgoing', so a sent request or an inbound request can never be edited — the caller detects the empty result and returns 422. Editable fields are fully replaced from the request body; identity and envelope fields (business_case_id, cgr_from, technical_id, workflow_id, sent_at, member_states) are carried forward untouched. An empty cgrTo defaults to the broadcast marker ZZ, same as append-draft.sql."
namespace: erru
params:
  key:
    type: number
    required: false
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
WITH latest AS (
  SELECT *
  FROM erru.cgr_request
  WHERE cgr_request_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
), ins AS (
  INSERT INTO erru.cgr_request (
    cgr_request_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
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
  SELECT
    l.cgr_request_key,
    l.version + 1,
    l.direction,
    'initiated',
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.cgr_from,
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
  FROM latest l
  WHERE l.status = 'initiated'
    AND l.direction = 'outgoing'
  RETURNING cgr_request_key, business_case_id, version, status
)
SELECT cgr_request_key AS id, business_case_id, version, status FROM ins;
