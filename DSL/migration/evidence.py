"""Durable checksums of extracted source rows, independent of target row counts.
Checksums detect accidental loss/change; they are not a signed audit log.
"""
from psycopg2 import sql


def record(cur, run_id, table, key):
    # Calculate from staging, not from the destination snapshot being checked.
    cur.execute(sql.SQL('''INSERT INTO migration.source_manifest
        SELECT %s,%s,count(*),md5(coalesce(string_agg(
          md5({key}::text || ':' || to_jsonb(t)::text),'' ORDER BY {key}::text COLLATE "C"),''))
        FROM staging.{table} t''').format(key=sql.Identifier(key),table=sql.Identifier(table)),(run_id,table))


def mismatches(cur, run_id, expected_tables):
    cur.execute("SELECT to_regclass('migration.source_manifest')")
    if cur.fetchone()[0] is None:
        return [{'check':'source_manifest_missing','count':len(expected_tables)}]
    cur.execute('SELECT source_table,row_count,content_md5 FROM migration.source_manifest WHERE migration_run_id=%s',(run_id,))
    expected={table:(count,digest) for table,count,digest in cur.fetchall()}
    cur.execute('''SELECT source_table,count(*),md5(coalesce(string_agg(
        md5(source_key || ':' || payload::text),'' ORDER BY source_key COLLATE "C"),''))
        FROM migration.source_snapshot WHERE migration_run_id=%s GROUP BY source_table''',(run_id,))
    actual={table:(count,digest) for table,count,digest in cur.fetchall()}
    problems=[]
    for table in sorted(set(expected_tables)|set(expected)|set(actual)):
        if table not in expected or table not in expected_tables:
            problems.append({'check':'source_manifest_missing_or_unexpected','table':table})
        elif actual.get(table,(0,'d41d8cd98f00b204e9800998ecf8427e'))!=expected[table]:
            problems.append({'check':'source_snapshot_changed','table':table,
                             'expected_rows':expected[table][0],'actual_rows':actual.get(table,(0,None))[0]})
    # Verify the working source too: removing the application archive must not
    # hide changes to staging inputs used by transforms and enrichment.
    for table in expected_tables:
        if table not in expected:
            continue
        key = 'raven_id' if table == 'raw_job_inspection' else 'id'
        cur.execute(sql.SQL('''SELECT count(*),md5(coalesce(string_agg(
            md5({key}::text || ':' || to_jsonb(t)::text),'' ORDER BY {key}::text COLLATE "C"),''))
            FROM staging.{table} t''').format(key=sql.Identifier(key),table=sql.Identifier(table)))
        if cur.fetchone() != expected[table]:
            problems.append({'check':'source_staging_changed','table':table})
    return problems


def day_count_mismatches(cur):
    """A valid canonical source text count must survive the enrichment step.
    This specifically guards against falling back to stale IntValue or zero.
    Ambiguous/malformed inputs remain separate preflight/quality findings.
    """
    problems=[]
    for table in ('sp_driver_form','sp_teammate_form'):
        cur.execute(sql.SQL('''SELECT k.column_name,count(DISTINCT l.legacy_id)
            FROM migration.form_link l
            JOIN forms.{table} t ON t.{key}=l.target_key
            JOIN staging.raw_control_form_value v ON v.control_form_id::text=l.legacy_id
            JOIN (VALUES ('days_count','checked_days_count'),('workdays_count','work_days_count'),
                         ('sick_workdays_count','other_activity_days_count')) k(source_key,column_name)
              ON k.source_key=v.classifier_name
            WHERE l.legacy_source='ControlForm' AND l.target_table=%s
              AND migration.safe_nonnegative_int(btrim(v.value)) IS NOT NULL
              AND (to_jsonb(t)->>k.column_name)::integer IS DISTINCT FROM migration.safe_nonnegative_int(btrim(v.value))
            GROUP BY k.column_name''').format(table=sql.Identifier(table),key=sql.Identifier(table+'_key')),('forms.'+table,))
        for column,count in cur.fetchall():
            problems.append({'check':'source_day_count_changed','table':table,'column':column,'count':count})
    return problems
