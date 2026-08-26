/*
description: "Look up the LATEST snapshot of an INCOMING NCR message by its ERRU technicalId (LJVIS2-64 §4.4). Used by inbound-request.yml for idempotency: if a redelivered NCR message yields zero rows from append-inbound.sql (ON CONFLICT DO NOTHING on uq_ncr_inbound_technical_id), this query retrieves the previously stored ack so the same confirmation can be replayed without creating a duplicate snapshot."
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
*/
SELECT
  ncr_message_key AS id,
  version,
  status,
  business_case_id
FROM erru.ncr_message
WHERE technical_id = :technical_id::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC
LIMIT 1;
