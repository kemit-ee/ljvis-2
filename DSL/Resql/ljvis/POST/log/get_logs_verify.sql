/*
declaration:
  version: 0.1
  description: "Walk the audit-log hash chain and verify integrity. Returns ok=true if every row's prev_row_hash matches the previous row's row_hash; ok=false with the first breach location otherwise."
  method: post
  namespace: log
  returns: json
  allowlist:
    body:
      - field: from_event_id
        type: string
        description: "Start event_id (inclusive). Empty or null = walk from the genesis row."
      - field: to_event_id
        type: string
        description: "End event_id (inclusive). Empty or null = walk to the current tail."
  response:
    fields:
      - field: ok
        type: boolean
      - field: checked
        type: number
      - field: first_breach_event_id
        type: string
      - field: reason
        type: string
      - field: from_event_id
        type: string
      - field: to_event_id
        type: string
*/
WITH window AS (
    SELECT
        event_id,
        prev_row_hash,
        row_hash,
        LAG(row_hash) OVER (ORDER BY event_id) AS expected_prev_hash
    FROM audit.audit_event
    WHERE
        (NULLIF(:from_event_id, '') IS NULL OR event_id >= :from_event_id)
        AND (NULLIF(:to_event_id,   '') IS NULL OR event_id <= :to_event_id)
),
breach AS (
    SELECT event_id, 'prev_row_hash_mismatch' AS reason
    FROM window
    WHERE expected_prev_hash IS NOT NULL
      AND prev_row_hash <> expected_prev_hash
    ORDER BY event_id
    LIMIT 1
),
bounds AS (
    SELECT
        MIN(event_id) AS first_event_id,
        MAX(event_id) AS last_event_id,
        COUNT(*)      AS total_checked
    FROM window
)
SELECT
    (NOT EXISTS (SELECT 1 FROM breach))                     AS ok,
    bounds.total_checked::INTEGER                           AS checked,
    breach.event_id                                         AS first_breach_event_id,
    breach.reason,
    bounds.first_event_id                                   AS from_event_id,
    bounds.last_event_id                                    AS to_event_id
FROM bounds
LEFT JOIN breach ON true;
