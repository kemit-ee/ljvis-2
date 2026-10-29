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
import decisions
import diagnostics


class MappingConflict(ValueError):
    """Context that survives rollback without exposing source field values."""
    def __init__(self, form_id, issue, detail):
        self.form_id, self.issue = form_id, issue
        super().__init__(f"ControlForm:{form_id}: {detail}")


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
    if value is not None:
        value = value.strip()
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
    eav = decisions.load_eav(cur, ids)

    def finding(form_id, issue, detail, severity="blocker"):
        cur.execute("""INSERT INTO migration.finding
            SELECT %s,%s,'ControlForm',%s,%s,%s WHERE NOT EXISTS (
              SELECT 1 FROM migration.finding WHERE migration_run_id=%s AND severity=%s
              AND legacy_source='ControlForm' AND legacy_id=%s AND issue=%s AND detail=%s)""",
                    (run_id, severity, str(form_id), issue, detail)*2)

    def update(table, target_key, data):
        diagnostics.emit('target_update_attempt', target_table='forms.'+table,
                         target_key=target_key, values=data)
        if not data:
            return
        # All names are maintained in this module, never provided by source data.
        cur.execute(sql.SQL('UPDATE forms.{} SET {} WHERE {}=%s').format(
            sql.Identifier(table), sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(k)) for k in data),
            sql.Identifier(table+'_key')), [Json(v) if isinstance(v, (list, dict)) else v for v in data.values()]+[target_key])

    for form_id, target, target_key in links:
        table = target.removeprefix('forms.')
        values = eav[form_id]
        def get(key, aliases=()):
            try:
                return scalar(values,key,aliases)
            except ValueError as exc:
                raise MappingConflict(form_id,'conflicting_scalar',str(exc)) from exc
        if table in ('vehicle_technical_form', 'trailer_technical_form'):
            for key, entries in values.items():
                if re.fullmatch(r'caa_\d+_(kontroll_kontrollitud|kontroll|ei_vasta_nouetele)',key or ''):
                    if any(v is not None and str(v).strip().lower() not in ('','kontrollitud','ei_kontrollitud','on','true','false','off') for v,_,_ in entries):
                        finding(form_id,'unknown_technical_checkbox',f'{key}: unsupported checkbox value')
            data = {'parts_summary': technical_summary(values), 'notes': get('control_notes')}
            if table == 'trailer_technical_form':
                data['trailer_reg_nr'] = get('Trailer.RegNo')
            update(table, target_key, data)
        if table in ('sp_driver_form', 'sp_teammate_form'):
            tachograph = get('soidumeerik', ('SoidumeerikType',))
            mapped = decisions.tachograph(tachograph)
            if mapped in ('smart_1', 'smart_2'):
                diagnostics.owner(form_id, 'tachograph_type_code', tachograph, mapped,
                                  decisions.APPROVAL+'-P14', target_table=target, target_key=target_key)
            if tachograph and mapped is None:
                finding(form_id,'unmapped_tachograph','Legacy tachograph has no unambiguous target generation/type')
            data = {'tachograph_type_code':mapped,'tachograph_notes':get('puhkeaja_nouete_taitmine_markused')}
            for column,key,aliases in [('checked_days_count','days_count',('kontrollitud_paevade_arv',)),
                                       ('work_days_count','workdays_count',()),('other_activity_days_count','sick_workdays_count',())]:
                raw = get(key, aliases)
                # The older representation may be present only in IntValue.
                typed = {r[2] for name in (key,*aliases) for r in values.get(name,[]) if r[2] is not None}
                if len(typed)>1:
                    raise MappingConflict(form_id,'conflicting_typed_integer',key)
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
                    finding(form_id,'masked_integer' if decisions.is_masked(raw) else 'invalid_integer',
                            f'{key}: NULL; source retained', 'warning' if decisions.is_masked(raw) else 'blocker')
            applicability = get('puhkeaja_nouete_taitmine')
            data['sp_applicability'] = {'rakendatakse':'applied','ei_rakendata':'not_applied','ei_kontrollitud':'not_checked'}.get(applicability)
            if applicability and not data['sp_applicability']:
                finding(form_id,'unmapped_applicability','Unknown rest-time applicability')
            update(table, target_key, data)
        if table in ('sp_driver_form','sp_teammate_form','vehicle_technical_form','trailer_technical_form','adr_form'):
            cur.execute('SELECT form_type_name FROM staging.raw_control_form WHERE id=%s',(form_id,))
            form_type=cur.fetchone()[0]
            approved_other=None
            if table == 'vehicle_technical_form':
                try:
                    approved_other=decisions.other_proceeding(form_type,values,scalar)
                except ValueError as exc:
                    finding(form_id,'unresolved_approved_proceeding',str(exc))
            if approved_other:
                diagnostics.owner(form_id, 'other_proceeding', dict(values), approved_other,
                                  decisions.APPROVAL+'-P10', target_table=target, target_key=target_key)
                update(table,target_key,approved_other)
                cur.execute("""UPDATE migration.quality_report SET approval_basis=%s,
                    applied_default='legacy_proceedings' WHERE migration_run_id=%s
                    AND legacy_source='ControlForm' AND legacy_id=%s AND issue='unmapped_result'
                    AND target_table=%s""",(decisions.APPROVAL,run_id,str(form_id),target))
                finding(form_id,'approved_other_proceeding','P10: original decision paragraphs retained','info')
                continue
            proceeding = get('otsus_vaarteomenetlus')
            choices = {'otsus_alustativaarteo_kiirmenetlust':('expedited','kiirmenetlus_viitenumber'),
                       'otsus_alustativaarteo_lyhimenetlust':('summary','lyhimenetlus_viitenumber'),
                       'otsus_alustativaarteo_yldmenetlust':('general','yldmenetlus_vaarteoasjanumber')}
            if proceeding in choices:
                kind,key = choices[proceeding]
                reference = get(key)
                target_kind = {'expedited':'KIIR','summary':'LYHI','general':'YLD'}[kind] if table in ('sp_driver_form','sp_teammate_form') else kind
                update(table,target_key,{'proceeding_type':target_kind,'proceeding_reference_number':reference})
                if not reference and kind != 'general':
                    finding(form_id,'missing_proceeding_reference','Known proceeding has no required reference; not guessed')
            elif proceeding:
                finding(form_id,'unmapped_proceeding','Legacy proceeding requires a target mapping')

    # Consolidate only newly inserted, uncommitted parent rows. No application
    # snapshot/history is deleted. Stable links are rewritten before commit.
    parents = {form_id: key for form_id,table,key in links if table=='forms.compound_form'}
    source_forms, all_groups = decisions.source_context(cur, run_id)
    groups = {g: [i for i in members if i in parents] for g, members in all_groups.items()
              if any(i in parents for i in members)}
    modified = {i: r[4] for i, r in source_forms.items()}
    for group, members in sorted(groups.items()):
        keys = sorted({parents[form_id] for form_id in members})
        canonical = keys[0]
        try:
            values, choices = decisions.resolve_shared(members, eav, modified, scalar)
        except ValueError as exc:
            raise MappingConflict(members[0], 'conflicting_shared_header', str(exc)) from exc
        # Header transforms supply typed values and approved missing-text defaults.
        # Copy each resolved header from its proven source; never from a random parent.
        header_keys = {'control_date':'InspectionDate.Date','control_time':'InspectionDate.Time',
                       'control_country_code':'InspectionAddress.Country','county':'InspectionAddress.Region',
                       'city':'InspectionAddress.City','inspector_first_name':'Inspector.FirstName',
                       'inspector_last_name':'Inspector.LastName','inspector_unit':'Inspector.AmetiisikuAndmed',
                       'inspector_profession':'Inspector.Job'}
        header = {}
        for column, key in header_keys.items():
            candidates = [i for i in members if key in eav[i]]
            chosen = choices.get(key, min(candidates or members))
            raw = scalar(values, key)
            if column == 'control_date':
                cur.execute("""SELECT coalesce(
                    (SELECT migration.source_date(value,date_value)::date
                     FROM staging.raw_control_form_value WHERE control_form_id=%s AND classifier_name=%s ORDER BY id LIMIT 1),
                    controlled_date::date, created_date::date)
                    FROM staging.raw_control_form WHERE id=%s""", (chosen,key,chosen))
                header[column] = cur.fetchone()[0]
            elif column == 'control_time':
                cur.execute("SELECT coalesce(migration.safe_time(%s),'00:00')::time",(raw,))
                header[column] = cur.fetchone()[0]
                cur.execute('SELECT migration.safe_time(%s)', (raw,))
                if cur.fetchone()[0] is None:
                    diagnostics.owner(chosen, key, eav[chosen].get(key, []), header[column],
                                      decisions.APPROVAL+'-P12-invalid-time', target_table='forms.compound_form',
                                      target_key=canonical, affected_forms=sorted(members))
            elif column == 'control_country_code':
                cur.execute('SELECT migration.safe_country_code(%s)',(raw,))
                header[column] = cur.fetchone()[0]
            else:
                header[column] = raw or ('-' if column.startswith('inspector_') else None)
        if group[0]=='Control':
            cur.execute("""SELECT count(*) FROM staging.raw_control_to_form_binding b
                JOIN staging.raw_control_form f ON f.id=b.control_form_id
                LEFT JOIN migration.disposition d ON d.legacy_source='ControlForm' AND d.legacy_id=f.id::text AND d.migration_run_id=%s
                WHERE b.control_id=%s AND coalesce(d.reason,'missing')<>'eligible'
                  AND f.control_stage IS DISTINCT FROM 'Saved'""",(run_id,group[1]))
            if cur.fetchone()[0]:
                finding(members[0],'group_contains_excluded_parts','Some source control members are outside the agreed status/date selection')
        else:
            finding(members[0],'missing_control_binding','Source has no binding; separate historical parent retained','warning')
        def get(key, aliases=()):
            try:
                return scalar(values,key,aliases)
            except ValueError as exc:
                raise MappingConflict(members[0],'conflicting_group_scalar',f'{group}: {exc}') from exc
        fields = {
            'vehicle_reg_nr':'Vehicle.RegNo','vehicle_country_code':'Vehicle.Country','vehicle_make':'Vehicle.Mark',
            'vehicle_model':'Vehicle.Model','vehicle_vin':'Vehicle.VinCode','vehicle_body_type':'Vehicle.CarBodyType',
            'company_reg_code':'Company.RegistryNumber','company_name':'Company.CompanyName',
            'company_country_code':'Company.CompanyAddress.Country','company_city':'Company.CompanyAddress.City',
            'company_address':'Company.CompanyAddress.Line1','company_postal_code':'Company.CompanyAddress.PostalCode',
            'company_activity_licence_copy_number':'Company.TegevusloaNumber',
            'road':'InspectionAddress.Line2','address':'InspectionAddress.Line1',
        }
        data = {**header, **{column:get(key) for column,key in fields.items()}}
        data['status'] = 'published' if all(source_forms[i][3] == 'Published' for i in members) else 'confirmed'
        diagnostics.owner(members[0], 'status', {i:source_forms[i][3] for i in members}, data['status'],
                          decisions.APPROVAL+'-P05', target_table='forms.compound_form', target_key=canonical,
                          affected_forms=sorted(members))
        for key,(column,maximum) in decisions.NUMERIC_LIMITS.items():
            raw = get(key)
            parsed, action = decisions.approved_number(raw, maximum)
            if action in ('invalid', 'masked'):
                finding(members[0],'masked_location_or_mileage' if decisions.is_masked(raw) else 'invalid_location_or_mileage',
                        f'{key}: NULL; source retained', 'warning' if decisions.is_masked(raw) else 'blocker')
            original_entries = {i:eav[i].get(key,[]) for i in members}
            formatting_changed = any(v is not None and v != str(parsed)
                                     for entries in original_entries.values() for v,_,_ in entries)
            if action in ('normalized', 'right_digits_removed', 'masked') or (action=='unchanged' and formatting_changed):
                diagnostics.owner(choices.get(key,min((i for i in members if key in eav[i]),default=members[0])), key,
                                  original_entries, parsed,
                                  decisions.APPROVAL+('-P13' if action=='masked' else '-P12'),
                                  action=action, target_table='forms.compound_form', target_field=column,
                                  target_key=canonical, affected_forms=sorted(members))
            data[column] = parsed
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
            parsed=decisions.source_date(values.get(prefix+'.BirthDate',[]))
            if birth and parsed is None:
                finding(members[0],'masked_driver_birthdate' if decisions.is_masked(birth) else 'unmapped_driver_birthdate',
                        f'{prefix}.BirthDate: NULL; source retained', 'warning' if decisions.is_masked(birth) else 'blocker')
                if decisions.is_masked(birth):
                    diagnostics.owner(members[0], prefix+'.BirthDate', birth, None,
                                      decisions.APPROVAL+'-P13', affected_forms=sorted(members))
            if any(driver.values()) or birth or parsed:
                driver.update(driver_role=role,birth_date=parsed.isoformat() if parsed else None)
                if driver['citizenship_code']: driver['citizenship_code']=driver['citizenship_code'].upper()
                drivers.append(driver)
        data['drivers']=drivers
        trailer={column:get('Trailer.'+key) for column,key in {'reg_nr':'RegNo','country_code':'Country','make':'Mark','model':'Model','vin':'VinCode'}.items()}
        data['trailers']=[dict(trailer,trailer_index=1)] if any(trailer.values()) else []
        cur.execute('SELECT extra_data FROM forms.compound_form WHERE compound_form_key=%s',(canonical,))
        extra=cur.fetchone()[0] or {}
        extra.update(legacy_source_form_ids=sorted(members),legacy_group_source=group[0],legacy_group_id=group[1],
                     legacy_decision=decisions.APPROVAL, legacy_shared_value_sources=choices,
                     legacy_shared_value_timestamps={key:modified[i].isoformat() for key,i in choices.items()})
        data['extra_data']=extra
        for key,chosen in choices.items():
            diagnostics.owner(chosen, key,
                              {i:decisions.normalized_values(eav[i]).get(key,[]) for i in members},
                              values.get(key,[]), decisions.APPROVAL+'-P04',
                              affected_forms=sorted(members), target_table='forms.compound_form', target_key=canonical)
        update('compound_form',canonical,data)
        for table in sorted(children):
            cur.execute(sql.SQL('UPDATE forms.{} SET compound_form_key=%s WHERE compound_form_key=ANY(%s)').format(sql.Identifier(table)),(canonical,keys))
        cur.execute('SELECT form_number FROM forms.compound_form WHERE compound_form_key=%s',(canonical,))
        number=cur.fetchone()[0]
        cur.execute("""UPDATE migration.form_link SET target_key=%s,target_form_number=%s
            WHERE migration_run_id=%s AND target_table='forms.compound_form' AND legacy_id=ANY(%s)""",(canonical,number,run_id,[str(x) for x in members]))
        cur.execute('DELETE FROM forms.compound_form WHERE compound_form_key=ANY(%s) AND compound_form_key<>%s',(keys,canonical))
        cur.execute("""DELETE FROM migration.quality_report WHERE migration_run_id=%s AND issue='compound_grouping_skipped'
            AND legacy_source='ControlForm' AND legacy_id=ANY(%s)""",(run_id,[str(x) for x in members]))


def consumed_keys(form_type):
    """Declared inputs for coverage diagnostics, not proof of value equivalence.

    Unlisted dynamic keys remain visible. Empty aliases are not an exclusion
    approval; preflight checks nonempty text or meaningful typed values.
    """
    children = {'RoadControlCard2012','Roadworthiness2012','TransportInterruption','DangerousDelivery2012'}
    if form_type not in children:
        return set()
    keys = set('Vehicle.RegNo Vehicle.Country Vehicle.Mark Vehicle.Model Vehicle.VinCode Vehicle.CarBodyType Company.RegistryNumber Company.CompanyName Company.CompanyAddress.Country Company.CompanyAddress.City Company.CompanyAddress.Line1 Company.CompanyAddress.PostalCode Company.TegevusloaNumber InspectionAddress.Line2 InspectionAddress.Line1 InspectionAddress.HighwayKilometerNumber OdometerReading'.split())
    keys.update(prefix+'.'+name for prefix in ('Driver','AdditionalDriver') for name in
                ('IdentificationNo','ForeignIdentificationNo','FirstName','LastName','Citizenship','BirthDate'))
    keys.update('Trailer.'+name for name in ('RegNo','Country','Mark','Model','VinCode'))
    if form_type == 'Roadworthiness2012':
        keys.update('RoadWorthinessTeamMember soidumeerik SoidumeerikType days_count kontrollitud_paevade_arv workdays_count sick_workdays_count puhkeaja_nouete_taitmine puhkeaja_nouete_taitmine_markused'.split())
    if form_type == 'RoadControlCard2012':
        keys.update(('RoadControlTrailer','control_notes'))
    if form_type != 'TransportInterruption':
        keys.update(('otsus_vaarteomenetlus','kiirmenetlus_viitenumber','lyhimenetlus_viitenumber','yldmenetlus_vaarteoasjanumber'))
    return keys
