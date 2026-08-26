/*
description: "Read the latest snapshot of an INBOUND CTUD request identified by its ERRU technical_id (LJVIS2-144). Used only on the idempotency path: when a member state redelivers a message, append-inbound.sql skips the insert and the handler uses this query to return the answer it produced the first time, instead of serving the request twice. Scoped to direction='incoming' because technical_id is only unique for inbound received rows."
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
  - name: business_case_id
    type: string
    nullable: true
  - name: responding_authority
    type: string
    nullable: true
  - name: response_status_code
    type: string
    nullable: true
  - name: response_status_message
    type: string
    nullable: true
  - name: response_content
    type: string
    nullable: true
*/
SELECT
  ctud_request_key AS id,
  version,
  status,
  business_case_id,
  responding_authority,
  response_status_code,
  response_status_message,
  response_content::text
FROM erru.ctud_request
WHERE technical_id = NULLIF(:technical_id, '')::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC
LIMIT 1;
