/*
description: 'AJ findUsage: pärib kasutusteabe kirjeid isikukoodi järgi koos pagination-i ja ajavahemiku
  filtritega. Tagastab read logtime DESC järjekorras. total_usages on koguhulk (ilma offset/limit mõjuta).'
namespace: xroad
params:
  user_code:
    type: string
    required: false
  period_start:
    type: string
    required: false
  period_end:
    type: string
    required: false
  offset:
    type: integer
    required: false
  limit:
    type: integer
    required: false
returns:
- name: total_usages
  type: number
  nullable: true
- name: logtime
  type: string
  nullable: true
- name: action
  type: string
  nullable: true
- name: receiver_code
  type: string
  nullable: true
- name: receiver_name
  type: string
  nullable: true
- name: receiver_system
  type: string
  nullable: true
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
