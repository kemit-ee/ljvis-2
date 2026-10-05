-- RavenDB V1/V2 -> labour_inspection_form. Executed in the runner transaction.
-- Scope uses the actual inspection date; last-modified is NEVER creation time.
-- V1 has no stage and is treated as a final received act. V2 Saved/Deleted are
-- excluded. Unsupported inspection types are blockers in the preflight report.

CREATE TEMP TABLE tmp_lif_src ON COMMIT DROP AS
SELECT
    j.raven_id, j.schema_version, j.document_json, j.last_modified_at,
    (migration.raven_scope_timestamp(CASE j.schema_version WHEN 1 THEN j.document_json->>'kontrolli_kp' ELSE j.document_json->>'InspectionDate' END) AT TIME ZONE 'Europe/Tallinn') AS created_at
FROM staging.raw_job_inspection j
WHERE NOT EXISTS (
    SELECT 1 FROM migration.form_link fl
    WHERE fl.legacy_source = CASE j.schema_version WHEN 1 THEN 'RavenDB.JobInspection'
                                                     ELSE 'RavenDB.JobInspectionV2' END
      AND fl.legacy_id = j.raven_id
)
AND migration.raven_scope_timestamp(CASE j.schema_version WHEN 1 THEN j.document_json->>'kontrolli_kp' ELSE j.document_json->>'InspectionDate' END) >= :'cutoff_from'::timestamp
AND (j.schema_version = 1 OR j.document_json->>'Stage' IN ('Confirmed','Published'));

CREATE TEMP TABLE tmp_lif_final ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_labour_inspection_form_key') AS target_key,
    'confirmed'::text AS status, -- V2 final stages only; V1 received final act
    CASE s.schema_version
         WHEN 2 THEN nullif(btrim(s.document_json->>'Inspector'), '')
         ELSE nullif(btrim(s.document_json->>'kontrollija'), '')
    END AS inspector_name_raw,
    CASE s.schema_version
         WHEN 2 THEN migration.raven_scope_timestamp(s.document_json->>'InspectionDate')
         ELSE migration.raven_scope_timestamp(s.document_json->>'kontrolli_kp')
    END AS inspection_date_raw,
    CASE s.schema_version
         WHEN 2 THEN nullif(btrim(s.document_json->>'InspectionId'), '')
         ELSE coalesce(nullif(btrim(s.document_json->>'Id'), ''), s.raven_id)
    END AS external_inspection_id,
    CASE s.schema_version
         WHEN 2 THEN CASE lower(coalesce(s.document_json->>'InspectionType', ''))
                          WHEN 'v' THEN 'cargo'
                          WHEN 's' THEN 'passenger'
                          WHEN 'cargo' THEN 'cargo'
                          ELSE 'passenger'
                     END
         ELSE 'passenger'   -- V1 has no InspectionType field; conservative default, flagged below
    END AS inspection_type_out,
    (s.schema_version = 1 OR lower(coalesce(s.document_json->>'InspectionType','')) NOT IN ('s','v','passenger','cargo')) AS inspection_type_defaulted,
    CASE s.schema_version
         WHEN 2 THEN nullif(btrim(s.document_json->>'CompanyName'), '')
         ELSE nullif(btrim(s.document_json->>'tooandja_nimi'), '')
    END AS company_name_raw,
    CASE s.schema_version
         WHEN 2 THEN nullif(btrim(s.document_json->>'CompanyRegNumber'), '')
         ELSE nullif(btrim(s.document_json->>'tooandja_reg_kood'), '')
    END AS company_reg_code_raw,
    CASE s.schema_version
         WHEN 2 THEN migration.safe_nonnegative_int(s.document_json->>'VehicleCount')
         ELSE migration.safe_nonnegative_int(s.document_json->>'soidukite_arv')   -- string in V1, needs CAST
    END AS vehicle_count_out,
    CASE s.schema_version WHEN 2 THEN migration.safe_nonnegative_int(s.document_json->'Controls'->>'Count') ELSE migration.safe_nonnegative_int(s.document_json->>'kontrollitud_kokku') END AS total_drivers_count_out,
    CASE s.schema_version
         WHEN 2 THEN (s.document_json->'InfringementProceedings'->>'PunishedPersonIdCode')
         ELSE NULL
    END AS punished_person_id_code_out,
    CASE s.schema_version
         WHEN 2 THEN (s.document_json->'InfringementProceedings'->>'PunishedPersonFirstName')
         ELSE NULL
    END AS punished_person_first_name_out,
    CASE s.schema_version
         WHEN 2 THEN (s.document_json->'InfringementProceedings'->>'PunishedPersonLastName')
         ELSE NULL
    END AS punished_person_last_name_out,
    CASE s.schema_version
         WHEN 2 THEN (s.document_json->'InfringementProceedings'->>'ReferenceNumber')
         ELSE NULL
    END AS proceeding_reference_number_out,
    CASE s.schema_version
         WHEN 2 THEN coalesce((s.document_json->>'PrescriptionComposed')::boolean, false)
         ELSE coalesce((s.document_json->>'koostatatud_ettekirjutus')::boolean, false)
    END AS prescription_composed_out
FROM tmp_lif_src s;

CREATE TEMP TABLE tmp_lif_numbered ON COMMIT DROP AS
SELECT m.*,
       coalesce(m.inspector_name_raw, '-')                                       AS inspector_name_out,
       least(coalesce(m.inspection_date_raw::date, m.created_at::date), CURRENT_DATE)                 AS inspection_date_out,
       (m.inspection_date_raw IS NULL)                                           AS inspection_date_defaulted,
       coalesce(m.company_name_raw, '-')                                         AS company_name_out,
       coalesce(m.company_reg_code_raw, '-')                                     AS company_reg_code_out,
       'ti-' || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.target_key) AS form_number
FROM tmp_lif_final m;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id',
       CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, 'forms.labour_inspection_form', c.col, c.issue, c.applied, c.raw
FROM tmp_lif_numbered f
CROSS JOIN LATERAL (VALUES
    ('inspector_name', 'missing_required', '-', f.inspector_name_raw),
    ('company_name',   'missing_required', '-', f.company_name_raw),
    ('company_reg_code','missing_required', '-', f.company_reg_code_raw),
    ('inspection_date','missing_required', f.inspection_date_out::text, f.inspection_date_raw::text)
) AS c(col, issue, applied, raw)
WHERE coalesce(btrim(c.raw), '') = '';

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id',
       CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, 'forms.labour_inspection_form', 'inspection_type', 'missing_required',
       'passenger', NULL
FROM tmp_lif_numbered f WHERE f.inspection_type_defaulted;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id',
       CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, 'forms.labour_inspection_form', col,
       'unmapped_classifier', '[]',
       'V1/V2 violation code lists need a legal review against DRIVING_VIOLATION, see README.md'
FROM tmp_lif_numbered f
CROSS JOIN LATERAL (VALUES ('violations'), ('controls_matrix')) AS v(col);

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id',
       CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, 'forms.labour_inspection_form', 'created_by', 'author_fallback',
       'legacy-import', NULL
FROM tmp_lif_numbered f;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id',
       CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, 'forms.labour_inspection_form', 'created_at', 'derived_from_inspection_date',
       f.created_at::text, NULL
FROM tmp_lif_numbered f;

INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id', CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id,'forms.labour_inspection_form','inspection_date','date_adjusted',
       f.inspection_date_out::text,f.inspection_date_raw::text
FROM tmp_lif_numbered f WHERE f.inspection_date_out IS DISTINCT FROM f.inspection_date_raw::date;

WITH ins AS (
    INSERT INTO forms.labour_inspection_form (
        labour_inspection_form_key, form_number, version, status,
        inspector_name, inspection_date, external_inspection_id, inspection_type,
        company_name, company_reg_code, vehicle_count, total_drivers_count,
        prescription_composed, punished_person_id_code, punished_person_first_name,
        punished_person_last_name, proceeding_reference_number,
        created_at, created_by
    )
    SELECT
        f.target_key,
        migration.target_text(f.form_number, 'forms.labour_inspection_form', 'form_number', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        1,
        migration.target_text(f.status, 'forms.labour_inspection_form', 'status', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.inspector_name_out, 'forms.labour_inspection_form', 'inspector_name', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        f.inspection_date_out,
        migration.target_text(f.external_inspection_id, 'forms.labour_inspection_form', 'external_inspection_id', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.inspection_type_out, 'forms.labour_inspection_form', 'inspection_type', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.company_name_out, 'forms.labour_inspection_form', 'company_name', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.company_reg_code_out, 'forms.labour_inspection_form', 'company_reg_code', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        f.vehicle_count_out,
        f.total_drivers_count_out,
        f.prescription_composed_out,
        migration.target_text(f.punished_person_id_code_out, 'forms.labour_inspection_form', 'punished_person_id_code', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.punished_person_first_name_out, 'forms.labour_inspection_form', 'punished_person_first_name', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.punished_person_last_name_out, 'forms.labour_inspection_form', 'punished_person_last_name', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        migration.target_text(f.proceeding_reference_number_out, 'forms.labour_inspection_form', 'proceeding_reference_number', 'RavenDB.V' || f.schema_version || ':' || f.raven_id),
        f.created_at,
        migration.target_text('legacy-import', 'forms.labour_inspection_form', 'created_by', 'RavenDB.V' || f.schema_version || ':' || f.raven_id)
    FROM tmp_lif_numbered f
    RETURNING labour_inspection_form_key, form_number
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT CASE f.schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
       f.raven_id, CASE f.schema_version WHEN 1 THEN 'JobInspection' ELSE 'JobInspectionV2' END,
       f.created_at, 'forms.labour_inspection_form', i.labour_inspection_form_key, i.form_number, :'run_id'
FROM tmp_lif_numbered f
JOIN ins i ON i.labour_inspection_form_key = f.target_key
;


