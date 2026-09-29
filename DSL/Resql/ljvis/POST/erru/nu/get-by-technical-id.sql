/*
description: "Find an incoming NU for duplicate-delivery acknowledgement."
namespace: erru
params:
  technical_id:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: business_case_id
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: workflow_id
  type: string
  nullable: true
- name: nu_from
  type: string
  nullable: true
- name: request_source
  type: string
  nullable: true
- name: request_purpose
  type: string
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
- name: certificate_number
  type: string
  nullable: true
- name: unfit_start_date
  type: string
  nullable: true
*/
-- nu_from/request_source/.../unfit_start_date let the resume path of inbound-request.yml
-- (resumeExtractExisting) build the same audit entry as the fresh-insert path without a
-- second round-trip.
SELECT
  nu_message_key AS id,
  business_case_id,
  status,
  workflow_id,
  nu_from,
  request_source,
  request_purpose,
  tm_first_name,
  tm_family_name,
  tm_date_of_birth::TEXT,
  certificate_number,
  unfit_start_date::TEXT
FROM erru.nu_message
WHERE technical_id = NULLIF(:technical_id, '')::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC, id DESC
LIMIT 1;
