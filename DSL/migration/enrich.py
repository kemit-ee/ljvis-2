"""Complete structural mappings inside the coordinator's uncommitted transaction.

Only rows created by the current run are touched. Conflicting shared values are
never resolved with MAX. Historical classifier/legal mappings remain explicit
blockers; keeping an EAV snapshot does not constitute mapping those fields.
"""
from collections import defaultdict
from datetime import datetime, date
import re

from psycopg2 import sql
from psycopg2.extras import Json


def scalar(values, key, aliases=()):
    found = []
    for name in (key, *aliases):
        for value, typed_date, typed_int in values.get(name, []):
            if value is not None and str(value).strip():
                normalized = str(value).strip()
                if normalized not in found:
                    found.append(normalized)
    if len(found) > 1:
        raise ValueError(f"Conflicting scalar values for {key}; inspect source_snapshot")
    return found[0] if found else None


def parsed_date(value):
    if not value:
        return None
    if isinstance(value, (datetime, date)):
        return value.date() if isinstance(value, datetime) else value
    for pattern in ('%Y-%m-%d', '%d.%m.%Y', '%Y.%m.%d'):
        try:
            return datetime.strptime(value, pattern).date()
        except ValueError:
            pass
    return None


def integer(value):
    if value is not None and re.fullmatch(r'[0-9]+', value):
        number = int(value)
        if number <= 2147483647:
            return number
    return None


def technical_summary(values):
    parts = {}
    for key, rows in values.items():
        match = re.fullmatch(r'caa_(\d+)_(kontroll_kontrollitud|kontroll|ei_vasta_nouetele)', key or '')
        if not match:
            continue
        part = parts.setdefault(match[1], {'partCode': 'CAA_'+match[1], 'checked': False, 'hasDefect': False})
        entries = {str(r[0]).strip().lower() for r in rows if r[0] is not None}
        if match[2] == 'kontroll_kontrollitud' and entries & {'kontrollitud', 'on', 'true'}:
            part['checked'] = True
        if match[2] == 'kontroll' and 'kontrollitud' in entries:
            part['checked'] = True
        if (match[2] == 'ei_vasta_nouetele' or match[2] == 'kontroll') and entries & {'on', 'true'}:
            part['checked'] = True
            part['hasDefect'] = True
    return [parts[k] for k in sorted(parts, key=int)]


def apply(cur, run_id, children):
    cur.execute("""SELECT legacy_id::bigint,target_table,target_key FROM migration.form_link
        WHERE migration_run_id=%s AND legacy_source='ControlForm' ORDER BY legacy_id::bigint,target_table""", (run_id,))
    links = cur.fetchall()
    if not links:
        return
    ids = sorted({r[0] for r in links})
    cur.execute("""SELECT control_form_id,classifier_name,value,date_value,int_value
        FROM staging.raw_control_form_value WHERE control_form_id=ANY(%s) ORDER BY id""", (ids,))
    eav = defaultdict(lambda: defaultdict(list))
    for form_id, key, value, typed_date, typed_int in cur.fetchall():
        eav[form_id][key].append((value, typed_date, typed_int))

    def finding(form_id, issue, detail, severity="blocker"):
        cur.execute("INSERT INTO migration.finding VALUES (%s,%s,'ControlForm',%s,%s,%s)",
                    (run_id, severity, str(form_id), issue, detail))

    def update(table, target_key, data):
        if not data:
            return
        # All names are maintained in this module, never provided by source data.
        cur.execute(sql.SQL('UPDATE forms.{} SET {} WHERE {}=%s').format(
            sql.Identifier(table), sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(k)) for k in data),
            sql.Identifier(table+'_key')), [Json(v) if isinstance(v, (list, dict)) else v for v in data.values()]+[target_key])

    for form_id, target, target_key in links:
        table = target.removeprefix('forms.')
        values = eav[form_id]
        get = lambda key, aliases=(): scalar(values, key, aliases)
        if table in ('vehicle_technical_form', 'trailer_technical_form'):
            data = {'parts_summary': technical_summary(values), 'notes': get('control_notes')}
            if table == 'trailer_technical_form':
                data['trailer_reg_nr'] = get('Trailer.RegNo')
            update(table, target_key, data)
        if table in ('sp_driver_form', 'sp_teammate_form'):
            tachograph = get('soidumeerik', ('SoidumeerikType',))
            mapped = {'mehaaniline':'analogue','mehhaaniline':'analogue','analoog':'analogue',
                      'digitaalne':'digital','smart_1':'smart_1','smart_2':'smart_2','arukas-2':'smart_2','puudub':'missing'}.get((tachograph or '').lower())
            if tachograph and mapped is None:
                finding(form_id,'unmapped_tachograph','Legacy tachograph has no unambiguous target generation/type')
            data = {'tachograph_type_code':mapped,'tachograph_notes':get('puhkeaja_nouete_taitmine_markused')}
            for column,key,aliases in [('checked_days_count','days_count',('kontrollitud_paevade_arv',)),
                                       ('work_days_count','workdays_count',()),('other_activity_days_count','sick_workdays_count',())]:
                raw = get(key, aliases)
                # The older representation may be present only in IntValue.
                typed = {r[2] for name in (key,*aliases) for r in values.get(name,[]) if r[2] is not None}
                if len(typed)>1:
                    raise ValueError(f'Conflicting typed integer: ControlForm:{form_id} {key}')
                if typed:
                    typed_value = str(next(iter(typed)))
                    if raw is not None and integer(raw)!=integer(typed_value):
                        # Legacy SaveOrUpdate writes Value but leaves IntValue unchanged;
                        # form rendering and binding read Value. Zero is often a CLR default.
                        finding(form_id,'stale_typed_integer',f'{key}: text retained as rendered by LJVIS1; IntValue differs','warning')
                    if raw is None and key not in values:
                        raw = typed_value
                data[column] = integer(raw)
                if raw is not None and data[column] is None:
                    finding(form_id,'invalid_integer',f'{key} is not a nonnegative int32')
            applicability = get('puhkeaja_nouete_taitmine')
            data['sp_applicability'] = {'rakendatakse':'applied','ei_rakendata':'not_applied','ei_kontrollitud':'not_checked'}.get(applicability)
            if applicability and not data['sp_applicability']:
                finding(form_id,'unmapped_applicability','Unknown rest-time applicability')
            update(table, target_key, data)
        if table in ('sp_driver_form','sp_teammate_form','vehicle_technical_form','trailer_technical_form','adr_form'):
            proceeding = get('otsus_vaarteomenetlus')
            choices = {'otsus_alustativaarteo_kiirmenetlust':('expedited','kiirmenetlus_viitenumber'),
                       'otsus_alustativaarteo_lyhimenetlust':('summary','lyhimenetlus_viitenumber'),
                       'otsus_alustativaarteo_yldmenetlust':('general','yldmenetlus_vaarteoasjanumber')}
            if proceeding in choices:
                kind,key = choices[proceeding]
                reference = get(key)
                if reference:
                    update(table,target_key,{'proceeding_type':kind,'proceeding_reference_number':reference})
                else:
                    finding(form_id,'missing_proceeding_reference','Known proceeding has no reference; not guessed')
            elif proceeding:
                finding(form_id,'unmapped_proceeding','Legacy proceeding requires a target mapping')

    # Consolidate only newly inserted, uncommitted parent rows. No application
    # snapshot/history is deleted. Stable links are rewritten before commit.
    parents = {form_id: key for form_id,table,key in links if table=='forms.compound_form'}
    cur.execute("""SELECT b.control_form_id,b.control_id FROM staging.raw_control_to_form_binding b
        JOIN staging.raw_control c ON c.id=b.control_id WHERE b.control_form_id=ANY(%s)
        GROUP BY b.control_form_id,b.control_id""", (list(parents),))
    controls = defaultdict(set)
    for form_id, control_id in cur.fetchall():
        controls[form_id].add(control_id)
    groups = defaultdict(list)
    for form_id in parents:
        if len(controls[form_id])>1:
            raise ValueError(f'Multiple legacy controls for ControlForm:{form_id}')
        group = ('Control',next(iter(controls[form_id]))) if controls[form_id] else ('ControlForm',form_id)
        groups[group].append(form_id)
    for group, members in sorted(groups.items()):
        keys = sorted({parents[form_id] for form_id in members})
        canonical = keys[0]
        cur.execute("""SELECT DISTINCT control_date,control_time,control_country_code,
            inspector_first_name,inspector_last_name,inspector_unit,inspector_profession
            FROM forms.compound_form WHERE compound_form_key=ANY(%s)""",(keys,))
        if len(cur.fetchall())>1:
            raise ValueError(f'Conflicting shared header in {group[0]}:{group[1]}; no arbitrary parent chosen')
        if group[0]=='Control':
            cur.execute("""SELECT count(*) FROM staging.raw_control_to_form_binding b
                JOIN staging.raw_control_form f ON f.id=b.control_form_id
                LEFT JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=f.id::text AND d.migration_run_id=%s
                WHERE b.control_id=%s AND coalesce(d.reason,'missing')<>'eligible'""",(run_id,group[1]))
            if cur.fetchone()[0]:
                finding(members[0],'group_contains_excluded_parts','Some source control members are outside the agreed status/date selection')
        else:
            finding(members[0],'missing_control_binding','No valid Control binding; standalone parent retained for rehearsal')
        values = defaultdict(list)
        for form_id in members:
            # UnitedFormService.UpdateTeamMemberRoadWorthinessFormValues swaps
            # Driver.* and AdditionalDriver.* when saving the second driver's form.
            teammate = (scalar(eav[form_id],'RoadWorthinessTeamMember') or '').lower() in ('true','1')
            for key, entries in eav[form_id].items():
                if teammate and key and key.startswith('Driver.'):
                    key='AdditionalDriver.'+key.removeprefix('Driver.')
                elif teammate and key and key.startswith('AdditionalDriver.'):
                    key='Driver.'+key.removeprefix('AdditionalDriver.')
                values[key].extend(entries)
        get = lambda key, aliases=(): scalar(values,key,aliases)
        fields = {
            'vehicle_reg_nr':'Vehicle.RegNo','vehicle_country_code':'Vehicle.Country','vehicle_make':'Vehicle.Mark',
            'vehicle_model':'Vehicle.Model','vehicle_vin':'Vehicle.VinCode','vehicle_body_type':'Vehicle.CarBodyType',
            'company_reg_code':'Company.RegistryNumber','company_name':'Company.CompanyName',
            'company_country_code':'Company.CompanyAddress.Country','company_city':'Company.CompanyAddress.City',
            'company_address':'Company.CompanyAddress.Line1','company_postal_code':'Company.CompanyAddress.PostalCode',
            'company_activity_licence_copy_number':'Company.TegevusloaNumber',
            'road':'InspectionAddress.Line2','address':'InspectionAddress.Line1',
        }
        data = {column:get(key) for column,key in fields.items()}
        for column in ('vehicle_country_code','company_country_code'):
            if data[column]:
                cur.execute('SELECT migration.safe_country_code(%s,NULL)',(data[column],))
                data[column]=cur.fetchone()[0]
        drivers=[]
        for prefix,role in [('Driver','primary'),('AdditionalDriver','second')]:
            driver={column:get(prefix+'.'+key) for column,key in {
                'personal_code_ee':'IdentificationNo','personal_code_foreign':'ForeignIdentificationNo',
                'first_name':'FirstName','last_name':'LastName','citizenship_code':'Citizenship'}.items()}
            birth=get(prefix+'.BirthDate')
            parsed=parsed_date(birth)
            if birth and parsed is None:
                finding(members[0],'unmapped_driver_birthdate',f'{prefix}.BirthDate cannot be parsed')
            if any(driver.values()) or birth:
                driver.update(driver_role=role,birth_date=parsed.isoformat() if parsed else None)
                if driver['citizenship_code']: driver['citizenship_code']=driver['citizenship_code'].upper()
                drivers.append(driver)
        data['drivers']=drivers
        trailer={column:get('Trailer.'+key) for column,key in {'reg_nr':'RegNo','country_code':'Country','make':'Mark','model':'Model','vin':'VinCode'}.items()}
        data['trailers']=[dict(trailer,trailer_index=1)] if any(trailer.values()) else []
        cur.execute('SELECT extra_data FROM forms.compound_form WHERE compound_form_key=%s',(canonical,))
        extra=cur.fetchone()[0] or {}
        extra.update(legacy_source_form_ids=sorted(members),legacy_group_source=group[0],legacy_group_id=group[1])
        data['extra_data']=extra
        update('compound_form',canonical,data)
        for table in sorted(children):
            cur.execute(sql.SQL('UPDATE forms.{} SET compound_form_key=%s WHERE compound_form_key=ANY(%s)').format(sql.Identifier(table)),(canonical,keys))
        cur.execute('SELECT form_number FROM forms.compound_form WHERE compound_form_key=%s',(canonical,))
        number=cur.fetchone()[0]
        cur.execute("""UPDATE migration.form_link SET target_key=%s,target_form_number=%s
            WHERE migration_run_id=%s AND target_table='forms.compound_form' AND legacy_id=ANY(%s)""",(canonical,number,run_id,[str(x) for x in members]))
        cur.execute('DELETE FROM forms.compound_form WHERE compound_form_key=ANY(%s) AND compound_form_key<>%s',(keys,canonical))
        if group[0]=='Control':
            cur.execute("""DELETE FROM migration.quality_report WHERE migration_run_id=%s AND issue='compound_grouping_skipped'
                AND legacy_source='ControlForm' AND legacy_id=ANY(%s)""",(run_id,[str(x) for x in members]))
