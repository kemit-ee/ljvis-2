/*
description: 'AJ usagePeriod: tagastab minimaalse logtime (periodStart) — ajahetk alates millest kasutusteabe
  kirjed on saadaval. periodStart on AJ protokollis kohustuslik (§6.2.4), seega tühja tabeli korral
  tagastatakse praegune ajahetk.'
namespace: xroad
params: {}
returns:
- name: period_start
  type: string
  nullable: true
*/
SELECT
    to_char(COALESCE(MIN(logtime), now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS period_start
FROM xroad.aj_usage_log;
