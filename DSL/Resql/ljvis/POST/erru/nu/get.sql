/*
description: "Read the latest NU snapshot by message key."
namespace: erru
params:
  id:
    type: integer
    required: false
    description: NU message logical key (nu_message_key)
returns:
- name: snapshot_id
  type: number
  nullable: false
- name: id
  type: number
  nullable: true
- name: version
  type: number
  nullable: true
- name: direction
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: business_case_id
  type: string
  nullable: true
- name: technical_id
  type: string
  nullable: true
- name: workflow_id
  type: string
  nullable: true
- name: sent_at
  type: string
  nullable: true
- name: received_at
  type: string
  nullable: true
- name: nu_from
  type: string
  nullable: true
- name: nu_to
  type: string
  nullable: true
- name: originating_authority
  type: string
  nullable: true
- name: request_source
  type: string
  nullable: true
- name: request_purpose
  type: string
  nullable: true
- name: source_snapshot_id
  type: number
  nullable: true
- name: source_good_repute_form_key
  type: number
  nullable: true
- name: tm_first_name
  type: string
  nullable: true
- name: tm_family_name
  type: string
  nullable: true
- name: tm_date_of_birth
  type: string
  nullable: true
- name: tm_place_of_birth
  type: string
  nullable: true
- name: tm_first_name_search_key
  type: string
  nullable: true
- name: tm_family_name_search_key
  type: string
  nullable: true
- name: certificate_number
  type: string
  nullable: true
- name: certificate_issue_date
  type: string
  nullable: true
- name: certificate_issue_country
  type: string
  nullable: true
- name: unfit_start_date
  type: string
  nullable: true
- name: member_states
  type: string
  nullable: true
- name: handler_personal_code
  type: string
  nullable: true
- name: handler_name
  type: string
  nullable: true
- name: error_message
  type: string
  nullable: true
- name: created_at
  type: string
  nullable: true
- name: created_by
  type: string
  nullable: true
*/
SELECT
  nu_message_key AS id,
  id AS snapshot_id,
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
  source_snapshot_id,
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
  member_states::text,
  handler_personal_code,
  handler_name,
  error_message,
  created_at,
  created_by
FROM erru.nu_message
WHERE nu_message_key = :id::BIGINT
ORDER BY created_at DESC, snapshot_id DESC
LIMIT 1;
