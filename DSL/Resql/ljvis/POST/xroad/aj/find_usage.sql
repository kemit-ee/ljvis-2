/*
declaration:
  version: 0.1
  description: >-
    AJ findUsage: pärib kasutusteabe kirjeid isikukoodi järgi koos pagination-i
    ja ajavahemiku filtritega. Tagastab read logtime DESC järjekorras.
    total_usages on koguhulk (ilma offset/limit mõjuta).
  method: post
  namespace: xroad
  returns: json
  allowlist:
    body:
      - field: user_code
        type: string
      - field: period_start
        type: string
      - field: period_end
        type: string
      - field: offset
        type: integer
      - field: limit
        type: integer
  response:
    fields:
      - field: total_usages
        type: number
      - field: logtime
        type: string
      - field: action
        type: string
      - field: receiver_code
        type: string
      - field: receiver_name
        type: string
      - field: receiver_system
        type: string
*/
SELECT
    COUNT(*) OVER ()                                                         AS total_usages,
    to_char(logtime AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')      AS logtime,
    action,
    receiver_code,
    COALESCE(receiver_name,   '')                                            AS receiver_name,
    COALESCE(receiver_system, '')                                            AS receiver_system
FROM xroad.aj_usage_log
WHERE user_code = :user_code
  AND (:period_start IS NULL OR :period_start = '' OR logtime >= :period_start::TIMESTAMPTZ)
  AND (:period_end   IS NULL OR :period_end   = '' OR logtime <= :period_end::TIMESTAMPTZ)
ORDER BY logtime DESC
OFFSET COALESCE(:offset::INTEGER, 0)
LIMIT  LEAST(COALESCE(:limit::INTEGER, 1000), 1000);
