/*
description: 'Look up the LATEST snapshot of an INCOMING RSI message by its ERRU technicalId (LJVIS2-148).
  Used by the inbound-request handler for idempotency: if a redelivered RSI message yields zero rows from
  append-inbound.sql (ON CONFLICT DO NOTHING), this query is called to retrieve the previously produced
  response_status_code so the same answer can be replayed. Returns zero rows when no such record exists
  (the caller maps that to an invalid-data error).'
namespace: erru
params:
  technical_id:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: version
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
- name: response_status_code
  type: string
  nullable: true
- name: response_status_message
  type: string
  nullable: true
- name: vehicle_registration_number
  type: string
  nullable: true
- name: vehicle_registration_country
  type: string
  nullable: true
- name: business_case_id
  type: string
  nullable: true
- name: rsi_from
  type: string
  nullable: true
*/
SELECT
  rsi_message_key AS id,
  version,
  status,
  response_status_code,
  response_status_message, vehicle_registration_number, vehicle_registration_country, business_case_id, rsi_from
FROM erru.rsi_message
WHERE technical_id = :technical_id::UUID
  AND direction = 'incoming'
ORDER BY version DESC
LIMIT 1;
