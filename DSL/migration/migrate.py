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
from datetime import date

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor, execute_values

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "extract"))
from config import connect_target, required
import enrich

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
    for form_type,(marker,primary,secondary) in SUBTYPES.items():
        if path.name.startswith('04-' if primary=='vehicle_technical_form' else '05-'):
            predicate=f"migration.is_subtype(cf.id, '{marker}')"
            text=text.replace(f"cf.form_type_name = '{form_type}'",f"cf.form_type_name = '{form_type}' AND "+('' if subtype else 'NOT ')+predicate)
            if subtype:
                text=text.replace(primary,secondary)
    # Only two psql literals are supported; SQL files are version-controlled.
    text = text.replace(":'run_id'", cur.mogrify("%s", (run_id,)).decode())
    text = text.replace(":'cutoff_from'", cur.mogrify("%s", (cutoff,)).decode())
    for name in re.findall(r"CREATE TEMP TABLE (\w+)", text):
        cur.execute(sql.SQL("DROP TABLE IF EXISTS pg_temp.{}").format(sql.Identifier(name)))
    cur.execute(text)


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
            FROM staging.raw_versions x WHERE x.table_name='ControlForm' AND x.row_id=cf.id) a ON true
        UNION ALL SELECT CASE schema_version WHEN 1 THEN 'RavenDB.JobInspection' ELSE 'RavenDB.JobInspectionV2' END,
          raven_id, md5(document_json::text) FROM staging.raw_job_inspection;
        CREATE UNIQUE INDEX ON source_fingerprint(source,legacy_id);
    """)


def snapshot(cur, run_id):
    for table in RAW_TABLES:
        key = "raven_id" if table == "raw_job_inspection" else "id"
        cur.execute(sql.SQL("INSERT INTO migration.source_snapshot SELECT %s,%s,{}::text,to_jsonb(t) FROM staging.{} t")
                    .format(sql.Identifier(key), sql.Identifier(table)), (run_id, table))
    fingerprint_sources(cur)


def preflight(cur, run_id, cutoff):
    cur.execute("""CREATE TABLE IF NOT EXISTS migration.disposition (
        migration_run_id uuid NOT NULL REFERENCES migration.run,
        legacy_source text NOT NULL, legacy_id text NOT NULL, form_type text,
        reason text NOT NULL, target_table text,
        PRIMARY KEY(migration_run_id,legacy_source,legacy_id))""")
    cur.execute("CREATE TEMP TABLE type_mapping (form_type text PRIMARY KEY, target_table text)")
    execute_values(cur, "INSERT INTO type_mapping VALUES %s", [(k, "forms."+v) for k,v in TARGETS.items()])
    cur.execute("""INSERT INTO migration.disposition
        SELECT %s,'ControlForm',cf.id::text,cf.form_type_name,
        CASE WHEN cf.control_stage IS NULL OR cf.control_stage NOT IN ('Confirmed','Published','Saved','Deleted','ERROR') THEN 'unknown_status'
             WHEN cf.control_stage NOT IN ('Confirmed','Published') THEN 'excluded_status'
             WHEN cf.created_date IS NULL THEN 'missing_scope_date'
             WHEN cf.created_date < %s::date THEN 'excluded_before_cutoff'
             WHEN cf.form_type_name='FuelSample' THEN 'excluded_fuel_sample'
             WHEN m.target_table IS NULL THEN 'unsupported_form_type'
             ELSE 'eligible' END, m.target_table
        FROM staging.raw_control_form cf LEFT JOIN type_mapping m ON m.form_type=cf.form_type_name""", (run_id,cutoff))
    for form_type,(marker,primary,secondary) in SUBTYPES.items():
        cur.execute("""UPDATE migration.disposition d SET target_table=%s
            WHERE migration_run_id=%s AND legacy_source='ControlForm' AND form_type=%s
              AND migration.is_subtype(d.legacy_id::bigint,%s)""",('forms.'+secondary,run_id,form_type,marker))
    cur.execute("""INSERT INTO migration.disposition
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

    finding("scope_unresolved", "Cannot determine eligibility/target; resolve before cutover",
        "SELECT legacy_source source,legacy_id FROM migration.disposition WHERE migration_run_id=%s AND reason IN ('missing_scope_date','unknown_status','unsupported_form_type')", (run_id,))
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
    finding("masked_source_value", "Source contains a masking placeholder; original personal/business value cannot be reconstructed",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
        FROM staging.raw_control_form_value v JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=v.control_form_id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND btrim(v.value) ~ '^\\*{3,}$'""", (run_id,))
    finding("invalid_required_date", "GoodRepute birth/certificate date is absent, masked or invalid; rehearsal substitute is not actual source data",
        """SELECT DISTINCT 'ControlForm' source,d.legacy_id FROM migration.disposition d
        CROSS JOIN (VALUES ('Driver.Birthdate'),('AmetialasePadevuseTunnistuseValjaandmiseKuupaev')) k(name)
        WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type='GoodRepute'
        AND NOT EXISTS (SELECT 1 FROM staging.raw_control_form_value v WHERE v.control_form_id::text=d.legacy_id
          AND v.classifier_name=k.name AND coalesce(v.date_value,migration.safe_timestamp(v.value)) IS NOT NULL)""",(run_id,))

    # Business mappings are not inferred from sample counts. These known gaps
    # block production, even if every INSERT and row-count check succeeds.
    gaps = {
        "kv_form": "Options/legal_bases, identity fields and parent grouping mapping incomplete",
        "foreign_violation_form": "Violations and reporting authority mapping incomplete",
        "vehicle_technical_form": "Trailer routing, defects, decisions and compound grouping mapping incomplete",
        "sp_driver_form": "Driver/teammate routing, identities, violations, decisions and grouping mapping incomplete",
        "adr_form": "Goods, infringements, parties, decisions and grouping mapping incomplete",
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
        finding("unmapped_eav", "Unconsumed EAV fields retained in source_snapshot; inspect field coverage before cutover",
            """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
                FROM staging.raw_control_form_value v JOIN migration.disposition d
                ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
                WHERE d.migration_run_id=%s AND d.reason='eligible' AND d.form_type=%s
                  AND (v.classifier_name IS NULL OR NOT (v.classifier_name=ANY(%s)))""", (run_id,form_type,keys))
    finding("unsupported_subtype", "Subtype marker is not an explicit true/1; ambiguous legacy presence semantics need review",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
            FROM staging.raw_control_form_value v JOIN migration.disposition d
            ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
            WHERE d.migration_run_id=%s AND d.reason='eligible'
              AND lower(btrim(coalesce(v.value,''))) NOT IN ('true','1')
              AND ((d.form_type='RoadControlCard2012' AND v.classifier_name='RoadControlTrailer')
                OR (d.form_type='Roadworthiness2012' AND v.classifier_name='RoadWorthinessTeamMember'))""", (run_id,))
    finding("invalid_time", "Invalid clock time becomes NULL/00:00 only in rehearsal; review source snapshot",
        """SELECT DISTINCT 'ControlForm' source,v.control_form_id::text legacy_id
            FROM staging.raw_control_form_value v JOIN migration.disposition d
            ON d.legacy_id=v.control_form_id::text AND d.legacy_source='ControlForm'
            WHERE d.migration_run_id=%s AND d.reason='eligible' AND v.classifier_name='InspectionDate.Time'
              AND migration.safe_time(v.value) IS NULL""", (run_id,))
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
                CASE j.schema_version WHEN 1 THEN j.document_json->>'kontrolli_kp' ELSE j.document_json->>'InspectionDate' END)::date>CURRENT_DATE""", (run_id,run_id))
    cur.execute("SELECT count(*) FROM migration.disposition WHERE migration_run_id=%s", (run_id,))
    if cur.fetchone()[0] == 0:
        finding("empty_source", "No source forms/documents extracted; verify source identity and cutoff", "SELECT 'all' source,'*' legacy_id")
    return rows(cur, "SELECT severity,issue,count(*) AS count FROM migration.finding WHERE migration_run_id=%s GROUP BY 1,2 ORDER BY 1,2", (run_id,))


def check_integrity(cur, run_id, require_coverage=True):
    problems = []
    if require_coverage:
        missing = rows(cur, """SELECT d.legacy_source,d.legacy_id,d.target_table
            FROM migration.disposition d WHERE d.migration_run_id=%s AND d.reason='eligible'
            AND NOT EXISTS (SELECT 1 FROM migration.form_link f WHERE f.legacy_source=d.legacy_source
              AND f.legacy_id=d.legacy_id AND f.target_table=d.target_table)""", (run_id,))
        if missing:
            problems.append({"check":"missing_target_links","count":len(missing),"examples":missing[:20]})
    for table in ALL_TARGETS:
        target = "forms."+table
        key = table+"_key"
        number = "sub_form_number" if table in CHILDREN else "form_number"
        cur.execute(sql.SQL("""SELECT count(*) FROM migration.form_link f WHERE f.target_table=%s AND NOT EXISTS (
            SELECT 1 FROM forms.{} t WHERE t.{}=f.target_key AND t.{}=f.target_form_number)""")
            .format(sql.Identifier(table),sql.Identifier(key),sql.Identifier(number)), (target,))
        n=cur.fetchone()[0]
        if n: problems.append({"check":"dangling_target_link","table":table,"count":n})
        cur.execute(sql.SQL("SELECT count(*) FROM (SELECT {} FROM forms.{} GROUP BY {} HAVING count(DISTINCT {})>1) x")
                    .format(sql.Identifier(number),sql.Identifier(table),sql.Identifier(number),sql.Identifier(key)))
        n=cur.fetchone()[0]
        if n: problems.append({"check":"duplicate_form_number","table":table,"count":n})
        cur.execute(sql.SQL("SELECT count(*) FROM (SELECT {} FROM forms.{} GROUP BY {} HAVING count(DISTINCT {})>1) x")
                    .format(sql.Identifier(key),sql.Identifier(table),sql.Identifier(key),sql.Identifier(number)))
        n=cur.fetchone()[0]
        if n: problems.append({"check":"logical_key_has_multiple_numbers","table":table,"count":n})
        if table in CHILDREN:
            cur.execute(sql.SQL("""SELECT count(*) FROM forms.{} t JOIN migration.form_link f
                ON f.target_table=%s AND f.target_key=t.{}
                WHERE NOT EXISTS (SELECT 1 FROM forms.compound_form p WHERE p.compound_form_key=t.compound_form_key)
                   OR NOT EXISTS (SELECT 1 FROM migration.form_link p WHERE p.legacy_source=f.legacy_source
                     AND p.legacy_id=f.legacy_id AND p.target_table='forms.compound_form' AND p.target_key=t.compound_form_key)""")
                    .format(sql.Identifier(table),sql.Identifier(key)), (target,))
            n=cur.fetchone()[0]
            if n: problems.append({"check":"missing_parent","table":table,"count":n})
    duplicates=rows(cur,"SELECT target_table,target_key,count(*) FROM migration.form_link WHERE target_table<>'forms.compound_form' GROUP BY 1,2 HAVING count(*)>1")
    if duplicates: problems.append({"check":"duplicate_target_link","examples":duplicates[:20]})
    split = rows(cur,"""SELECT b.control_id,count(DISTINCT f.target_key) AS parents
        FROM staging.raw_control_to_form_binding b JOIN staging.raw_control c ON c.id=b.control_id
        JOIN migration.form_link f ON f.legacy_source='ControlForm' AND f.legacy_id=b.control_form_id::text
          AND f.target_table='forms.compound_form'
        GROUP BY b.control_id HAVING count(DISTINCT f.target_key)>1""")
    if split: problems.append({"check":"split_compound_control","count":len(split)})
    merged = rows(cur,"""SELECT f.target_key FROM migration.form_link f
        LEFT JOIN LATERAL (SELECT min(b.control_id) AS control_id
          FROM staging.raw_control_to_form_binding b JOIN staging.raw_control c ON c.id=b.control_id
          WHERE b.control_form_id::text=f.legacy_id) p ON true
        WHERE f.legacy_source='ControlForm' AND f.target_table='forms.compound_form'
        GROUP BY f.target_key HAVING count(DISTINCT coalesce('control:'||p.control_id::text,'form:'||f.legacy_id))>1""")
    if merged: problems.append({"check":"unrelated_controls_merged","count":len(merged)})
    return problems


def state_signature(cur):
    # Compare complete rows (including quality findings), not just INSERT's count.
    result=[]
    for table in ["forms."+t for t in ALL_TARGETS]+["migration.form_link","migration.quality_report"]:
        cur.execute(sql.SQL("SELECT count(*), md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),'') ) FROM {} t")
                    .format(sql.Identifier(*table.split('.'))) if table != "migration.form_link" else
                    "SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY legacy_source,legacy_id,target_table),'')) FROM migration.form_link t")
        result.append(cur.fetchone())
    return result


def report(cur, run_id, directory, problems=None):
    output={"run":rows(cur,"SELECT * FROM migration.run WHERE migration_run_id=%s",(run_id,)),
        "linked_runs":rows(cur,"""SELECT DISTINCT r.migration_run_id,r.status,r.mode FROM migration.run r
          JOIN migration.form_link f ON f.migration_run_id=r.migration_run_id ORDER BY r.migration_run_id"""),
        "inherited_findings":rows(cur,"""SELECT severity,issue,count(*) FROM migration.finding
          WHERE migration_run_id<>%s AND migration_run_id IN (SELECT DISTINCT migration_run_id FROM migration.form_link)
          GROUP BY 1,2 ORDER BY 1,2""",(run_id,)),
        "dispositions":rows(cur,"SELECT form_type,reason,count(*) FROM migration.disposition WHERE migration_run_id=%s GROUP BY 1,2 ORDER BY 1,2",(run_id,)),
        "findings":rows(cur,"SELECT severity,issue,count(*) FROM migration.finding WHERE migration_run_id=%s GROUP BY 1,2 ORDER BY 1,2",(run_id,)),
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
    (directory/"summary.json").write_text(json.dumps(output,ensure_ascii=False,indent=2,default=str)+"\n")
    for table in ("finding","disposition","quality_report"):
        with (directory/(table+".csv")).open("w") as f:
            query=cur.mogrify("SELECT * FROM migration."+table+" WHERE migration_run_id=%s",(run_id,)).decode()
            cur.copy_expert("COPY ("+query+") TO STDOUT WITH CSV HEADER",f)
    print(json.dumps({"run_id":run_id,"report":str(directory/"summary.json"),"findings":output["findings"],"integrity_problems":problems or []},ensure_ascii=False),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
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
                    result=subprocess.run([sys.executable,str(HERE/"extract"/name)],stdout=log,stderr=subprocess.STDOUT)
                if result.returncode: raise RuntimeError(f"{name} failed (exit {result.returncode}); see {directory / (name+'.log')}")
            step="snapshot_and_preflight"
            # One transaction for evidence creation; extraction counts are already verified.
            pg.autocommit=False
            snapshot(cur,run_id)
            findings=preflight(cur,run_id,cutoff)
            pg.commit()
            pg.autocommit=True
            blocked=any(f["severity"]=="blocker" for f in findings)
            fatal=any(f["issue"] in {"multivalue_scalar","source_changed","linked_source_missing","linked_scope_changed","source_configuration_changed","unsupported_subtype","mapping_code_changed","unmapped_fitness"} for f in findings)
            existing_problems=check_integrity(cur,run_id,require_coverage=False)
            if fatal or existing_problems or (blocked and not args.rehearsal):
                cur.execute("UPDATE migration.run SET status='blocked',current_step=%s,finished_at=now() WHERE migration_run_id=%s",(step,run_id))
                report(cur,run_id,directory,existing_problems)
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
                execute_file(cur,path,run_id,cutoff)
                if path.name.startswith(('04-','05-')): execute_file(cur,path,run_id,cutoff,subtype=True)
            step="enrich_and_group"
            enrich.apply(cur,run_id,CHILDREN)
            cur.execute("""UPDATE migration.form_link f SET source_fingerprint=s.fingerprint
                FROM source_fingerprint s WHERE f.legacy_source=s.source AND f.legacy_id=s.legacy_id AND f.migration_run_id=%s""",(run_id,))
            cur.execute("""UPDATE migration.form_link f SET legacy_form_code=cf.form_code
                FROM staging.raw_control_form cf WHERE f.legacy_source='ControlForm' AND f.legacy_id=cf.id::text AND f.migration_run_id=%s""",(run_id,))
            if not args.no_recheck:
                step="idempotency"
                before=state_signature(cur)
                for path in transforms:
                    execute_file(cur,path,run_id,cutoff)
                    if path.name.startswith(('04-','05-')): execute_file(cur,path,run_id,cutoff,subtype=True)
                if before!=state_signature(cur): raise RuntimeError("Idempotency check changed target/link/quality rows")
            step="verification"
            problems=check_integrity(cur,run_id)
            if problems: raise RuntimeError("Integrity verification failed: "+json.dumps(problems))
            # Owner-approved missing text is explicit and auditable. No blanket bypass.
            cur.execute("""UPDATE migration.quality_report SET approval_basis='owner-approved-missing-text-2026-09-23'
                WHERE migration_run_id=%s AND migration.approved_text_default(
                    target_table,column_name,issue,applied_default,raw_value)""",(run_id,))
            cur.execute("SELECT count(*) FROM migration.quality_report WHERE migration_run_id=%s AND approval_basis IS NULL",(run_id,))
            unapproved_quality=cur.fetchone()[0]>0
            cur.execute("SELECT EXISTS (SELECT 1 FROM migration.finding WHERE migration_run_id=%s AND severity='blocker')",(run_id,))
            review=cur.fetchone()[0] or unapproved_quality or args.rehearsal
            if review and not args.rehearsal: raise RuntimeError("Unapproved quality substitutions; production transaction rolled back")
            cur.execute("UPDATE migration.run SET status=%s,current_step='complete',finished_at=now() WHERE migration_run_id=%s",("needs_review" if review else "succeeded",run_id))
            pg.commit()
            pg.autocommit=True
            report(cur,run_id,directory)
            return 2 if review else 0
    except BaseException as exc:
        pg.rollback()
        pg.autocommit=True
        if registered:
            with pg.cursor() as cur:
                cur.execute("UPDATE migration.run SET status='failed',current_step=%s,error_message=%s,finished_at=now() WHERE migration_run_id=%s",(step,str(exc),run_id))
        if directory:
            (directory/"failure.json").write_text(json.dumps({"run_id":run_id,"step":step,"error":str(exc)},ensure_ascii=False,indent=2)+"\n")
        print(f"[migration] FAILED run_id={run_id} step={step}: {exc}",file=sys.stderr,flush=True)
        return 1
    finally:
        pg.close()  # also releases session advisory lock


if __name__=="__main__":
    sys.exit(main())
