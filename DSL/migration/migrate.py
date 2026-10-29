#!/usr/bin/env python3
"""Migration coordinator: lock, durable evidence, atomic transforms, hard checks.

Exit 0 = verified without blockers, 1 = execution/integrity failure,
2 = blocked or rehearsal requiring mapping review. No destructive reset.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid
import sqlparse
from datetime import date

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor, execute_values

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "extract"))
from config import connect_target, required
import enrich
import identifiers
import evidence
import decisions
import diagnostics

TARGETS = {
    "GoodRepute": "good_repute_form",
    "TransportInterruption": "kv_form",
    "ForeignViolate": "foreign_violation_form",
    "RoadControlCard2012": "vehicle_technical_form",
    "Roadworthiness2012": "sp_driver_form",
    "DangerousDelivery2012": "adr_form",
}
SUBTYPES = {"RoadControlCard2012": ("RoadControlTrailer", "vehicle_technical_form", "trailer_technical_form"),
            "Roadworthiness2012": ("RoadWorthinessTeamMember", "sp_driver_form", "sp_teammate_form")}
CHILDREN = {"kv_form", "vehicle_technical_form", "sp_driver_form", "adr_form", "trailer_technical_form", "sp_teammate_form"}
ALL_TARGETS = ["compound_form", *TARGETS.values(), "trailer_technical_form", "sp_teammate_form", "labour_inspection_form"]
RAW_TABLES = ["raw_control_form", "raw_control_form_value", "raw_control", "raw_control_to_form_binding",
              "raw_control_decision", "raw_user", "raw_versions", "raw_job_inspection"]
LOCK_ID = 784192631


def execute_file(cur, path, run_id, cutoff, subtype=False):
    text = path.read_text()
    route = re.search(r"^-- migration-route: (\w+)$", text, re.M)
    if route:
        form_type = route[1]
        marker, primary, secondary = SUBTYPES[form_type]
        target = secondary if subtype else primary
        # Explicit template tokens, independent of file names and ordinary SQL text.
        text = text.replace("{{target}}", target)
        text = text.replace("{{subtype_predicate}}", ("" if subtype else "NOT ") +
                            cur.mogrify("migration.is_subtype(cf.id, %s)", (marker,)).decode())
    elif subtype:
        raise ValueError("Subtype requested for a SQL file without migration-route")
    if "{{" in text or "}}" in text:
        raise ValueError("Unresolved migration SQL template token")
    # Only two psql literals are supported; SQL files are version-controlled.
    text = text.replace(":'run_id'", cur.mogrify("%s", (run_id,)).decode())
    text = text.replace(":'cutoff_from'", cur.mogrify("%s", (cutoff,)).decode())
    for name in re.findall(r"CREATE TEMP TABLE (\w+)", text):
        cur.execute(sql.SQL("DROP TABLE IF EXISTS pg_temp.{}").format(sql.Identifier(name)))
    if diagnostics._journal is None or path.parent.name != 'sql' or not re.match(r'0[1-7]-',path.name):
        cur.execute(text)
        return
    # Export the quality rows produced BEFORE a failing INSERT in the same SQL
    # file. Executing the whole file in one command loses that evidence on error.
    for index,statement in enumerate(sqlparse.split(text),1):
        cur.execute('SAVEPOINT diagnostic_statement')
        try:
            cur.execute(statement)
        except psycopg2.Error as exc:
            diagnostics.emit('sql_statement_failed', sql_file=path.name, statement_index=index,
                             statement=statement, **diagnostics.exception(exc))
            cur.execute('ROLLBACK TO SAVEPOINT diagnostic_statement')
            diagnostics.checkpoint(cur,run_id,diagnostics._journal.directory,path.name)
            raise
        cur.execute('RELEASE SAVEPOINT diagnostic_statement')
    diagnostics.checkpoint(cur,run_id,diagnostics._journal.directory,path.name)


def rows(cur, query, params=()):
    cur.execute(query, params)
    names = [d[0] for d in cur.description]
    return [dict(zip(names, r)) for r in cur.fetchall()]


def fingerprint_sources(cur):
    # Include author/group/audit inputs as well as EAV; a changed linked source
    # requires a fresh rehearsal/explicit repair, never a silent idempotent skip.
    cur.execute("""
        CREATE TEMP TABLE source_fingerprint ON COMMIT PRESERVE ROWS AS
        SELECT 'ControlForm'::text AS source, cf.id::text AS legacy_id,
          md5(jsonb_build_object('form',to_jsonb(cf),'user',to_jsonb(u),
            'values',coalesce(v.data,'[]'::jsonb),'bindings',coalesce(b.data,'[]'::jsonb),
            'versions',coalesce(a.data,'[]'::jsonb))::text) AS fingerprint
        FROM staging.raw_control_form cf LEFT JOIN staging.raw_user u ON u.id=cf.created_by_user_id
        LEFT JOIN LATERAL (SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) data
            FROM staging.raw_control_form_value x WHERE x.control_form_id=cf.id) v ON true
        LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('binding',to_jsonb(x),'control',to_jsonb(c)) ORDER BY x.id) data
            FROM staging.raw_control_to_form_binding x LEFT JOIN staging.raw_control c ON c.id=x.control_id
            WHERE x.control_form_id=cf.id) b ON true
        LEFT JOIN LATERAL (SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) data
            FROM staging.raw_versions x WHERE btrim(x.table_name,'[]')='ControlForm' AND x.row_id=cf.id) a ON true
        UNION ALL SELECT CASE schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
          raven_id, md5(document_json::text) FROM staging.raw_job_inspection;
        CREATE UNIQUE INDEX ON source_fingerprint(source,legacy_id);
    """)


def snapshot(cur, run_id):
    for table in RAW_TABLES:
        key = "raven_id" if table == "raw_job_inspection" else "id"
        cur.execute(sql.SQL("INSERT INTO migration.source_snapshot SELECT %s,%s,{}::text,to_jsonb(t) FROM staging.{} t")
                    .format(sql.Identifier(key), sql.Identifier(table)), (run_id, table))
        evidence.record(cur, run_id, table, key)
    fingerprint_sources(cur)


def preflight(cur, run_id, cutoff):
    cur.execute("""CREATE TABLE IF NOT EXISTS migration.disposition (
        migration_run_id uuid NOT NULL REFERENCES migration.run,
        legacy_source text NOT NULL, legacy_id text NOT NULL, form_type text,
        reason text NOT NULL, target_table text,
        PRIMARY KEY(migration_run_id,legacy_source,legacy_id))""")
    cur.execute("CREATE TEMP TABLE type_mapping (form_type text PRIMARY KEY, target_table text)")
    execute_values(cur, "INSERT INTO type_mapping VALUES %s", [(k, "forms."+v) for k,v in TARGETS.items()])
    cur.execute("""INSERT INTO migration.disposition (migration_run_id,legacy_source,legacy_id,form_type,reason,target_table)
        SELECT %s,'ControlForm',cf.id::text,cf.form_type_name,
        CASE WHEN cf.control_stage IS NULL OR cf.control_stage NOT IN ('Confirmed','Published','Saved','Deleted','ERROR') THEN 'unknown_status'
             WHEN cf.control_stage NOT IN ('Confirmed','Published') THEN 'excluded_status'
             WHEN migration.control_form_scope(cf.id,%s::date) NOT IN ('within_window','included_control_peer')
               THEN migration.control_form_scope(cf.id,%s::date)
             WHEN cf.form_type_name='FuelSample' THEN 'excluded_fuel_sample'
             WHEN m.target_table IS NULL THEN 'unsupported_form_type'
             ELSE 'eligible' END, m.target_table
        FROM staging.raw_control_form cf LEFT JOIN type_mapping m ON m.form_type=cf.form_type_name""", (run_id,cutoff,cutoff))
    cur.execute("ALTER TABLE migration.disposition ADD COLUMN IF NOT EXISTS inclusion_basis text")
    cur.execute("""UPDATE migration.disposition SET inclusion_basis=migration.control_form_scope(legacy_id::bigint,%s::date)
        WHERE migration_run_id=%s AND legacy_source='ControlForm'""",(cutoff,run_id))
    for form_type,(marker,primary,secondary) in SUBTYPES.items():
        cur.execute("""UPDATE migration.disposition d SET target_table=%s
            WHERE migration_run_id=%s AND legacy_source='ControlForm' AND form_type=%s
              AND migration.is_subtype(d.legacy_id::bigint,%s)""",('forms.'+secondary,run_id,form_type,marker))
    cur.execute("""INSERT INTO migration.disposition (migration_run_id,legacy_source,legacy_id,form_type,reason,target_table)
        SELECT %s,CASE schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
        raven_id,CASE schema_version WHEN 1 THEN 'JobInspection' ELSE 'JobInspectionV2' END,
        CASE WHEN schema_version=2 AND document_json->>'Stage' IN ('Saved','Deleted','ERROR') THEN 'excluded_status'
             WHEN schema_version=2 AND coalesce(document_json->>'Stage','') NOT IN ('Confirmed','Published') THEN 'unknown_status'
             WHEN migration.raven_scope_timestamp(CASE schema_version WHEN 1 THEN document_json->>'kontrolli_kp' ELSE document_json->>'InspectionDate' END) IS NULL THEN 'missing_scope_date'
             WHEN migration.raven_scope_timestamp(CASE schema_version WHEN 1 THEN document_json->>'kontrolli_kp' ELSE document_json->>'InspectionDate' END) < %s::date THEN 'excluded_before_cutoff'
             ELSE 'eligible' END, 'forms.labour_inspection_form'
        FROM staging.raw_job_inspection""", (run_id,cutoff))

    def finding(issue, detail, query, params=(), severity="blocker"):
        cur.execute("INSERT INTO migration.finding SELECT %s,%s,q.source,q.legacy_id,%s,%s FROM ("+query+") q",
                    (run_id,severity,issue,detail,*params))

    identifiers.preflight(cur, run_id)

    finding("scope_unresolved", "Cannot determine eligibility/target; resolve before cutover",
        "SELECT legacy_source source,legacy_id FROM migration.disposition WHERE migration_run_id=%s AND reason IN ('missing_scope_date','unknown_status','unsupported_form_type')", (run_id,))
    decisions.preflight(cur, run_id, enrich.scalar)
    finding("source_configuration_changed", "Source label/cutoff differs from previously linked data; use the same frozen source and fixed cutoff",
        "SELECT 'all' source,'*' legacy_id WHERE EXISTS (SELECT 1 FROM migration.run r JOIN migration.form_link f ON f.migration_run_id=r.migration_run_id WHERE r.source_label IS DISTINCT FROM %s OR r.source_cutoff_from<>%s::date)",
        (required("SOURCE_LABEL"),cutoff))
    finding("mapping_code_changed", "ETL code changed since linked rows were written; restore a clean rehearsal target before applying corrected mappings",
        "SELECT 'all' source,'*' legacy_id WHERE EXISTS (SELECT 1 FROM migration.form_link f JOIN migration.run old ON old.migration_run_id=f.migration_run_id JOIN migration.run current ON current.migration_run_id=%s WHERE old.code_sha256 IS DISTINCT FROM current.code_sha256)", (run_id,))
    finding("source_changed", "Already linked source changed or has no fingerprint; restore a clean target backup and rerun after review",
        "SELECT DISTINCT fl.legacy_source source, fl.legacy_id FROM migration.form_link fl JOIN source_fingerprint s ON s.source=fl.legacy_source AND s.legacy_id=fl.legacy_id WHERE fl.source_fingerprint IS DISTINCT FROM s.fingerprint")
    finding("linked_source_missing", "Previously migrated source absent from current extract; check source identity/cutoff before rerun",
        "SELECT DISTINCT fl.legacy_source source,fl.legacy_id FROM migration.form_link fl LEFT JOIN source_fingerprint s ON s.source=fl.legacy_source AND s.legacy_id=fl.legacy_id WHERE s.legacy_id IS NULL")
    finding("linked_scope_changed", "Previously migrated source is now excluded; insert-only migration cannot update its status",
        "SELECT DISTINCT fl.legacy_source source,fl.legacy_id FROM migration.form_link fl JOIN migration.disposition d ON d.legacy_source=fl.legacy_source AND d.legacy_id=fl.legacy_id WHERE d.migration_run_id=%s AND d.reason<>'eligible'", (run_id,))

    finding("prior_rehearsal_requires_review", "Linked rows were written by a rehearsal; production requires a clean accepted target",
        "SELECT DISTINCT f.legacy_source source,f.legacy_id FROM migration.form_link f JOIN migration.run r ON r.migration_run_id=f.migration_run_id WHERE r.status='needs_review'")
    finding("masked_source_value", "Owner 2026-10-19: retain text mask or typed NULL; verify mapped fields",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
        FROM staging.raw_control_form_value v JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=v.control_form_id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND migration.is_masked(v.value)""", (run_id,), "warning")
    finding("invalid_required_date", "Nonempty unmasked GoodRepute date is invalid/future; no guessed replacement",
        """SELECT DISTINCT 'ControlForm' source,d.legacy_id FROM migration.disposition d
        CROSS JOIN (VALUES ('Driver.Birthdate'),('AmetialasePadevuseTunnistuseValjaandmiseKuupaev')) k(name)
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type='GoodRepute'
        AND EXISTS (SELECT 1 FROM staging.raw_control_form_value v WHERE v.control_form_id::text=d.legacy_id
          AND v.classifier_name=k.name AND NOT migration.is_masked(v.value)
          AND (nullif(btrim(v.value),'') IS NOT NULL OR v.date_value IS NOT NULL)
          AND (migration.source_date(v.value,v.date_value) IS NULL
               OR migration.source_date(v.value,v.date_value)::date>CURRENT_DATE))""",(run_id,))

    finding("invalid_required_date", "Nonempty unmasked GoodRepute unfitness date is invalid; no guessed replacement",
        """SELECT DISTINCT 'ControlForm' source,d.legacy_id FROM migration.disposition d
        JOIN staging.raw_control_form_value v ON v.control_form_id::text=d.legacy_id
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type='GoodRepute'
          AND v.classifier_name IN ('SobimatuksKuulutamiseAlguskuupaev','SobimatuksKuulutamiseLoppkuupaev')
          AND NOT migration.is_masked(v.value) AND nullif(btrim(v.value),'') IS NOT NULL
          AND migration.source_date(v.value,v.date_value) IS NULL""",(run_id,))
    # chk_grf_unfit_until_after_from requires until > from; the source is imported as-is.
    finding("invalid_required_date", "GoodRepute unfitness end date is not after its start date; fix the source, no guessed replacement",
        """SELECT DISTINCT 'ControlForm' source,d.legacy_id FROM migration.disposition d
        JOIN staging.raw_control_form_value f ON f.control_form_id::text=d.legacy_id AND f.classifier_name='SobimatuksKuulutamiseAlguskuupaev'
        JOIN staging.raw_control_form_value u ON u.control_form_id::text=d.legacy_id AND u.classifier_name='SobimatuksKuulutamiseLoppkuupaev'
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type='GoodRepute'
          AND NOT migration.is_masked(f.value) AND NOT migration.is_masked(u.value)
          AND migration.source_date(u.value,u.date_value)::date <= migration.source_date(f.value,f.date_value)::date""",(run_id,))

    # Business mappings are not inferred from sample counts. These known gaps
    # block production, even if every INSERT and row-count check succeeds.
    gaps = {
        "kv_form": "Options/legal_bases and person-specific fields require complete mapping",
        "foreign_violation_form": "Violations and reporting authority mapping incomplete",
        "vehicle_technical_form": "Detailed technical defects and remaining decisions require complete mapping",
        "sp_driver_form": "Violations, document checks and remaining decisions require complete mapping",
        "adr_form": "Goods, infringements, parties and remaining decisions require complete mapping",
        "labour_inspection_form": "Controls/violations and V1 inspection type require approved mappings",
    }
    gaps["trailer_technical_form"]="Legacy defects and violation classifiers require complete mapping"
    gaps["sp_teammate_form"]="Legacy second-driver violation classifiers require complete mapping"
    for target, detail in gaps.items():
        finding("mapping_incomplete", detail,
                "SELECT legacy_source source,legacy_id FROM migration.disposition WHERE migration_run_id=%s AND reason='eligible' AND target_table=%s", (run_id,"forms."+target))

    # Derive the actual single-value assumptions from each SQL transform. The
    # scope is per form TYPE, not a global list that blocks unrelated forms.
    for path in sorted((HERE / "sql").glob("0[1-6]-transform-*.sql")):
        text = path.read_text()
        form_type = re.search(r"cf.form_type_name = '([^']+)'", text)[1]
        keys = sorted(set(re.findall(r"v.classifier_name = '([^']+)'", text)))
        scalar_keys = sorted(set(re.findall(r"max\([^\n]+FILTER \(WHERE v.classifier_name = '([^']+)'", text)))
        finding("multivalue_scalar", "A scalar pivot has multiple EAV rows; no MAX-based data loss is permitted",
            """SELECT 'ControlForm' source,v.control_form_id::text legacy_id
                FROM staging.raw_control_form_value v JOIN migration.disposition d
                ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
                WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type=%s
                  AND v.classifier_name=ANY(%s)
                GROUP BY v.control_form_id,v.classifier_name HAVING count(*)>1""", (run_id,form_type,scalar_keys))
        keys = sorted(set(keys) | enrich.consumed_keys(form_type))
        # One diagnostic per source row/key, not just a generic form-level flag.
        cur.execute("""INSERT INTO migration.finding
            SELECT %s,'blocker','ControlForm',v.control_form_id::text,'unmapped_eav',
              jsonb_build_object('source_row_id',v.id,'field',v.classifier_name,
                'raw_value',v.value,'date_value',v.date_value,'int_value',v.int_value,
                'target_table',d.target_table,'action','not_mapped; source snapshot only')::text
                FROM staging.raw_control_form_value v JOIN migration.disposition d
                ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
                WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type=%s
                  AND (nullif(btrim(v.value),'') IS NOT NULL OR v.date_value IS NOT NULL OR coalesce(v.int_value,0)<>0)
                  AND (v.classifier_name IS NULL OR NOT (v.classifier_name=ANY(%s)))""", (run_id,run_id,form_type,keys))
    finding("unsupported_subtype", "Subtype marker is not an explicit true/1; ambiguous legacy presence semantics need review",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
            FROM staging.raw_control_form_value v JOIN migration.disposition d
            ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
            WHERE d.migration_run_id=%s AND d.reason='eligible'
              AND lower(btrim(coalesce(v.value,''))) NOT IN ('true','1')
              AND ((d.form_type='RoadControlCard2012' AND v.classifier_name='RoadControlTrailer')
                OR (d.form_type='Roadworthiness2012' AND v.classifier_name='RoadWorthinessTeamMember'))""", (run_id,))
    cur.execute("""INSERT INTO migration.finding
        SELECT %s,'info','ControlForm',d.legacy_id,'approved_time_default',
          jsonb_build_object('field','InspectionDate.Time','before',v.value,'after','00:00:00',
            'approval_basis','owner-2026-10-19-P12-invalid-time',
            'application_state','planned','source_row_id',v.id)::text
        FROM migration.disposition d LEFT JOIN staging.raw_control_form_value v
          ON v.control_form_id::text=d.legacy_id AND v.classifier_name='InspectionDate.Time'
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.legacy_source='ControlForm'
          AND d.form_type<>'GoodRepute' AND migration.safe_time(v.value) IS NULL
          AND NOT migration.is_masked(v.value)""", (run_id,run_id))
    finding("invalid_integer", "Invalid/negative/overflowing checked days becomes NULL only in rehearsal",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
            FROM staging.raw_control_form_value v JOIN migration.disposition d
            ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND v.classifier_name='kontrollitud_paevade_arv'
              AND migration.safe_nonnegative_int(coalesce(v.int_value::text,v.value)) IS NULL""", (run_id,))
    finding("unmapped_inspection_type", "V2 InspectionType must be S/V (legacy) or passenger/cargo; unknown values require review",
        """SELECT d.legacy_source source,d.legacy_id FROM staging.raw_job_inspection j
            JOIN migration.disposition d ON d.legacy_id=j.raven_id AND d.legacy_source='RavenDB.JobInspectionV2'
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND j.schema_version=2
              AND lower(coalesce(j.document_json->>'InspectionType','')) NOT IN ('s','v','passenger','cargo')""", (run_id,))
    # RegisterJobInspection_v2 repeats find migrated acts through forms.labour_inspection_external_ref.
    # An InspectionId already received by LJVIS2 over X-tee would become a second act: decide, never merge silently.
    finding("external_id_already_received", "V2 InspectionId is already linked to an LJVIS2 act received over X-tee; migrating would create a second act",
        """SELECT d.legacy_source source,d.legacy_id FROM staging.raw_job_inspection j
            JOIN migration.disposition d ON d.legacy_id=j.raven_id AND d.legacy_source='RavenDB.JobInspectionV2'
            JOIN forms.labour_inspection_external_ref r ON r.source='xroad-v2'
             AND r.external_id=nullif(btrim(j.document_json->>'InspectionId'),'')
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND j.schema_version=2""", (run_id,))
    finding("invalid_raven_count", "Vehicle/driver count is negative, nonnumeric or outside integer range; original document retained",
        """SELECT d.legacy_source source,d.legacy_id FROM staging.raw_job_inspection j
            JOIN migration.disposition d ON d.legacy_id=j.raven_id AND d.legacy_source LIKE 'RavenDB.%%'
            CROSS JOIN LATERAL (VALUES
              (CASE j.schema_version WHEN 1 THEN j.document_json->>'soidukite_arv' ELSE j.document_json->>'VehicleCount' END),
              (CASE j.schema_version WHEN 1 THEN j.document_json->>'kontrollitud_kokku' ELSE j.document_json->'Controls'->>'Count' END)) x(value)
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND x.value IS NOT NULL
              AND migration.safe_nonnegative_int(x.value) IS NULL""", (run_id,))
    finding("unmapped_fitness", "GoodRepute.Sobivus is absent or unsupported; form cannot be silently skipped",
        """SELECT 'ControlForm' source,d.legacy_id FROM migration.disposition d
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type='GoodRepute'
              AND NOT EXISTS (SELECT 1 FROM staging.raw_control_form_value v WHERE v.control_form_id::text=d.legacy_id
                AND v.classifier_name='Sobivus' AND lower(btrim(v.value)) IN ('sobiv','sobimatu'))""", (run_id,))
    cur.execute("""UPDATE migration.finding f SET detail=f.detail || '; Sobivus=' ||
        coalesce((SELECT string_agg(coalesce(v.value,'<NULL>'),', ' ORDER BY v.id)
                  FROM staging.raw_control_form_value v WHERE v.control_form_id::text=f.legacy_id
                  AND v.classifier_name='Sobivus'),'<missing>')
        WHERE f.migration_run_id=%s AND f.issue='unmapped_fitness'""", (run_id,))
    finding("control_date_conflict", "Parsed EAV inspection date differs from typed ControlledDate; EAV retained, compare both source values",
        """SELECT DISTINCT 'ControlForm' source,d.legacy_id FROM migration.disposition d
            JOIN staging.raw_control_form cf ON cf.id::text=d.legacy_id
            JOIN staging.raw_control_form_value v ON v.control_form_id=cf.id
            WHERE d.migration_run_id=%s AND d.legacy_source='ControlForm' AND d.reason='eligible'
              AND v.classifier_name='InspectionDate.Date' AND cf.controlled_date IS NOT NULL
              AND coalesce(v.date_value,migration.safe_timestamp(v.value))::date <> cf.controlled_date::date""", (run_id,), "warning")
    # Independent from generic mapping gaps: accepting '-' must never authorize
    # a missing/ambiguous legal outcome to become 'ok' in production.
    finding("unmapped_control_result", "Missing, unknown or multiple otsus values; rehearsal result is a placeholder, never a production-approved outcome",
        """SELECT 'ControlForm' source,d.legacy_id FROM migration.disposition d
            LEFT JOIN staging.raw_control_form_value v ON v.control_form_id::text=d.legacy_id
                AND v.classifier_name='otsus' AND nullif(btrim(v.value),'') IS NOT NULL
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.legacy_source='ControlForm'
              AND d.form_type IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012')
            GROUP BY d.legacy_id,d.form_type
            HAVING migration.legacy_result(CASE d.form_type WHEN 'RoadControlCard2012' THEN 'technical'
                WHEN 'Roadworthiness2012' THEN 'sp' ELSE 'adr' END,
                array_agg(DISTINCT btrim(v.value)) FILTER (WHERE v.value IS NOT NULL)) IS NULL""", (run_id,))
    decisions.approve_other_findings(cur,run_id,enrich.scalar)
    finding("country_normalized_or_unknown", "Country text was normalized or replaced by unknown marker; compare original field in source_snapshot",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id FROM staging.raw_control_form_value v
            JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=v.control_form_id::text
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND v.classifier_name LIKE '%%.Country'
              AND (v.value IS DISTINCT FROM migration.safe_country_code(v.value)
                   OR length(migration.safe_country_code(v.value))=3)""", (run_id,), "warning")
    limits={'Driver.Isikukood':20,'Driver.Eesnimi':100,'Driver.Perekonnanimi':100,
            'Driver.FirstName':100,'Driver.LastName':100,'Vehicle.VinCode':17,'Vehicle.RegNo':20,
            'Inspector.FirstName':100,'Inspector.LastName':100,'Inspector.AmetiisikuAndmed':100,
            'Inspector.Job':150,'Company.RegistryNumber':20,'Company.CompanyName':300}
    for key,limit in limits.items():
        finding("oversized_source_text", f"{key} exceeds target length {limit}; no silent truncation",
            """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id FROM staging.raw_control_form_value v
                JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=v.control_form_id::text
                WHERE d.migration_run_id=%s AND d.reason='eligible' AND v.classifier_name=%s AND length(v.value)>%s""", (run_id,key,limit))
    finding("future_source_date", "Future source date; do not silently treat a clamped date as valid business data",
        """SELECT 'ControlForm' source,cf.id::text legacy_id FROM staging.raw_control_form cf
            JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=cf.id::text
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND (cf.created_date::date>CURRENT_DATE OR cf.controlled_date::date>CURRENT_DATE)
            UNION ALL SELECT d.legacy_source,d.legacy_id FROM staging.raw_job_inspection j
            JOIN migration.disposition d ON d.legacy_id=j.raven_id AND d.legacy_source LIKE 'RavenDB.%%'
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND migration.raven_scope_timestamp(
                CASE j.schema_version WHEN 1 THEN j.document_json->>'kontrolli_kp' ELSE j.document_json->>'InspectionDate' END)::date>CURRENT_DATE""", (run_id,run_id), "warning")
    cur.execute("SELECT count(*) FROM migration.disposition WHERE migration_run_id=%s", (run_id,))
    if cur.fetchone()[0] == 0:
        finding("empty_source", "No source forms/documents extracted; verify source identity and cutoff", "SELECT 'all' source,'*' legacy_id")
    return rows(cur, "SELECT severity,issue,count(*) AS count FROM migration.finding WHERE migration_run_id=%s GROUP BY 1,2 ORDER BY 1,2", (run_id,))


def check_integrity(cur, run_id, require_coverage=True):
    problems = identifiers.mismatches(cur)
    problems.extend(evidence.mismatches(cur, run_id, RAW_TABLES))
    problems.extend(evidence.extraction_mismatches(cur,run_id))
    changed_tables={p['table'] for p in problems if p['check'] in ('source_snapshot_changed','source_staging_changed')}
    if changed_tables:
        problems.append({'check':'source_row_differences','records':evidence.row_differences(cur,run_id,changed_tables)})
    problems.extend(evidence.day_count_mismatches(cur))
    cur.execute("""SELECT d.legacy_source,d.legacy_id,f.form_code,d.reason FROM migration.disposition d
        JOIN migration.run r USING(migration_run_id)
        JOIN staging.raw_control_form f ON f.id::text=d.legacy_id
        WHERE d.migration_run_id=%s AND d.legacy_source='ControlForm'
          AND f.form_type_name=ANY(%s)
          AND ((migration.control_form_scope(f.id,r.source_cutoff_from::date) IN ('within_window','included_control_peer'))
               IS DISTINCT FROM (d.reason='eligible'))""",(run_id,list(TARGETS)))
    invalid_scope=[dict(zip(('legacy_source','legacy_id','source_form_number','reason'),r)) for r in cur.fetchall()]
    if invalid_scope:
        problems.append({'check':'source_scope_disposition_changed','count':len(invalid_scope),'records':invalid_scope})
    if require_coverage:
        missing = rows(cur, """SELECT d.legacy_source,d.legacy_id,d.target_table
            FROM migration.disposition d WHERE d.migration_run_id=%s AND d.reason='eligible'
            AND NOT EXISTS (SELECT 1 FROM migration.form_link f WHERE f.legacy_source=d.legacy_source
              AND f.legacy_id=d.legacy_id AND f.target_table=d.target_table)""", (run_id,))
        if missing:
            problems.append({"check":"missing_target_links","count":len(missing),"records":missing})
    for table in ALL_TARGETS:
        target = "forms."+table
        key = table+"_key"
        number = "sub_form_number" if table in CHILDREN else "form_number"
        cur.execute(sql.SQL("""SELECT f.legacy_source,f.legacy_id,f.target_key,f.target_form_number FROM migration.form_link f WHERE f.target_table=%s AND NOT EXISTS (
            SELECT 1 FROM forms.{} t WHERE t.{}=f.target_key AND t.{}=f.target_form_number)""")
            .format(sql.Identifier(table),sql.Identifier(key),sql.Identifier(number)), (target,))
        missing_rows=[dict(zip(('legacy_source','legacy_id','target_key','target_form_number'),r)) for r in cur.fetchall()]
        if missing_rows: problems.append({"check":"dangling_target_link","table":table,"count":len(missing_rows),'records':missing_rows})
        cur.execute(sql.SQL("SELECT {number},array_agg(DISTINCT {key}) FROM forms.{table} GROUP BY {number} HAVING count(DISTINCT {key})>1")
                    .format(number=sql.Identifier(number),table=sql.Identifier(table),key=sql.Identifier(key)))
        conflicts=[{'form_number':n,'target_keys':keys} for n,keys in cur.fetchall()]
        if conflicts: problems.append({"check":"duplicate_form_number","table":table,"count":len(conflicts),'records':conflicts})
        cur.execute(sql.SQL("SELECT {key},array_agg(DISTINCT {number}) FROM forms.{table} GROUP BY {key} HAVING count(DISTINCT {number})>1")
                    .format(number=sql.Identifier(number),table=sql.Identifier(table),key=sql.Identifier(key)))
        conflicts=[{'target_key':k,'form_numbers':numbers} for k,numbers in cur.fetchall()]
        if conflicts: problems.append({"check":"logical_key_has_multiple_numbers","table":table,"count":len(conflicts),'records':conflicts})
        if table in CHILDREN:
            cur.execute(sql.SQL("""SELECT f.legacy_source,f.legacy_id,f.target_key,t.compound_form_key FROM forms.{} t JOIN migration.form_link f
                ON f.target_table=%s AND f.target_key=t.{}
                WHERE NOT EXISTS (SELECT 1 FROM forms.compound_form p WHERE p.compound_form_key=t.compound_form_key)
                   OR NOT EXISTS (SELECT 1 FROM migration.form_link p WHERE p.legacy_source=f.legacy_source
                     AND p.legacy_id=f.legacy_id AND p.target_table='forms.compound_form' AND p.target_key=t.compound_form_key)""")
                    .format(sql.Identifier(table),sql.Identifier(key)), (target,))
            missing=[dict(zip(('legacy_source','legacy_id','target_key','compound_form_key'),r)) for r in cur.fetchall()]
            if missing: problems.append({"check":"missing_parent","table":table,"count":len(missing),'records':missing})
    duplicates=rows(cur,"SELECT target_table,target_key,count(*),array_agg(legacy_source||':'||legacy_id) AS source_forms FROM migration.form_link WHERE target_table<>'forms.compound_form' GROUP BY 1,2 HAVING count(*)>1")
    if duplicates: problems.append({"check":"duplicate_target_link","records":duplicates})
    split = rows(cur,"""SELECT b.control_id,count(DISTINCT f.target_key) AS parents,
        array_agg(DISTINCT f.legacy_id) AS source_forms,array_agg(DISTINCT f.target_key) AS target_keys
        FROM staging.raw_control_to_form_binding b JOIN staging.raw_control c ON c.id=b.control_id
        JOIN migration.form_link f ON f.legacy_source='ControlForm' AND f.legacy_id=b.control_form_id::text
          AND f.target_table='forms.compound_form'
        GROUP BY b.control_id HAVING count(DISTINCT f.target_key)>1""")
    if split: problems.append({"check":"split_compound_control","count":len(split),'records':split})
    if require_coverage:
        problems.extend(decisions.mismatches(cur, run_id, enrich.scalar))
    return problems


def state_signature(cur, include_findings=False):
    # Compare complete rows (including quality findings), not just INSERT's count.
    result=[]
    for table in ["forms."+t for t in ALL_TARGETS]+["migration.form_link","migration.quality_report"]:
        cur.execute(sql.SQL("SELECT count(*), md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),'') ) FROM {} t")
                    .format(sql.Identifier(*table.split('.'))) if table != "migration.form_link" else
                    "SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY legacy_source,legacy_id,target_table),'')) FROM migration.form_link t")
        result.append(cur.fetchone())
    if include_findings:
        cur.execute("SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY to_jsonb(t)::text),'')) FROM migration.finding t")
        result.append(cur.fetchone())
    return result


def report(cur, run_id, directory, problems=None):
    output={"run":rows(cur,"SELECT * FROM migration.run WHERE migration_run_id=%s",(run_id,)),
        "linked_runs":rows(cur,"""SELECT DISTINCT r.migration_run_id,r.status,r.mode FROM migration.run r
          JOIN migration.form_link f ON f.migration_run_id=r.migration_run_id ORDER BY r.migration_run_id"""),
        "inherited_findings":rows(cur,"""SELECT severity,issue,count(*) FROM migration.finding
          WHERE migration_run_id<>%s AND migration_run_id IN (SELECT DISTINCT migration_run_id FROM migration.form_link)
          GROUP BY 1,2 ORDER BY 1,2""",(run_id,)),
        "selection_basis":rows(cur,"SELECT inclusion_basis,count(*) FROM migration.disposition WHERE migration_run_id=%s AND legacy_source='ControlForm' GROUP BY 1 ORDER BY 1",(run_id,)),
        "dispositions":rows(cur,"SELECT form_type,reason,count(*) FROM migration.disposition WHERE migration_run_id=%s GROUP BY 1,2 ORDER BY 1,2",(run_id,)),
        "findings":rows(cur,"""SELECT severity,issue,count(*),count(DISTINCT (legacy_source,legacy_id)) AS affected_records FROM (
          SELECT DISTINCT severity,legacy_source,legacy_id,issue,detail FROM migration.finding
          WHERE migration_run_id=%s OR migration_run_id IN (SELECT DISTINCT migration_run_id FROM migration.form_link)
          ) effective GROUP BY 1,2 ORDER BY 1,2""",(run_id,)),
        "coverage":rows(cur,"""SELECT d.form_type,
            count(*) FILTER (WHERE d.reason='eligible') AS eligible,
            count(*) FILTER (WHERE d.reason='eligible' AND EXISTS (
                SELECT 1 FROM migration.form_link f WHERE f.legacy_source=d.legacy_source
                  AND f.legacy_id=d.legacy_id AND f.target_table=d.target_table)) AS linked
            FROM migration.disposition d WHERE d.migration_run_id=%s GROUP BY 1 ORDER BY 1""",(run_id,)),
        "snapshot_counts":rows(cur,"SELECT source_table,count(*) FROM migration.source_snapshot WHERE migration_run_id=%s GROUP BY 1 ORDER BY 1",(run_id,)),
        "links":rows(cur,"SELECT target_table,count(*) FROM migration.form_link GROUP BY 1 ORDER BY 1"),
        "quality":rows(cur,"SELECT target_table,column_name,issue,approval_basis,count(DISTINCT (legacy_source,legacy_id)) AS affected_forms FROM migration.quality_report WHERE migration_run_id=%s OR migration_run_id IN (SELECT DISTINCT migration_run_id FROM migration.form_link) GROUP BY 1,2,3,4 ORDER BY 1,2,3,4",(run_id,)),
        "integrity_problems":problems or []}
    output['reconciliation'] = diagnostics.export_reconciliation(cur,run_id,directory,ALL_TARGETS)
    output['source_manifest'] = rows(cur, 'SELECT * FROM migration.source_manifest WHERE migration_run_id=%s',(run_id,))
    extraction_path = directory/'source-counts.json'
    if extraction_path.exists():
        output['extraction'] = json.loads(extraction_path.read_text())
    diagnostics.write_json(directory/'summary.json',output)
    diagnostics.write_json(directory/'integrity_problems.json',problems or [])
    diagnostics.export_owner_events(directory)
    for table in ("finding","disposition","quality_report"):
        with (directory/(table+".csv")).open("w") as f:
            condition = "migration_run_id=%s"
            if table in ("finding", "quality_report"):
                condition += " OR migration_run_id IN (SELECT DISTINCT migration_run_id FROM migration.form_link)"
            query=cur.mogrify("SELECT * FROM migration."+table+" WHERE "+condition,(run_id,)).decode()
            cur.copy_expert("COPY ("+query+") TO STDOUT WITH CSV HEADER",f)
    detailed = diagnostics.detailed_findings(cur,run_id)
    diagnostics.write_json(directory/'findings-detailed.json',detailed)
    diagnostics.write_csv(directory/'findings-detailed.csv',detailed,diagnostics.FINDING_COLUMNS)
    diagnostics.write_json(directory/'unmapped-fields.json',[
        dict(legacy_source=f['legacy_source'],legacy_id=f['legacy_id'],source_form_number=f['source_form_number'],
             **json.loads(f['detail'])) for f in detailed if f['issue']=='unmapped_eav' and f['detail'].startswith('{')])
    fields=rows(cur,'''WITH unhandled AS (
        SELECT DISTINCT (CASE WHEN left(detail,1)='{' THEN detail::jsonb ELSE '{}'::jsonb END)->>'source_row_id' AS source_row_id
        FROM migration.finding WHERE migration_run_id=%s AND issue='unmapped_eav'
        ) SELECT d.form_type,v.classifier_name AS source_field,count(*) AS populated_rows,
        count(DISTINCT d.legacy_id) AS forms,
        count(*) FILTER (WHERE u.source_row_id IS NOT NULL) AS undeclared_rows
        FROM migration.disposition d JOIN staging.raw_control_form_value v
          ON d.legacy_source='ControlForm' AND d.legacy_id=v.control_form_id::text
        LEFT JOIN unhandled u ON u.source_row_id=v.id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible'
          AND (nullif(btrim(v.value),'') IS NOT NULL OR v.date_value IS NOT NULL OR coalesce(v.int_value,0)<>0)
        GROUP BY d.form_type,v.classifier_name ORDER BY 1,2''',(run_id,run_id))
    for field in fields:
        field['declared_rows']=field['populated_rows']-field['undeclared_rows']
        field['meaning']='declared input is not proof of target value equivalence; see mapping blockers and verify'
    diagnostics.write_csv(directory/'field-coverage.csv',fields,
        ['form_type','source_field','populated_rows','forms','undeclared_rows','declared_rows','meaning'])
    print(json.dumps({"run_id":run_id,"report":str(directory/"summary.json"),"findings":output["findings"],"integrity_problems":problems or []},ensure_ascii=False),flush=True)


def observed_step(cur,run_id,directory,step,operation):
    """Recover from SQL errors enough to export evidence, then let caller abort."""
    if diagnostics._journal:
        diagnostics._journal.step = step
    diagnostics.emit('step_started')
    cur.execute('SAVEPOINT diagnostic_step')
    try:
        result = operation()
    except BaseException as exc:
        diagnostics.emit('step_failed', **diagnostics.exception(exc))
        if cur.connection.get_transaction_status() == psycopg2.extensions.TRANSACTION_STATUS_INERROR:
            cur.execute('ROLLBACK TO SAVEPOINT diagnostic_step')
        diagnostics.checkpoint(cur,run_id,directory,step)
        raise
    diagnostics.checkpoint(cur,run_id,directory,step)
    cur.execute('RELEASE SAVEPOINT diagnostic_step')
    return result


def main():
    class Parser(argparse.ArgumentParser):
        def error(self, message):
            self.print_usage(sys.stderr)
            self.exit(64, f"{self.prog}: error: {message}\n")
    parser=Parser(description=__doc__)
    parser.add_argument("--rehearsal",action="store_true",help="Allow incomplete business mappings on a disposable target; returns 2")
    parser.add_argument("--sql-only",action="store_true",help="Rehearsal of SQL Server only; RavenDB remains explicitly unverified")
    parser.add_argument("--verify",action="store_true",help="Read-only verification of RUN_ID (or latest run)")
    parser.add_argument("--no-recheck",action="store_true",help="Skip transaction-local idempotency test; recorded in run notes")
    args=parser.parse_args()
    if args.sql_only and (not args.rehearsal or args.verify):
        parser.error("--sql-only requires --rehearsal and cannot be used with --verify")
    if args.verify and (args.rehearsal or args.no_recheck): parser.error("--verify cannot be combined with execution flags")
    cutoff = required("CUTOFF") if not args.verify else os.getenv("CUTOFF","")
    if not args.verify:
        date.fromisoformat(cutoff)
        required("SOURCE_LABEL")
        if os.getenv("SOURCE_FROZEN")!="yes": raise ValueError("Set SOURCE_FROZEN=yes only for a restored/quiesced source copy")
        if args.rehearsal and os.getenv("TARGET_DISPOSABLE")!="yes": raise ValueError("--rehearsal requires TARGET_DISPOSABLE=yes")
    run_id=str(uuid.UUID(os.environ["RUN_ID"])) if os.getenv("RUN_ID") else str(uuid.uuid4())
    os.umask(0o077)
    pg=connect_target()
    pg.autocommit=True
    step="initialization"
    registered=False
    target_committed=False
    directory=None
    try:
        with pg.cursor() as cur:
            if args.verify:
                cur.execute("SET default_transaction_read_only=on")
                if not os.getenv("RUN_ID"):
                    cur.execute("SELECT migration_run_id::text FROM migration.run ORDER BY started_at DESC LIMIT 1")
                    result=cur.fetchone()
                    if not result: raise ValueError("No migration run exists")
                    run_id=result[0]
            else:
                cur.execute("SELECT pg_try_advisory_lock(%s)",(LOCK_ID,))
                if not cur.fetchone()[0]: raise RuntimeError("Another migration is running against this target")
                execute_file(cur,HERE/"sql/00-staging-schema.sql",run_id,cutoff)
            directory=Path(os.getenv("MIGRATION_LOG_DIR",str(HERE/"runs")))/run_id
            directory.mkdir(parents=True,exist_ok=True,mode=0o700)
            diagnostics.start(directory,run_id)
            if args.verify:
                problems=check_integrity(cur,run_id)
                report(cur,run_id,directory,problems)
                cur.execute("SELECT status FROM migration.run WHERE migration_run_id=%s",(run_id,))
                result=cur.fetchone()
                if not result: raise ValueError("RUN_ID not found")
                return 1 if problems else (0 if result[0]=="succeeded" else 2)
            code_hash=hashlib.sha256(b''.join(p.read_bytes() for p in sorted(HERE.rglob('*'))
                if p.is_file() and (p.parent==HERE or p.parent.name in ('sql','extract')) and p.suffix in ('.py','.sql','.sh'))).hexdigest()
            cur.execute("INSERT INTO migration.run (migration_run_id,source_cutoff_from,form_types,status,mode,source_label,code_sha256,notes) VALUES (%s,%s,%s,'running',%s,%s,%s,%s)",
                (run_id,cutoff,[*TARGETS,"JobInspection","JobInspectionV2"],"rehearsal" if args.rehearsal else "production",required("SOURCE_LABEL"),code_hash,
                 json.dumps({"no_recheck":args.no_recheck,"raven_mode":"not-provided" if args.sql_only else os.getenv("RAVENDB_MODE","required"),"raven_absence_reason":os.getenv("RAVENDB_ABSENCE_REASON"),"sql_only":args.sql_only})))
            registered=True
            for name in ("extract_mssql_to_staging.py","extract_ravendb_to_staging.py"):
                if args.sql_only and name=="extract_ravendb_to_staging.py":
                    cur.execute("TRUNCATE staging.raw_job_inspection")
                    cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','RavenDB','*','source_not_provided','SQL-only rehearsal: RavenDB was not provided; absence has NOT been confirmed')",(run_id,))
                    continue
                step=name
                cur.execute("UPDATE migration.run SET current_step=%s WHERE migration_run_id=%s",(step,run_id))
                print(f"[migration] run_id={run_id} step={step}",flush=True)
                with (directory/(name+".log")).open("w") as log:
                    result=subprocess.run([sys.executable,str(HERE/"extract"/name)],stdout=log,stderr=subprocess.STDOUT,
                        env={**os.environ,'RUN_ID':run_id,'MIGRATION_RUN_DIRECTORY':str(directory)})
                if result.returncode: raise RuntimeError(f"{name} failed (exit {result.returncode}); see {directory / (name+'.log')}")
            step="snapshot_and_preflight"
            # One transaction for evidence creation; extraction counts are already verified.
            pg.autocommit=False
            snapshot(cur,run_id)
            findings=observed_step(cur,run_id,directory,step,lambda:preflight(cur,run_id,cutoff))
            pg.commit()
            pg.autocommit=True
            blocked=any(f["severity"]=="blocker" for f in findings)
            fatal=any(f["issue"] in {"multivalue_scalar","source_changed","linked_source_missing","linked_scope_changed","source_configuration_changed","unsupported_subtype","mapping_code_changed","unmapped_fitness","invalid_source_document_number","invalid_source_form_version","source_document_number_collision","conflicting_shared_source_header","oversized_source_text","unresolved_owner_group","invalid_required_date","masked_required_header","unresolved_approved_proceeding"} for f in findings)
            existing_problems=check_integrity(cur,run_id,require_coverage=False)
            if fatal or existing_problems or (blocked and not args.rehearsal):
                cur.execute("UPDATE migration.run SET status='blocked',current_step=%s,finished_at=now() WHERE migration_run_id=%s",(step,run_id))
                report(cur,run_id,directory,existing_problems)
                diagnostics.emit('run_outcome',outcome='blocked',target_transaction='not_started')
                return 2
            step="transform"
            cur.execute("UPDATE migration.run SET current_step=%s WHERE migration_run_id=%s",(step,run_id))
            pg.autocommit=False
            # Blocks application INSERT/UPDATE during allocation/checks. Maintenance
            # mode is still required to stop integrations reacting to imported forms.
            cur.execute("SET LOCAL lock_timeout='10s'")
            for table in ALL_TARGETS:
                cur.execute(sql.SQL("LOCK TABLE forms.{} IN SHARE ROW EXCLUSIVE MODE").format(sql.Identifier(table)))
            # A stale sequence can reuse a logical form key (these are snapshot
            # tables, so a primary-key violation would NOT necessarily catch it).
            for table in ALL_TARGETS:
                cur.execute(sql.SQL("SELECT last_value,is_called FROM forms.{}").format(sql.Identifier('seq_'+table+'_key')))
                value,called=cur.fetchone()
                cur.execute(sql.SQL("SELECT coalesce(max({}),0) FROM forms.{}").format(sql.Identifier(table+'_key'),sql.Identifier(table)))
                if value + (1 if called else 0) <= cur.fetchone()[0]:
                    raise RuntimeError(f"Sequence forms.seq_{table}_key is behind existing logical keys; DBA must repair it before migration")
            transforms=sorted((HERE/"sql").glob("0[1-7]-transform-*.sql"))
            for path in transforms:
                step=path.name
                print(f"[migration] run_id={run_id} step={step}",flush=True)
                observed_step(cur,run_id,directory,step,lambda:execute_file(cur,path,run_id,cutoff))
                if '-- migration-route:' in path.read_text():
                    observed_step(cur,run_id,directory,step+':subtype',lambda:execute_file(cur,path,run_id,cutoff,subtype=True))
            step="enrich_and_group"
            observed_step(cur,run_id,directory,step,lambda:enrich.apply(cur,run_id,CHILDREN))
            observed_step(cur,run_id,directory,'preserve_identifiers',lambda:identifiers.preserve(cur,run_id))
            decisions.audit_standalone(cur,run_id)
            cur.execute("""UPDATE migration.form_link f SET source_fingerprint=s.fingerprint
                FROM source_fingerprint s WHERE f.legacy_source=s.source AND f.legacy_id=s.legacy_id AND f.migration_run_id=%s""",(run_id,))
            cur.execute("""UPDATE migration.form_link f SET legacy_form_code=cf.form_code
                FROM staging.raw_control_form cf WHERE f.legacy_source='ControlForm' AND f.legacy_id=cf.id::text AND f.migration_run_id=%s""",(run_id,))
            if not args.no_recheck:
                step="idempotency"
                before=state_signature(cur, include_findings=True)
                for path in transforms:
                    execute_file(cur,path,run_id,cutoff)
                    if '-- migration-route:' in path.read_text(): execute_file(cur,path,run_id,cutoff,subtype=True)
                enrich.apply(cur,run_id,CHILDREN)
                identifiers.preserve(cur,run_id)
                if before!=state_signature(cur, include_findings=True): raise RuntimeError("Idempotency check changed target/link/quality rows")
            step="verification"
            problems=check_integrity(cur,run_id)
            if problems:
                diagnostics.write_json(directory/'attempt'/'integrity_problems.json',problems)
                diagnostics.emit('integrity_failed',problems=problems)
                raise RuntimeError("Integrity verification failed; see attempt/integrity_problems.json")
            # Owner-approved missing text is explicit and auditable. No blanket bypass.
            cur.execute("""UPDATE migration.quality_report SET approval_basis='owner-approved-missing-text-2026-09-23'
                WHERE migration_run_id=%s AND migration.approved_text_default(
                    target_table,column_name,issue,applied_default,raw_value)""",(run_id,))
            cur.execute("""UPDATE migration.quality_report SET approval_basis='owner-2026-10-19-unknown-date'
                WHERE migration_run_id=%s AND target_table='forms.good_repute_form'
                  AND column_name IN ('date_of_birth','certificate_issue_date')
                  AND issue='missing_required' AND applied_default IS NULL AND raw_value IS NULL""", (run_id,))
            cur.execute("SELECT count(*) FROM migration.quality_report WHERE migration_run_id=%s AND approval_basis IS NULL",(run_id,))
            unapproved_quality=cur.fetchone()[0]>0
            cur.execute("SELECT EXISTS (SELECT 1 FROM migration.finding WHERE migration_run_id=%s AND severity='blocker')",(run_id,))
            review=cur.fetchone()[0] or unapproved_quality or args.rehearsal
            if review and not args.rehearsal: raise RuntimeError("Unapproved quality substitutions; production transaction rolled back")
            cur.execute("UPDATE migration.run SET status=%s,current_step='complete',finished_at=now() WHERE migration_run_id=%s",("needs_review" if review else "succeeded",run_id))
            identifiers.reserve_numbers(cur)
            diagnostics.checkpoint(cur,run_id,directory,'before_commit')
            pg.commit()
            pg.autocommit=True
            target_committed=True
            diagnostics.emit('run_outcome',outcome='needs_review' if review else 'succeeded',target_transaction='committed')
            report(cur,run_id,directory)
            return 2 if review else 0
    except BaseException as exc:
        # Capture while uncommitted rows are still visible. The append-only
        # journal remains available even if the connection has already died.
        diagnostics.emit('failure',failure_step=step,**diagnostics.exception(exc))
        if directory:
            diagnostics.write_json(directory/'failure.json',dict(run_id=run_id,step=step,**diagnostics.exception(exc)))
        if directory and registered and not pg.closed and pg.get_transaction_status()!=psycopg2.extensions.TRANSACTION_STATUS_INERROR:
            try:
                with pg.cursor() as cur:
                    diagnostics.checkpoint(cur,run_id,directory,step)
                    diagnostics.export_reconciliation(cur,run_id,directory/'attempt',ALL_TARGETS)
            except Exception as diagnostic_exc:
                diagnostics.emit('diagnostic_failure',**diagnostics.exception(diagnostic_exc))
        rollback_ok=False
        try:
            pg.rollback()
            pg.autocommit=True
            rollback_ok=True
        except Exception as rollback_exc:
            diagnostics.emit('rollback_failure',**diagnostics.exception(rollback_exc))
        diagnostics.emit('run_outcome',outcome='report_failed' if target_committed else 'failed',
                         target_transaction='committed' if target_committed else 'rolled_back' if rollback_ok else 'unknown_check_database')
        if registered and rollback_ok:
            with pg.cursor() as cur:
                if isinstance(exc, enrich.MappingConflict):
                    cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm',%s,%s,%s)",
                                (run_id,str(exc.form_id),exc.issue,str(exc)))
                cur.execute("UPDATE migration.run SET status='failed',current_step=%s,error_message=%s,finished_at=now() WHERE migration_run_id=%s",(step,str(exc),run_id))
        if directory and registered and rollback_ok:
            try:
                with pg.cursor() as cur:
                    report(cur,run_id,directory)
            except Exception as report_exc:
                # An extraction/initialization failure may precede disposition
                # creation. Never replace the original actionable failure.
                (directory/"report_failure.txt").write_text(str(report_exc)+"\n")
        if directory:
            diagnostics.write_json(directory/'failure.json',dict(run_id=run_id,step=step,**diagnostics.exception(exc)))
        if directory:
            diagnostics.export_owner_events(directory)
        print(f"[migration] FAILED run_id={run_id} step={step}; see private failure.json/events.jsonl",file=sys.stderr,flush=True)
        return 1
    finally:
        pg.close()  # also releases session advisory lock


def entrypoint():
    os.umask(0o077)
    try:
        return main()
    except (Exception, KeyboardInterrupt) as exc:
        # Configuration/connection failures may precede both migration.run and
        # a PostgreSQL transaction. They still need a private, durable report.
        try:
            run_id=str(uuid.UUID(os.environ.get('RUN_ID','')))
        except ValueError:
            run_id=str(uuid.uuid4())
        directory=Path(os.getenv('MIGRATION_LOG_DIR',str(HERE/'runs')))/run_id
        diagnostics.write_json(directory/'failure.json',dict(run_id=run_id,step='bootstrap_or_reporting',
                                                             **diagnostics.exception(exc)))
        print(f'[migration] FAILED run_id={run_id}; see private failure.json',file=sys.stderr)
        return 130 if isinstance(exc,KeyboardInterrupt) else 1


if __name__=="__main__":
    sys.exit(entrypoint())
