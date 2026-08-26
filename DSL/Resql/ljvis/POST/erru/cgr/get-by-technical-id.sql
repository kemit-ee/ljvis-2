/*
description: "Look up the LATEST snapshot of an INCOMING CGR request by its ERRU technicalId (LJVIS2-139). Used by the inbound handler for idempotency: if a redelivered message yields zero rows from append-inbound.sql (ON CONFLICT DO NOTHING), this query is called to retrieve the previously produced answer so it can be replayed instead of re-serving the request. Returns zero rows when no such record exists (caller maps to 422)."
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
  - name: member_states
    type: string
    nullable: true
*/
SELECT
  cgr_request_key AS id,
  version,
  status,
  member_states::text
FROM erru.cgr_request
WHERE technical_id = :technical_id::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC
LIMIT 1;
