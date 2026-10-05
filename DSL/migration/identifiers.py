"""Preserve document identity independently of new database surrogate keys."""
import re
from psycopg2 import sql

TABLES = {
    'good_repute_form': 'form_number', 'foreign_violation_form': 'form_number',
    'vehicle_technical_form': 'sub_form_number', 'trailer_technical_form': 'sub_form_number',
    'sp_driver_form': 'sub_form_number', 'sp_teammate_form': 'sub_form_number',
    'kv_form': 'sub_form_number', 'adr_form': 'sub_form_number',
}


def split_number(code, version):
    # No trimming, truncation, renumbering or inferred revision is permitted.
    match = re.fullmatch(r'([A-Za-z]+-[0-9]{4}-[0-9]+)/([1-9][0-9]*)', code or '')
    if not match or not isinstance(version, int) or version < 1:
        raise ValueError('Missing/unsupported source FormCode or inconsistent FormVersion; document identity requires review')
    return match[1], int(match[2])


def preserve(cur, run_id):
    cur.execute("""SELECT l.legacy_id,l.target_table,l.target_key,f.form_code,f.form_version
        FROM migration.form_link l LEFT JOIN staging.raw_control_form f ON f.id::text=l.legacy_id
        WHERE l.migration_run_id=%s AND l.legacy_source='ControlForm'
          AND l.target_table<>'forms.compound_form'
        ORDER BY l.legacy_id,l.target_table""", (run_id,))
    for legacy_id, target, key, code, version in cur.fetchall():
        table = target.removeprefix('forms.')
        if table not in TABLES:
            raise ValueError('Unsupported target for source document identity: '+target)
        try:
            number, version = split_number(code, version)
        except ValueError as exc:
            raise ValueError(f'ControlForm:{legacy_id}: {exc}') from exc
        column = TABLES[table]
        # Let the DB reject overlength values. Never use target_text's truncation.
        cur.execute(sql.SQL('UPDATE forms.{} SET {}=%s,version=%s WHERE {}=%s').format(
            sql.Identifier(table), sql.Identifier(column), sql.Identifier(table+'_key')),
            (number,version,key))
        if cur.rowcount != 1:
            raise ValueError(f'ControlForm:{legacy_id}: expected exactly one imported snapshot')
        cur.execute("""UPDATE migration.form_link SET target_form_number=%s
            WHERE migration_run_id=%s AND legacy_source='ControlForm' AND legacy_id=%s AND target_table=%s""",
            (number,run_id,legacy_id,target))


def mismatches(cur):
    result = []
    for table, column in TABLES.items():
        cur.execute(sql.SQL("""SELECT count(*) FROM migration.form_link l
            JOIN staging.raw_control_form f ON f.id::text=l.legacy_id
            JOIN forms.{} t ON t.{}=l.target_key
            WHERE l.legacy_source='ControlForm' AND l.target_table=%s
              AND (f.form_code IS DISTINCT FROM t.{} || '/' || t.version::text
)""").format(
                sql.Identifier(table),sql.Identifier(table+'_key'),sql.Identifier(column)),('forms.'+table,))
        n=cur.fetchone()[0]
        if n:
            result.append({'check':'source_document_identity_changed','table':table,'count':n})
    return result


def reserve_numbers(cur):
    # App inserts derive document numbers from logical-key sequences. Preserve
    # imported numbers and advance, never rewind, those sequences past their suffix.
    # Call only after validation, immediately before commit. PostgreSQL sequence
    # advances survive rollback; a failed commit may leave harmless gaps.
    for table,column in TABLES.items():
        cur.execute(sql.SQL("SELECT max(substring({} from '-([0-9]+)$')::bigint) FROM forms.{}").format(
            sql.Identifier(column),sql.Identifier(table)))
        maximum=cur.fetchone()[0]
        if maximum is None:
            continue
        sequence='forms.seq_'+table+'_key'
        cur.execute(sql.SQL('SELECT last_value,is_called FROM {}.{}').format(
            sql.Identifier('forms'),sql.Identifier('seq_'+table+'_key')))
        value,called=cur.fetchone()
        if maximum > value or (maximum == value and not called):
            cur.execute('SELECT setval(%s::regclass,%s,true)',(sequence,maximum))


def preflight(cur, run_id):
    """Report every ambiguous source identity before allocating target records.

    Display suffix and FormVersion are independent: original metadata remains in migration source evidence, not an application history archive.
    Two source IDs sharing one target number require a history/identity decision.
    """
    cur.execute("""SELECT f.id,f.form_code,f.form_version,d.target_table
        FROM staging.raw_control_form f JOIN migration.disposition d
          ON d.legacy_source='ControlForm' AND d.legacy_id=f.id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible' ORDER BY f.id""", (run_id,))
    bases = {}
    findings = []
    for form_id, code, version, target in cur.fetchall():
        match = re.fullmatch(r'([A-Za-z]+-[0-9]{4}-[0-9]+)/([1-9][0-9]*)', code or '')
        if not match:
            findings.append((form_id, 'invalid_source_document_number',
                             'Source FormCode has unsupported syntax; no automatic renumbering'))
            continue
        base, revision = match.groups()
        bases.setdefault((target, base), []).append(form_id)
        if not isinstance(version, int) or version < 1:
            findings.append((form_id, 'invalid_source_form_version',
                             'Source FormVersion is absent or invalid; original retained'))
        elif int(revision) != version:
            findings.append((form_id, 'source_document_revision_conflict',
                             'FormCode revision differs from FormVersion; both originals retained in source_snapshot'))
    for (target, base), ids in bases.items():
        if len(ids) > 1:
            for form_id in ids:
                findings.append((form_id, 'source_document_number_collision',
                    f'{len(ids)} source forms share a base number in {target}; resolve identity/history before import'))
    for form_id, issue, detail in findings:
        severity = 'warning' if issue == 'source_document_revision_conflict' else 'blocker'
        cur.execute('INSERT INTO migration.finding VALUES (%s,%s,\'ControlForm\',%s,%s,%s)',
                    (run_id, severity, str(form_id), issue, detail))
