/*
description: 'AJ findUsage: pärib kasutusteabe kirjeid isikukoodi järgi koos pagination-i ja ajavahemiku
  filtritega. Tagastab alati vähemalt ühe rea: total_usages on koguhulk (ilma offset/limit mõjuta,
  AJ protokoll §6.1.4) ka siis, kui leht on tühi — sel juhul on logtime NULL. Kirjed logtime DESC
  järjekorras (§6.1.4), id DESC lisajärjestusena stabiilse lehitsemise jaoks (§7). user_code tuleb
  anda ilma EE eesliiteta; ajaloolised EE-eesliitega kirjed leitakse samuti.'
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
WITH filtered AS (
    SELECT id, logtime, action, receiver_code, receiver_name, receiver_system
    FROM xroad.aj_usage_log
    WHERE user_code IN (:user_code, 'EE' || :user_code)
      AND logtime >= COALESCE(NULLIF(:period_start, '')::TIMESTAMPTZ, '-infinity')
      AND logtime <= COALESCE(NULLIF(:period_end,   '')::TIMESTAMPTZ, 'infinity')
),
page AS (
    SELECT *
    FROM filtered
    ORDER BY logtime DESC, id DESC
    OFFSET COALESCE(:offset::INTEGER, 0)
    LIMIT  COALESCE(:limit::INTEGER, 1000)
)
SELECT
    (SELECT COUNT(*) FROM filtered)                                          AS total_usages,
    to_char(page.logtime AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')  AS logtime,
    page.action,
    page.receiver_code,
    page.receiver_name,
    page.receiver_system
FROM (SELECT 1) AS always_one_row
LEFT JOIN page ON TRUE
ORDER BY page.logtime DESC NULLS LAST, page.id DESC;
