/*
declaration:
  version: 0.1
  description: >-
    AJ usagePeriod: tagastab minimaalse logtime (periodStart) — ajahetk alates
    millest kasutusteabe kirjed on saadaval. Tühi tabel tagastab NULL.
  method: post
  namespace: xroad
  returns: json
  allowlist:
    body: []
  response:
    fields:
      - field: period_start
        type: string
*/
SELECT
    to_char(MIN(logtime) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS period_start
FROM xroad.aj_usage_log;
