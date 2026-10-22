-- liquibase formatted sql
-- changeset ljvis:20261224100000 ignore:true splitStatements:false
-- Ühekordne parandus: saabunud NCR teated (nt MOVEHUB testandmed), millel puudub technical_id või
-- workflow_id. Ilma workflow_id-ta ei saa erru.ncr_begin_response vastust reserveerida ja
-- "Saada vastus" tagastab 422. Kõik ühe juhtumi snapshotid saavad sama väärtuse. Päris Hubist
-- saabunud teadetel on mõlemad väljad alati olemas, neid see ei muuda.
WITH ids AS (
  SELECT c.business_case_id,
         COALESCE((SELECT m.workflow_id FROM erru.ncr_message m
                   WHERE m.business_case_id = c.business_case_id AND m.direction = 'incoming' AND m.workflow_id IS NOT NULL LIMIT 1),
                  gen_random_uuid()) AS wf,
         COALESCE((SELECT m.technical_id FROM erru.ncr_message m
                   WHERE m.business_case_id = c.business_case_id AND m.direction = 'incoming' AND m.technical_id IS NOT NULL LIMIT 1),
                  gen_random_uuid()) AS tech
  FROM (SELECT DISTINCT business_case_id FROM erru.ncr_message
        WHERE direction = 'incoming' AND (workflow_id IS NULL OR technical_id IS NULL)) c
)
UPDATE erru.ncr_message m
SET workflow_id = COALESCE(m.workflow_id, ids.wf),
    technical_id = COALESCE(m.technical_id, ids.tech)
FROM ids
WHERE m.business_case_id = ids.business_case_id
  AND m.direction = 'incoming'
  AND (m.workflow_id IS NULL OR m.technical_id IS NULL);
