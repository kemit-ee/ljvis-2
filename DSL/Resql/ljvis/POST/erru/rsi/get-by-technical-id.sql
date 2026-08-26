/*
declaration:
  version: 0.1
  description: "Look up the LATEST snapshot of an INCOMING RSI message by its ERRU technicalId (LJVIS2-148). Used by the inbound-request handler for idempotency: if a redelivered RSI message yields zero rows from append-inbound.sql (ON CONFLICT DO NOTHING), this query is called to retrieve the previously produced response_status_code so the same answer can be replayed. Returns zero rows when no such record exists (the caller maps that to an invalid-data error)."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: technical_id
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: version
        type: number
      - field: status
        type: string
      - field: response_status_code
        type: string
      - field: response_status_message
        type: string
*/
SELECT
  rsi_message_key AS id,
  version,
  status,
  response_status_code,
  response_status_message
FROM erru.rsi_message
WHERE technical_id = :technical_id::UUID
  AND direction = 'incoming'
ORDER BY created_at DESC
LIMIT 1;
