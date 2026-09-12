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
*/
SELECT
  nu_message_key AS id,
  business_case_id,
  status,
  workflow_id
FROM erru.nu_message
WHERE technical_id = NULLIF(:technical_id, '')::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC, id DESC
LIMIT 1;
