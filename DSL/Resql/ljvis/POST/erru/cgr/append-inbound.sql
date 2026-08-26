/*
description: "Record an INCOMING CGR request arriving from another member state (LJVIS2-139). Appends the first snapshot with status 'received' and a fresh logical key. Idempotent: ON CONFLICT on the partial unique index uq_cgr_inbound_technical_id (direction='incoming' AND status='received') means a redelivered CGR message yields zero rows instead of a duplicate, so the caller can detect the replay and return the previously produced response. Heartbeat requests (requestPurpose = 'Heartbeat') are NOT stored — the caller must filter them before calling this query. cgr_from and cgr_to are set from the envelope: cgr_from is the sending country, cgr_to is always EE (us). The 7A/7B search-choice CHECK constraint (chk_cgr_search_choice) is enforced by the table; an inbound request that violates it will cause the INSERT to fail with a constraint error that the caller maps to 422."
namespace: erru
params:
  technicalId:
    type: string
    required: false
  workflowId:
    type: string
    required: false
  sentAt:
    type: string
    required: false
  cgrFrom:
    type: string
    required: false
  businessCaseId:
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
  certificateNumber:
    type: string
    required: false
  certificateIssueDate:
    type: string
    required: false
  certificateIssueCountry:
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
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    created_by
  )
  VALUES (
    nextval('erru.seq_cgr_request_key'),
    1,
    'incoming',
    'received',
    :businessCaseId,
    NULLIF(:technicalId, '')::UUID,
    NULLIF(:workflowId, '')::UUID,
    NULLIF(:sentAt, '')::TIMESTAMPTZ,
    NULLIF(:cgrFrom, ''),
    'EE',
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:tmFirstName, ''),
    NULLIF(:tmFamilyName, ''),
    NULLIF(:tmDateOfBirth, '')::DATE,
    NULLIF(:tmPlaceOfBirth, ''),
    NULLIF(:certificateNumber, ''),
    NULLIF(:certificateIssueDate, '')::DATE,
    NULLIF(:certificateIssueCountry, ''),
    :created_by
  )
  ON CONFLICT (technical_id) WHERE (direction = 'incoming' AND status = 'received')
  DO NOTHING
  RETURNING cgr_request_key, business_case_id, version, status
)
SELECT cgr_request_key AS id, business_case_id, version, status FROM ins;
