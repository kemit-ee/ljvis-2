/*
declaration:
  version: 0.1
  description: "Record an INCOMING CGR request arriving from another member state (LJVIS2-139). Appends the first snapshot with status 'received' and a fresh logical key. Idempotent: ON CONFLICT on the partial unique index uq_cgr_inbound_technical_id (direction='incoming' AND status='received') means a redelivered CGR message yields zero rows instead of a duplicate, so the caller can detect the replay and return the previously produced response. Heartbeat requests (requestPurpose = 'Heartbeat') are NOT stored — the caller must filter them before calling this query. cgr_from and cgr_to are set from the envelope: cgr_from is the sending country, cgr_to is always EE (us). The 7A/7B search-choice CHECK constraint (chk_cgr_search_choice) is enforced by the table; an inbound request that violates it will cause the INSERT to fail with a constraint error that the caller maps to 422."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: technicalId
        type: string
      - field: workflowId
        type: string
      - field: sentAt
        type: string
      - field: cgrFrom
        type: string
      - field: businessCaseId
        type: string
      - field: originatingAuthority
        type: string
      - field: requestSource
        type: string
      - field: requestPurpose
        type: string
      - field: tmFirstName
        type: string
      - field: tmFamilyName
        type: string
      - field: tmDateOfBirth
        type: string
      - field: tmPlaceOfBirth
        type: string
      - field: certificateNumber
        type: string
      - field: certificateIssueDate
        type: string
      - field: certificateIssueCountry
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: business_case_id
        type: string
      - field: version
        type: number
      - field: status
        type: string
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
