"""Private, durable diagnostics independent of the target transaction.

Events describe attempts until a run_outcome event says committed. An aborted
attempt must never be confused with a successful import. Files contain source
values: owner-only permissions, never publish or commit them.
"""
import csv
import hashlib
import json
import os
import re
from collections import defaultdict
from pathlib import Path
from psycopg2 import sql

_journal = None


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(path.suffix + '.tmp')
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, default=str)
        f.write('\n'); f.flush(); os.fsync(f.fileno())
    temporary.replace(path)


def records(cur, query, params=()):
    cur.execute(query, params)
    names = [c[0] for c in cur.description]
    return [dict(zip(names, row)) for row in cur.fetchall()]


class Journal:
    def __init__(self, directory, run_id):
        self.directory, self.run_id = Path(directory), run_id
        self.seen = set()
        self.step = 'initialization'
        self.form_numbers = {}

    def emit(self, kind, **data):
        if data.get('legacy_source') == 'ControlForm' or kind=='owner_decision':
            data.setdefault('source_form_number',self.form_numbers.get(str(data.get('legacy_id'))))
        event = dict(run_id=self.run_id, step=self.step, event=kind, **data)
        body = json.dumps(event, ensure_ascii=False, default=str, sort_keys=True)
        identity = {k:v for k,v in event.items() if k != 'step'} if kind in (
            'finding','quality_report','owner_decision','target_update_attempt') else event
        key = hashlib.sha256(json.dumps(identity,ensure_ascii=False,default=str,sort_keys=True).encode()).hexdigest()
        if key in self.seen:
            return
        fd = os.open(self.directory / 'events.jsonl', os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        with os.fdopen(fd, 'a', encoding='utf-8') as f:
            f.write(body + '\n'); f.flush(); os.fsync(f.fileno())
        self.seen.add(key)


def start(directory, run_id):
    global _journal
    _journal = Journal(directory, run_id)


def emit(kind, **data):
    if _journal is not None:
        _journal.emit(kind, **data)


def owner(form_id, field, before, after, rule, **context):
    emit('owner_decision', legacy_source='ControlForm', legacy_id=str(form_id),
         field=field, before=before, after=after, approval_basis=rule,
         application_state='attempted', **context)


def exception(exc):
    result = {'type': type(exc).__name__, 'message': str(exc)}
    if getattr(exc, 'diag', None):
        result['postgres'] = {key: getattr(exc.diag, key, None) for key in (
            'sqlstate', 'message_primary', 'message_detail', 'message_hint',
            'schema_name', 'table_name', 'column_name', 'constraint_name',
            'context', 'statement_position')}
    return result


FINDING_COLUMNS = ['migration_run_id', 'severity', 'legacy_source', 'legacy_id',
                   'source_form_number', 'issue', 'field', 'raw_value', 'reason',
                   'context', 'detail']


def detailed_findings(cur, run_id):
    """Attach source evidence to diagnostics only; never alter stored findings.

    Keep the original detail and selection intact. In particular, a missing
    value is different from an empty value or multiple EAV rows. Batch reads
    avoid a query per finding on historical datasets.
    """
    data = records(cur, '''SELECT f.*,s.form_code AS source_form_number
        FROM migration.finding f LEFT JOIN staging.raw_control_form s
          ON f.legacy_source='ControlForm' AND s.id::text=f.legacy_id
        WHERE f.migration_run_id=%s ORDER BY f.legacy_source,f.legacy_id,f.issue''', (run_id,))
    supported = {'source_document_number_collision', 'oversized_source_text',
                 'unresolved_owner_group', 'unresolved_approved_proceeding',
                 'unmapped_control_result'}
    selected = [r for r in data if r['issue'] in supported and r['legacy_source']=='ControlForm']
    # Older findings store the binding-conflict ID only in this exact message.
    # Resolve it for the export without rewriting the original DB record.
    for row in selected:
        if row['issue']=='unresolved_owner_group' and row['legacy_id']=='*':
            match = re.fullmatch(r'ControlForm:(\d+): multiple control bindings', row['detail'])
            if match:
                row['recorded_legacy_id'] = row['legacy_id']
                row['legacy_id'] = match[1]
    ids = sorted({int(r['legacy_id']) for r in selected if r['legacy_id'].isdigit()})
    forms, groups, values, bindings = {}, defaultdict(list), defaultdict(list), defaultdict(list)
    if ids:
        for form in records(cur, '''SELECT s.id::text AS legacy_id,s.form_code AS source_form_number,
            s.form_version,s.control_stage,s.controlled_date,d.target_table,d.reason AS selection_reason
            FROM staging.raw_control_form s JOIN migration.disposition d
              ON d.legacy_source='ControlForm' AND d.legacy_id=s.id::text
            WHERE d.migration_run_id=%s ORDER BY s.id''', (run_id,)):
            forms[form['legacy_id']] = form
            if form['selection_reason']=='eligible' and re.fullmatch(
                    r'[A-Za-z]+-[0-9]{4}-[0-9]+/[1-9][0-9]*', form['source_form_number'] or ''):
                groups[(form['target_table'], (form['source_form_number'] or '').split('/')[0])].append(form)
        for value in records(cur, '''SELECT control_form_id::text AS legacy_id,id AS source_row_id,
            classifier_name AS field,value AS raw_value,date_value,int_value
            FROM staging.raw_control_form_value WHERE control_form_id=ANY(%s) ORDER BY id''', (ids,)):
            values[value.pop('legacy_id')].append(value)
        for binding in records(cur, '''SELECT b.control_form_id::text AS legacy_id,
            b.id AS binding_id,b.control_id,(c.id IS NOT NULL) AS control_exists
            FROM staging.raw_control_to_form_binding b LEFT JOIN staging.raw_control c ON c.id=b.control_id
            WHERE b.control_form_id=ANY(%s) ORDER BY b.id''', (ids,)):
            bindings[binding.pop('legacy_id')].append(binding)
    for row in data:
        row['reason'] = row['detail']
        row['field'], row['raw_value'], row['context'] = None, None, {}
        try:
            detail = json.loads(row['detail'])
        except (ValueError, TypeError):
            detail = None
        if isinstance(detail, dict):
            row['field'] = detail.get('field')
            row['raw_value'] = detail.get('raw_value', detail.get('before'))
            row['reason'] = detail.get('reason', detail.get('action', row['detail']))
            row['context'] = detail
        if row['issue'] not in supported or row['legacy_source']!='ControlForm':
            continue
        form = forms.get(row['legacy_id'], {})
        row['source_form_number'] = form.get('source_form_number', row['source_form_number'])
        context = {**form}
        if 'recorded_legacy_id' in row:
            context['recorded_legacy_id'] = row.pop('recorded_legacy_id')
        source = values[row['legacy_id']]
        issue = row['issue']
        if issue=='source_document_number_collision':
            row['field'], row['raw_value'] = 'FormCode', form.get('source_form_number')
            base = (form.get('source_form_number') or '').split('/')[0]
            context.update(base_number=base, conflicting_forms=groups[(form.get('target_table'), base)])
        elif issue=='oversized_source_text':
            match = re.fullmatch(r'(.+) exceeds target length (\d+); no silent truncation', row['detail'])
            if match:
                field, limit = match[1], int(match[2])
                offending = [{**v, 'actual_length': len(v['raw_value'])} for v in source
                             if v['field']==field and v['raw_value'] is not None and len(v['raw_value'])>limit]
                row['field'], row['raw_value'] = field, [v['raw_value'] for v in offending]
                context.update(target_max_length=limit, source_values=offending)
        elif issue=='unresolved_owner_group':
            row['field'] = 'ControlToFormBinding.ControlId'
            row['raw_value'] = sorted({b['control_id'] for b in bindings[row['legacy_id']] if b['control_exists']})
            context['bindings'] = bindings[row['legacy_id']]
        else:
            fields = ['otsus'] if issue=='unmapped_control_result' else ['otsus','otsus_vaarteomenetlus','rikkumine_muu']
            if issue=='unresolved_approved_proceeding':
                fields += sorted({v['field'] for v in source if (v['field'] or '').startswith('vm_joustunud_')})
                context['paragraph_fields_present'] = any((v['field'] or '').startswith('vm_joustunud_') for v in source)
            row['field'] = fields
            row['raw_value'] = {key: [v['raw_value'] for v in source if v['field']==key] for key in fields}
            context['missing_fields'] = [key for key in fields if not any(v['field']==key for v in source)]
            context['source_values'] = [v for v in source if v['field'] in fields]
        row['context'] = context
    return data


def checkpoint(cur, run_id, directory, phase):
    """Export observable transaction evidence BEFORE commit/rollback.

    SQL steps use a savepoint so an SQL error cannot leave the cursor aborted
    and prevent exporting all previously completed steps.
    """
    if _journal:
        _journal.step = phase
        cur.execute('SELECT id::text,form_code FROM staging.raw_control_form')
        _journal.form_numbers=dict(cur.fetchall())
    folder = Path(directory) / 'attempt'
    folder.mkdir(exist_ok=True, mode=0o700)
    for table in ('finding', 'quality_report', 'disposition'):
        cur.execute('SELECT to_regclass(%s)', ('migration.' + table,))
        if cur.fetchone()[0] is None:
            continue
        data = detailed_findings(cur, run_id) if table=='finding' else records(cur, 'SELECT t.*,f.form_code AS source_form_number FROM migration.' + table + ''' t
            LEFT JOIN staging.raw_control_form f ON t.legacy_source='ControlForm' AND f.id::text=t.legacy_id
            WHERE migration_run_id=%s''', (run_id,))
        write_json(folder / (table + '.json'), data)
        # The append-only journal also retains findings changed/removed later.
        for row in data:
            if table != 'disposition':
                # Row ids/timestamps are allocation details, not event identity.
                emit(table, **{k: v for k, v in row.items() if k not in ('id', 'created_at')})
    emit('checkpoint', application_state='uncommitted')


def write_csv(path, data, columns):
    temporary = Path(str(path) + '.tmp')
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        for row in data:
            w.writerow({k: json.dumps(v, ensure_ascii=False, default=str) if isinstance(v, (dict, list)) else v
                        for k, v in row.items()})
        f.flush(); os.fsync(f.fileno())
    temporary.replace(path)


def reconciliation(cur, run_id, targets):
    """One accountable outcome per extracted form, checking actual target rows.

    Compound parents are many-to-one, so they must not be added to the primary
    form count. Source tables, selection and target completeness are separate.
    """
    forms = records(cur, '''SELECT d.*,s.form_code AS source_form_number,
        l.target_key,l.target_form_number FROM migration.disposition d
        LEFT JOIN staging.raw_control_form s ON d.legacy_source='ControlForm' AND s.id::text=d.legacy_id
        LEFT JOIN migration.form_link l ON l.legacy_source=d.legacy_source AND l.legacy_id=d.legacy_id
          AND l.target_table=d.target_table WHERE d.migration_run_id=%s ORDER BY d.legacy_source,d.legacy_id''', (run_id,))
    actual = {}
    for table in targets:
        cur.execute(sql.SQL('SELECT DISTINCT {} FROM forms.{}').format(
            sql.Identifier(table + '_key'), sql.Identifier(table)))
        actual['forms.' + table] = {r[0] for r in cur.fetchall()}
    for row in forms:
        if row['reason'] != 'eligible':
            row['outcome'] = 'excluded_by_rule' if row['reason'].startswith('excluded_') else 'unresolved_selection'
        elif row['target_key'] is None:
            row['outcome'] = 'missing_target_link'
        elif row['target_key'] not in actual.get(row['target_table'], set()):
            row['outcome'] = 'missing_target_row'
        else:
            row['outcome'] = 'present_mapping_must_also_be_verified'
    return forms


def export_reconciliation(cur, run_id, directory, targets):
    data = reconciliation(cur, run_id, targets)
    columns = ['migration_run_id', 'legacy_source', 'legacy_id', 'form_type', 'reason', 'target_table',
               'inclusion_basis', 'source_form_number', 'target_key', 'target_form_number', 'outcome']
    write_csv(Path(directory) / 'reconciliation.csv', data, columns)
    summary = {}
    for row in data:
        key = row['form_type'] or 'unknown'
        counts = summary.setdefault(key, dict(extracted=0, eligible=0, present=0, excluded=0, unresolved=0, missing=0))
        counts['extracted'] += 1
        counts['eligible'] += row['reason'] == 'eligible'
        if row['outcome'].startswith('present_'): counts['present'] += 1
        elif row['outcome'] == 'excluded_by_rule': counts['excluded'] += 1
        elif row['outcome'] == 'unresolved_selection': counts['unresolved'] += 1
        else: counts['missing'] += 1
    return summary


def export_owner_events(directory):
    """Convenient before/after view; outcome is explicit for rolled-back runs."""
    directory=Path(directory)
    path=directory/'events.jsonl'
    if not path.exists():
        return
    events=[json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    outcome=next((e for e in reversed(events) if e['event']=='run_outcome'),{})
    choices=[]
    for event in events:
        if event['event']=='owner_decision':
            choices.append({**event,'run_outcome':outcome.get('outcome','in_progress'),
                            'target_transaction':outcome.get('target_transaction','not_confirmed')})
    write_json(directory/'owner-decisions.json',choices)
    columns=['legacy_id','source_form_number','affected_forms','field','target_table','target_key','target_field',
             'action','before','after','approval_basis','run_outcome','target_transaction']
    write_csv(directory/'owner-decisions.csv', [{k:row.get(k) for k in columns} for row in choices],columns)
