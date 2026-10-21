"""Environment-independent migration rules based on owner decisions.

Unknown chronology, identities and meanings still fail closed. These rules do
not approve arbitrary field truncation, time substitution or legal mappings.
"""
from collections import defaultdict
from datetime import datetime, date
import re

APPROVAL = "owner-2026-10-19"
SHARED_KEYS = set("""
InspectionDate.Date InspectionDate.Time InspectionAddress.Country
InspectionAddress.Region InspectionAddress.City InspectionAddress.Line1
InspectionAddress.Line2 InspectionAddress.HighwayKilometerNumber
Inspector.FirstName Inspector.LastName Inspector.AmetiisikuAndmed Inspector.Job
Vehicle.RegNo Vehicle.Country Vehicle.Mark Vehicle.Model Vehicle.VinCode
Vehicle.CarBodyType OdometerReading Company.RegistryNumber Company.CompanyName
Company.CompanyAddress.Country Company.CompanyAddress.City
Company.CompanyAddress.Line1 Company.CompanyAddress.PostalCode Company.TegevusloaNumber
""".split())
SHARED_KEYS.update(prefix + "." + field for prefix in ("Driver", "AdditionalDriver")
                   for field in ("IdentificationNo", "ForeignIdentificationNo", "FirstName",
                                 "LastName", "Citizenship", "BirthDate"))
SHARED_KEYS.update("Trailer." + field for field in ("RegNo", "Country", "Mark", "Model", "VinCode"))


def is_masked(value):
    """Recognize asterisk masks; don't classify ordinary words containing x."""
    return isinstance(value, str) and ("***" in value or (
        re.fullmatch(r'[xX. /-]+', value.strip()) is not None and
        sum(c.lower() == 'x' for c in value) >= 3))


def tachograph(value):
    return {
        "mehaaniline": "analogue", "mehhaaniline": "analogue", "analoog": "analogue",
        "digitaalne": "digital", "arukas": "smart_1", "smart_1": "smart_1",
        "smart_2": "smart_2", "arukas-2": "smart_2", "puudub": "missing",
    }.get((value or "").strip().lower())


def source_date(entries):
    result=set()
    for raw, typed, _ in entries:
        if is_masked(raw):
            result.add(None)
            continue
        value=typed
        if value is None and raw:
            for fmt in ('%Y-%m-%d','%d.%m.%Y','%Y.%m.%d','%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S'):
                try:
                    value=datetime.strptime(raw,fmt)
                    break
                except ValueError:
                    pass
        result.add(value.date() if isinstance(value,datetime) else value if isinstance(value,date) else None)
    if len(result)>1:
        raise ValueError('Conflicting typed dates')
    return next(iter(result),None)


def normalized_values(values):
    """Normalize roles before comparing the common driver fields."""
    teammate = any(str(v[0]).lower() in ("true", "1")
                   for v in values.get("RoadWorthinessTeamMember", []))
    result = defaultdict(list)
    for key, entries in values.items():
        if teammate and key and key.startswith("Driver."):
            key = "AdditionalDriver." + key[len("Driver."):]
        elif teammate and key and key.startswith("AdditionalDriver."):
            key = "Driver." + key[len("AdditionalDriver."):]
        result[key].extend(entries)
    return result


def resolve_shared(members, eav, modified, scalar):
    """Resolve only conflicting common fields, using an unambiguous latest card.

    A missing key is not an explicit deletion. Empty text on the latest card
    IS an explicit value and must not resurrect older data.
    """
    by_form = {i: normalized_values(eav[i]) for i in members}
    merged, choices = defaultdict(list), {}
    for values in by_form.values():
        for key, entries in values.items():
            merged[key].extend(entries)
    for key in SHARED_KEYS:
        present = {i: source_date(v[key]) if key in ('InspectionDate.Date','Driver.BirthDate','AdditionalDriver.BirthDate')
                   else scalar(v,key) for i,v in by_form.items() if key in v}
        if key == 'InspectionDate.Time':
            present = {i: re.sub(r'^(\d):',r'0\1:',value)[:5] if value and re.fullmatch(r'\d{1,2}:\d{2}(:00)?',value) else value for i,value in present.items()}
        if len(set(present.values())) < 2:
            if present and key in ('InspectionDate.Date','InspectionDate.Time','Driver.BirthDate','AdditionalDriver.BirthDate'):
                merged[key] = by_form[min(present)][key]
            continue
        if any(modified.get(i) is None for i in members):
            raise ValueError(f"{key}: missing modification timestamp")
        latest_time = max(modified[i] for i in members)
        latest = [i for i in members if modified[i] == latest_time]
        if any(i not in present for i in latest) or len({present[i] for i in latest}) != 1:
            raise ValueError(f"{key}: latest cards disagree or lack the field")
        chosen = min(latest)  # only after equal timestamps AND equal field values
        merged[key] = by_form[chosen][key]
        choices[key] = chosen
    return merged, choices


def source_context(cur, run_id):
    """Read only eligible source members; no drafts may win the latest-card rule."""
    cur.execute("""WITH eav_edits AS (
          SELECT control_form_id,max(updated_date) AS modified
          FROM staging.raw_control_form_value GROUP BY control_form_id
        ), form_edits AS (
          SELECT row_id,max(updated_time) AS modified FROM staging.raw_versions
          WHERE btrim(table_name,'[]')='ControlForm' GROUP BY row_id
        ) SELECT f.id,f.form_code,f.form_type_name,f.control_stage,
          greatest(f.updated_date,ev.modified,fv.modified) AS modified
        FROM staging.raw_control_form f
        LEFT JOIN eav_edits ev ON ev.control_form_id=f.id
        LEFT JOIN form_edits fv ON fv.row_id=f.id
        JOIN migration.disposition d
          ON d.legacy_source='ControlForm' AND d.legacy_id=f.id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible'
          AND d.target_table NOT IN ('forms.good_repute_form','forms.foreign_violation_form',
                                    'forms.labour_inspection_form')""", (run_id,))
    forms = {r[0]: r for r in cur.fetchall()}
    cur.execute("""SELECT b.control_form_id,b.control_id FROM staging.raw_control_to_form_binding b
        JOIN staging.raw_control c ON c.id=b.control_id GROUP BY 1,2""")
    bindings = defaultdict(set)
    for form_id, control_id in cur.fetchall():
        bindings[form_id].add(control_id)
    result = defaultdict(list)
    for i in forms:
        if len(bindings[i]) > 1:
            raise ValueError(f"ControlForm:{i}: multiple control bindings")
        if bindings[i]:
            group = ("Control", next(iter(bindings[i])))
        else:
            group = ("ControlForm", i)
        result[group].append(i)
    return forms, result


def load_eav(cur, ids, keys=None):
    query="""SELECT control_form_id,classifier_name,value,date_value,int_value
        FROM staging.raw_control_form_value WHERE control_form_id=ANY(%s)"""
    params=[list(ids)]
    if keys is not None:
        query+=' AND classifier_name=ANY(%s)'
        params.append(sorted(keys))
    cur.execute(query+' ORDER BY id',params)
    eav = defaultdict(lambda: defaultdict(list))
    for i, key, value, typed_date, typed_int in cur.fetchall():
        eav[i][key].append((value, typed_date, typed_int))
    cur.execute("SELECT id,controlled_date FROM staging.raw_control_form WHERE id=ANY(%s)",(list(ids),))
    for i,controlled in cur.fetchall():
        if controlled is not None and 'InspectionDate.Date' not in eav[i]:
            eav[i]['InspectionDate.Date']=[(controlled.strftime('%Y-%m-%d'),controlled,None)]
    return eav


def preflight(cur, run_id, scalar):
    """Keep unresolved conflicts fatal even in rehearsal; approved ones may pass."""
    try:
        forms, groups = source_context(cur, run_id)
    except ValueError as exc:
        cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm','*',%s,%s)",
                    (run_id, "unresolved_owner_group", str(exc)))
        return
    eav = load_eav(cur, forms, SHARED_KEYS | {'RoadWorthinessTeamMember'})
    for i,fields in eav.items():
        for key in ('InspectionDate.Date','InspectionDate.Time','InspectionAddress.Country'):
            if any(is_masked(v[0]) for v in fields.get(key,[])):
                cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm',%s,%s,%s)",
                    (run_id,str(i),'masked_required_header',key+': required target field; NULL support still needed'))
    modified = {i: r[4] for i, r in forms.items()}
    for group, members in groups.items():
        try:
            _, choices = resolve_shared(members, eav, modified, scalar)
        except ValueError as exc:
            cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm',%s,%s,%s)",
                        (run_id, str(min(members)), "conflicting_shared_source_header", str(exc)))
            continue
        for key, chosen in choices.items():
            cur.execute("INSERT INTO migration.finding VALUES (%s,'info','ControlForm',%s,%s,%s)",
                        (run_id, str(chosen), "approved_latest_shared_value", f"{APPROVAL}: {key}"))


def mismatches(cur, run_id, scalar):
    """Verify membership, owner choices and lifecycle against the frozen source.

    Does not trust the provenance JSON as evidence of actual target values.
    This runs at migration time, before application edits start.
    """
    problems = []
    def fail(check, form_id):
        problems.append({'check': check, 'legacy_id': str(form_id)})
    try:
        forms, groups = source_context(cur, run_id)
    except ValueError:
        return [{'check': 'unresolved_owner_group'}]
    cur.execute("""SELECT legacy_id::bigint,target_key FROM migration.form_link
        WHERE legacy_source='ControlForm' AND target_table='forms.compound_form'""")
    links = dict(cur.fetchall())
    eav = load_eav(cur, forms, SHARED_KEYS | {'RoadWorthinessTeamMember','soidumeerik','SoidumeerikType'})
    modified = {i: row[4] for i, row in forms.items()}
    claimed = {}
    columns = {'road':'InspectionAddress.Line2','address':'InspectionAddress.Line1',
        'vehicle_reg_nr':'Vehicle.RegNo','vehicle_vin':'Vehicle.VinCode',
        'vehicle_make':'Vehicle.Mark','vehicle_model':'Vehicle.Model',
        'company_reg_code':'Company.RegistryNumber','company_name':'Company.CompanyName',
        'company_address':'Company.CompanyAddress.Line1','company_city':'Company.CompanyAddress.City',
        'county':'InspectionAddress.Region','city':'InspectionAddress.City',
        'inspector_first_name':'Inspector.FirstName','inspector_last_name':'Inspector.LastName',
        'inspector_unit':'Inspector.AmetiisikuAndmed','inspector_profession':'Inspector.Job'}
    for group, members in groups.items():
        parents = {links.get(i) for i in members}
        if None in parents or len(parents) != 1:
            fail('owner_group_membership', min(members)); continue
        parent = next(iter(parents))
        if parent in claimed and claimed[parent] != group:
            fail('unrelated_controls_merged', min(members))
        claimed[parent] = group
        cur.execute('SELECT to_jsonb(c) FROM forms.compound_form c WHERE compound_form_key=%s ORDER BY created_at DESC,id DESC LIMIT 1',(parent,))
        row = cur.fetchone()
        if not row:
            fail('owner_parent_missing', min(members)); continue
        actual = row[0]
        expected_status = 'published' if all(forms[i][3]=='Published' for i in members) else 'confirmed'
        if actual['status'] != expected_status:
            fail('owner_parent_status', min(members))
        try:
            values, choices = resolve_shared(members,eav,modified,scalar)
        except ValueError:
            fail('unresolved_latest_shared_value', min(members)); continue
        extra = actual.get('extra_data') or {}
        if extra.get('legacy_source_form_ids') != sorted(members) or extra.get('legacy_shared_value_sources') != choices:
            fail('owner_provenance_changed',min(members))
        for column,key in columns.items():
            expected = scalar(values,key)
            if column.startswith('inspector_'):
                expected = expected or '-'
            if actual.get(column) != expected:
                fail('owner_shared_value:'+column,min(members))
        for column,key in [('control_date','InspectionDate.Date'),('control_time','InspectionDate.Time')]:
            if key not in choices:
                continue
            chosen = choices[key]
            cur.execute("""SELECT CASE WHEN %s='control_date'
                THEN migration.source_date(value,date_value)::date::text
                ELSE migration.safe_time(value)::time::text END
                FROM staging.raw_control_form_value WHERE control_form_id=%s AND classifier_name=%s""",(column,chosen,key))
            expected = {r[0] for r in cur.fetchall()}
            if len(expected)!=1 or actual[column] not in expected:
                fail('owner_shared_value:'+column,min(members))
    cur.execute("""SELECT l.legacy_id::bigint,s.tachograph_type_code FROM migration.form_link l
        JOIN forms.sp_driver_form s ON l.target_table='forms.sp_driver_form' AND s.sp_driver_form_key=l.target_key
        WHERE l.legacy_source='ControlForm' UNION ALL
        SELECT l.legacy_id::bigint,s.tachograph_type_code FROM migration.form_link l
        JOIN forms.sp_teammate_form s ON l.target_table='forms.sp_teammate_form' AND s.sp_teammate_form_key=l.target_key
        WHERE l.legacy_source='ControlForm'""")
    for i, actual in cur.fetchall():
        if i in forms and actual != tachograph(scalar(eav[i],'soidumeerik',('SoidumeerikType',))):
            fail('owner_tachograph',i)
    cur.execute("""SELECT l.legacy_id FROM migration.form_link l
        JOIN forms.good_repute_form g ON g.good_repute_form_key=l.target_key
        CROSS JOIN (VALUES ('Driver.Birthdate','date_of_birth'),
          ('AmetialasePadevuseTunnistuseValjaandmiseKuupaev','certificate_issue_date')) k(name,col)
        LEFT JOIN staging.raw_control_form_value v ON v.control_form_id::text=l.legacy_id AND v.classifier_name=k.name
        WHERE l.legacy_source='ControlForm' AND l.target_table='forms.good_repute_form'
          AND ((to_jsonb(g)->>k.col)::date IS DISTINCT FROM migration.source_date(v.value,v.date_value)::date
               OR NOT g.legacy_import)""")
    for i, in cur.fetchall():
        fail('owner_unknown_date',i)
    technical = technical_forms(cur, run_id)
    other_eav=load_eav(cur,technical)
    for i, form_type in technical.items():
        try:
            expected=other_proceeding(form_type,other_eav[i],scalar)
        except ValueError:
            fail('owner_other_proceeding_source',i); continue
        if expected:
            cur.execute("""SELECT to_jsonb(t) FROM migration.form_link l JOIN forms.vehicle_technical_form t
                ON t.vehicle_technical_form_key=l.target_key WHERE l.legacy_source='ControlForm'
                AND l.legacy_id=%s AND l.target_table='forms.vehicle_technical_form'""",(str(i),))
            actual=cur.fetchone()
            if not actual or any(actual[0][k]!=v for k,v in expected.items()):
                fail('owner_other_proceeding',i)
    return problems


# Labels transcribed from LJVIS1 RoadControlCard2012.ascx (decision section),
# not inferred from today's laws. Unknown keys must remain blockers.
DECISION_PARAGRAPHS = {
    'vm_joustunud_205':'LS §205', 'vm_joustunud_209':'LS §209',
    'vm_joustunud_210':'LS §210 lg 1', 'vm_joustunud_210_lg2':'LS §210 lg 2',
    'vm_joustunud_210_p5':'LS §210⁵', 'vm_joustunud_210_p6lg1':'LS §210⁶ lg 1',
    'vm_joustunud_210_p6lg2':'LS §210⁶ lg 2', 'vm_joustunud_218':'LS §218',
    'vm_joustunud_219':'LS §219', 'vm_joustunud_220lg1':'LS §220 lg 1',
    'vm_joustunud_220lg2':'LS §220 lg 2',
}


def other_proceeding(form_type, values, scalar):
    """Map the proven LJVIS1 template/field combination, never a record identity."""
    if form_type != 'RoadControlCard2012':
        return None
    if scalar(values,'otsus') != 'alustati_menetlust':
        return None
    if scalar(values,'otsus_vaarteomenetlus') != 'otsus_alustativaarteo_muumenetlust':
        return None
    paragraphs=[]
    for key in sorted(values):
        if key.startswith('vm_joustunud_') and scalar(values,key) == 'on':
            if key not in DECISION_PARAGRAPHS:
                raise ValueError('Unknown decision paragraph key: '+key)
            label=DECISION_PARAGRAPHS[key]
            if label not in paragraphs: paragraphs.append(label)
    other=scalar(values,'rikkumine_muu')
    if other: paragraphs.append('Muu rikkumise § (LJVIS1): '+other)
    if not paragraphs:
        raise ValueError('Historical other proceeding has no decision paragraphs; inspect source')
    return {'result_type':'legacy_proceedings','proceeding_type':'legacy_other',
            'enforcement_decision':'; '.join(paragraphs)}



def technical_forms(cur, run_id):
    cur.execute("""SELECT f.id,f.form_type_name FROM staging.raw_control_form f
        JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=f.id::text
        WHERE d.migration_run_id=%s AND d.reason='eligible'
          AND d.target_table='forms.vehicle_technical_form'""", (run_id,))
    return dict(cur.fetchall())


def approve_other_findings(cur,run_id,scalar):
    forms=technical_forms(cur,run_id)
    eav=load_eav(cur,forms)
    for i, form_type in forms.items():
        try:
            approved=other_proceeding(form_type,eav[i],scalar)
        except ValueError as exc:
            cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm',%s,%s,%s)",
                (run_id,str(i),'unresolved_approved_proceeding',str(exc)))
            continue
        if approved:
            cur.execute("""UPDATE migration.finding SET severity='info',issue='approved_control_result',detail=%s
                WHERE migration_run_id=%s AND legacy_source='ControlForm' AND legacy_id=%s
                  AND issue='unmapped_control_result'""",(APPROVAL+': source template, outcome, proceeding type and paragraphs',run_id,str(i)))
