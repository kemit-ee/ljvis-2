/*
description: 'AJ usagePeriod: tagastab minimaalse logtime (periodStart) — ajahetk alates millest kasutusteabe
  kirjed on saadaval. Tühi tabel tagastab NULL.'
namespace: xroad
params: {}
returns:
- name: period_start
  type: string
  nullable: true
*/
SELECT
    to_char(MIN(logtime) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS period_start
FROM xroad.aj_usage_log;
