/*
description: 'Värskendab kõik tableau skeemi materialiseeritud vaated (ADR-009). Kutsub öine cron
  cron/tableau-matview-refresh.yml (CronManager 02:00 Europe/Tallinn).'
namespace: tableau
params: {}
returns:
- name: refreshed
  type: number
  nullable: true
*/
WITH did AS (
  SELECT tableau.refresh_all()
)
SELECT (SELECT count(*) FROM pg_matviews WHERE schemaname = 'tableau') AS refreshed
FROM did;
