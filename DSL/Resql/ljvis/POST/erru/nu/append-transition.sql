/*
description: "Append an allowed status transition; sent and error messages cannot be resent."
namespace: erru
params:
  key:
    type: integer
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
  handlerPersonalCode:
    type: string
    required: false
  handlerName:
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
  FROM erru.nu_message
  WHERE nu_message_key = :key::BIGINT
  ORDER BY created_at DESC, id DESC
  LIMIT 1
), allowed (from_status, to_status, direction) AS (
  VALUES
    ('initiated', 'sent',    'outgoing'),
    ('initiated', 'error',   'outgoing'),
    ('sent',      'error',   'outgoing'),
    ('received',  'error',   'incoming')
), ins AS (
  INSERT INTO erru.nu_message (
    nu_message_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
    received_at,
    nu_from,
    nu_to,
    originating_authority,
    request_source,
    request_purpose,
    source_good_repute_form_key,
    tm_first_name,
    tm_family_name,
    tm_date_of_birth,
    tm_place_of_birth,
    tm_first_name_search_key,
    tm_family_name_search_key,
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    unfit_start_date,
    member_states,
    handler_personal_code,
    handler_name,
    error_message,
    created_by
  )
  SELECT
    l.nu_message_key,
    l.version + 1,
    l.direction,
    :newStatus,
    l.business_case_id,
    CASE WHEN l.direction = 'outgoing' AND :newStatus = 'sent' THEN gen_random_uuid() ELSE l.technical_id END,
    CASE WHEN :newStatus = 'sent' THEN COALESCE(l.workflow_id, gen_random_uuid()) ELSE l.workflow_id END,
    CASE WHEN :newStatus = 'sent' THEN now() ELSE l.sent_at END,
    l.received_at,
    l.nu_from,
    l.nu_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    l.source_good_repute_form_key,
    l.tm_first_name,
    l.tm_family_name,
    l.tm_date_of_birth,
    l.tm_place_of_birth,
    COALESCE(NULLIF(:tmFirstNameSearchKey, ''), l.tm_first_name_search_key),
    COALESCE(NULLIF(:tmFamilyNameSearchKey, ''), l.tm_family_name_search_key),
    l.certificate_number,
    l.certificate_issue_date,
    l.certificate_issue_country,
    l.unfit_start_date,
    COALESCE(NULLIF(:memberStates, '')::JSONB, l.member_states),
    COALESCE(NULLIF(:handlerPersonalCode, ''), l.handler_personal_code),
    COALESCE(NULLIF(:handlerName, ''), l.handler_name),
    CASE WHEN :newStatus = 'error' THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction    = l.direction
  )
  RETURNING nu_message_key, business_case_id, version, status, workflow_id
)
SELECT nu_message_key AS id, business_case_id, version, status, workflow_id FROM ins;
