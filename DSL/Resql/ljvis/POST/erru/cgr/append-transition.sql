/*
description: "Apply a CGR lifecycle state transition (LJVIS2-139). Appends exactly one new snapshot iff (current status, new status, direction) is in the allowed-transition whitelist; otherwise yields zero rows and nothing is written, which the caller maps to 422 invalid_transition. Atomic by construction: the guard is evaluated inside the same INSERT .. SELECT. CGR differs from CTUD in two ways: (1) 'sent' is the outgoing TERMINAL state — responses are stored in member_states JSONB in the same call, so there is no separate 'responded' status; (2) resend adds a new snapshot that also transitions 'sent -> sent' with updated member_states for one member state. NYSIIS search keys are carried forward untouched from the previous snapshot."
namespace: erru
params:
  key:
    type: string
    required: false
  newStatus:
    type: string
    required: false
  memberStates:
    type: string
    required: false
  tmFirstNameSearchKey:
    type: string
    required: false
  tmFamilyNameSearchKey:
    type: string
    required: false
  errorMessage:
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
  - name: workflow_id
    type: string
    nullable: true
*/
WITH latest AS (
  SELECT *
  FROM erru.cgr_request
  WHERE cgr_request_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
), allowed (from_status, to_status, direction) AS (
  VALUES
    -- Outgoing chain: initiated -> sent (first send)
    ('initiated', 'sent',     'outgoing'),
    -- Resend: one member state that did not respond is queried again; the snapshot
    -- is appended with updated member_states. The workflow_id is preserved.
    ('sent',      'sent',     'outgoing'),
    -- Retry after a failed send (transport failure is not a business failure)
    ('error',     'sent',     'outgoing'),
    -- Incoming chain: received -> answered
    ('received',  'answered', 'incoming'),
    -- error is reachable from every state, in both directions
    ('initiated', 'error',    'outgoing'),
    ('sent',      'error',    'outgoing'),
    ('received',  'error',    'incoming'),
    ('answered',  'error',    'incoming')
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
    member_states,
    handler_personal_code,
    handler_name,
    error_message,
    created_by
  )
  SELECT
    l.cgr_request_key,
    l.version + 1,
    l.direction,
    :newStatus,
    l.business_case_id,
    -- technicalId: generate a fresh UUID on each outgoing send (including resend and retry).
    -- For incoming transitions the technicalId is already in the latest snapshot.
    CASE
      WHEN l.direction = 'outgoing' AND :newStatus = 'sent' THEN gen_random_uuid()
      ELSE l.technical_id
    END,
    -- workflowId correlates all sends for this business case; generated once on the first
    -- send and preserved on retries, resends and incoming transitions.
    CASE
      WHEN :newStatus = 'sent' THEN COALESCE(l.workflow_id, gen_random_uuid())
      ELSE l.workflow_id
    END,
    CASE WHEN :newStatus = 'sent' THEN now() ELSE l.sent_at END,
    l.cgr_from,
    l.cgr_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    -- All name/search-key fields are immutable across lifecycle snapshots;
    -- NYSIIS keys may be set for the first time on the initial outgoing 'sent' transition.
    l.tm_first_name,
    l.tm_family_name,
    l.tm_date_of_birth,
    l.tm_place_of_birth,
    COALESCE(NULLIF(:tmFirstNameSearchKey, ''), l.tm_first_name_search_key),
    COALESCE(NULLIF(:tmFamilyNameSearchKey, ''), l.tm_family_name_search_key),
    l.certificate_number,
    l.certificate_issue_date,
    l.certificate_issue_country,
    -- member_states: caller provides the full updated JSONB (broadcast or resend-updated).
    -- If the caller passes empty/null we carry the existing value forward unchanged.
    COALESCE(NULLIF(:memberStates, '')::JSONB, l.member_states),
    l.handler_personal_code,
    l.handler_name,
    -- error_message is meaningful only for the error state; cleared on any recovery
    CASE WHEN :newStatus = 'error' THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction   = l.direction
  )
  RETURNING cgr_request_key, business_case_id, version, status, workflow_id
)
SELECT cgr_request_key AS id, business_case_id, version, status, workflow_id FROM ins;
