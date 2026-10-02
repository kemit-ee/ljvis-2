-- Optional read-only SQL companion. The authoritative hard checks are
-- ./run.sh --verify (nonzero exit on integrity failure or incomplete run).
-- psql -X -v ON_ERROR_STOP=1 -v run_id=<uuid> -f sql/99-verify.sql
SELECT migration_run_id,status,mode,current_step,started_at,finished_at,
       source_label,source_cutoff_from,error_message
FROM migration.run WHERE migration_run_id=:'run_id';

-- One disposition row per source form. No parent/child JOIN multiplication.
SELECT d.form_type,d.reason,count(*) AS source_forms,
       count(*) FILTER (WHERE d.reason='eligible' AND EXISTS (
           SELECT 1 FROM migration.form_link f WHERE f.legacy_source=d.legacy_source
             AND f.legacy_id=d.legacy_id AND f.target_table=d.target_table)) AS linked_forms
FROM migration.disposition d WHERE d.migration_run_id=:'run_id'
GROUP BY d.form_type,d.reason ORDER BY 1,2;

SELECT severity,issue,count(*) AS affected FROM migration.finding
WHERE migration_run_id=:'run_id' GROUP BY 1,2 ORDER BY 1,2;
SELECT target_table,column_name,issue,count(DISTINCT (legacy_source,legacy_id)) AS affected_forms
FROM migration.quality_report WHERE migration_run_id=:'run_id'
GROUP BY 1,2,3 ORDER BY 1,2,3;
SELECT source_table,count(*) AS archived_rows FROM migration.source_snapshot
WHERE migration_run_id=:'run_id' GROUP BY 1 ORDER BY 1;
SELECT legacy_source,legacy_id,legacy_form_code,target_table,target_key,target_form_number
FROM migration.form_link WHERE migration_run_id=:'run_id'
ORDER BY target_table,legacy_source,legacy_id LIMIT 40;
