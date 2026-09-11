"""PDF rendering for allow-listed LJVIS form template codes."""
import argparse
from datetime import date
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, StrictUndefined

ROOT = Path(__file__).resolve().parent


def unwrap(value):
    if not isinstance(value, dict):
        raise ValueError('Expected an object')
    return value.get('response', value)


def structured(value, expected):
    if value is None or value == '':
        return expected()
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, expected):
        raise ValueError('Invalid structured field: expected ' + expected.__name__)
    return value


def joined(*values):
    return ', '.join(str(v).strip() for v in values if v is not None and str(v).strip())


def dt(value):
    if not value:
        return ''
    return date.fromisoformat(str(value)[:10]).strftime('%d.%m.%Y')


def context(payload=None, blank=False):
    payload = {} if blank else (payload or {})
    c, a = unwrap(payload.get('compoundForm', {})), unwrap(payload.get('adrForm', {}))
    if not blank and (not c.get('id') or not a.get('id')):
        raise ValueError('Filled mode requires compound.id and adr.id; use --blank for an empty form')
    if not blank and str(a.get('compoundFormKey')) != str(c.get('id')):
        raise ValueError('ADR compoundFormKey does not match compound.id')
    labels = payload.get('labels', {})
    appendix, warnings = [], []
    for key in ('exemptionApplied', 'drivingBanApplied', 'transportInterruptionApplied', 'sealOpened'):
        if a.get(key) is not None and type(a[key]) is not bool:
            raise ValueError(key + ' must be boolean or null')

    def label(kind, code):
        if not code:
            return ''
        return labels.get(kind, {}).get(str(code), str(code))

    def short(number, value, limit=155):
        value = str(value or '')
        if len(value) > limit or value.count('\n') > 2:
            appendix.append({'title': 'Lahter ' + str(number), 'text': value})
            return 'Vt lisa, lahter ' + str(number) + '.'
        return value

    def address(value):
        v = structured(value, dict)
        return joined(v.get('street'), v.get('city'), v.get('county'), v.get('postalCode'), label('countries', v.get('countryCode')))

    drivers = structured(c.get('drivers'), list)
    trailers = structured(c.get('trailers'), list)
    assistant = structured(a.get('driverAssistant'), dict)
    people = []
    for i, person in enumerate(drivers):
        cert = a.get('driverAdrCertificateNumber' if i == 0 else 'crewAdrCertificateNumber') if i < 2 else None
        people.append(joined(' '.join(filter(None, [person.get('firstName'), person.get('lastName')])), 'ADR ' + cert if cert else ''))
    if assistant:
        people.append(joined('Juhiabi: ' + ' '.join(filter(None, [assistant.get('firstName'), assistant.get('lastName')])), a.get('assistantAdrCertificateNumber')))
    goods = structured(a.get('dangerousGoods'), list)
    fields = {
        '1': short(1, joined(label('countries', c.get('controlCountryCode')), c.get('county'), c.get('city'), c.get('address'), label('roads', c.get('road')), c.get('roadOther'), str(c['kilometer']) + ' km' if c.get('kilometer') else ''), 95),
        '2': dt(c.get('controlDate')), '3': str(c.get('controlTime') or '')[:5],
        '4': short(4, '; '.join(filter(None, [joined(c.get('vehicleCountryCode'), c.get('vehicleRegNr'))] + [joined(t.get('countryCode'), t.get('regNr')) for t in trailers]))),
        '5': short(5, joined(c.get('companyName'), c.get('companyRegCode'), c.get('companyAddressLine1'), c.get('companyCity'), c.get('companyCounty'), c.get('companyPostalCode'), label('countries', c.get('companyCountryCode')))),
        '6': short(6, '; '.join(people)),
        '7': short(7, joined(address(a.get('lastLoadAddress')), dt(a.get('lastLoadDate')))),
        '8': short(8, address(a.get('nextLoadAddress'))),
        '9': short(9, '; '.join(joined('UN ' + str(g.get('unNumber') or ''), 'PG ' + str(g.get('packagingGroup')) if g.get('packagingGroup') else '', joined(g.get('quantity'), label('units', g.get('unitCode')))) for g in goods)),
        '10': short(10, a.get('exemptionAdrProvision'), 65),
        '30a': dt(a.get('sealOpenedDate')), '30b': dt(a.get('sealInstalledDate')),
        '31': short(31, joined(label('organisations', c.get('inspectorOrganisationId')), label('units', c.get('inspectorUnit')), ' '.join(filter(None, [c.get('inspectorFirstName'), c.get('inspectorLastName')])), c.get('inspectorProfession')), 155),
    }
    rows = []
    entries = structured(a.get('infringements'), list)
    known = json.loads((ROOT / 'templates/adr-form/checkpoints.json').read_text())
    by_code = {}
    for entry in entries:
        code = entry.get('checkpointCode')
        if code not in {k['code'] for k in known} or code in by_code:
            raise ValueError('Unknown or duplicate checkpoint: ' + str(code))
        by_code[code] = entry
    for definition in known:
        entry = by_code.get(definition['code'], {})
        status = entry.get('inspectionStatus', '')
        if status not in ('', 'C', 'NC', 'NA'):
            raise ValueError('Unknown inspection status')
        records = entry.get('records') or []
        risk, reference = '', ''
        if len(records) == 1:
            risk = records[0].get('riskCategory', '')
            reference = joined(records[0].get('adrReference'), ', '.join(records[0].get('responsibleParticipants') or []))
        if records:
            # Complete records are kept together in the appendix, with exact row association.
            details = []
            for i, r in enumerate(records, 1):
                details.append(joined(str(i) + '.', 'Risk: ' + str(r.get('riskCategory') or '—'), 'ADR: ' + str(r.get('adrReference') or '—'), 'Osalejad: ' + ', '.join(r.get('responsibleParticipants') or []), r.get('reg2016403Code'), r.get('reg2016403Severity'), r.get('notes')))
            appendix.append({'title': definition['title'], 'text': '\n'.join(details)})
            if len(records) > 1:
                risk, reference = 'Vt lisa', 'Vt lisa: ' + definition['code']
            elif len(reference) > 60:
                reference = 'Vt lisa: ' + definition['code']
        if entry.get('notCheckedReason'):
            appendix.append({'title': definition['code'] + ' — kontrollimata jätmise põhjus', 'text': entry['notCheckedReason']})
        rows.append(dict(definition, status=status, risk=risk, reference=reference))
    others = structured(a.get('otherInfringements'), list)
    for item in others:
        details = [joined('Kontrolli staatus: ' + str(item.get('inspectionStatus') or '—'), item.get('notCheckedReason'))]
        for i, r in enumerate(item.get('records') or [], 1):
            details.append(joined(str(i) + '.', 'Risk: ' + str(r.get('riskCategory') or '—'), 'ADR: ' + str(r.get('adrReference') or '—'), 'Osalejad: ' + ', '.join(r.get('responsibleParticipants') or []), r.get('reg2016403Code'), r.get('reg2016403Severity'), r.get('notes')))
        appendix.append({'title': '27. ' + str(item.get('title') or 'Muu rikkumine'), 'text': '\n'.join(details)})
    if others:
        rows[-1]['reference'] = 'Vt lisa: muud rikkumised'
    notes = joined(a.get('notes'), a.get('infringementNotesSummary'), a.get('exemptionNotes'))
    if a.get('transportInterruptionApplied') is True:
        notes = joined(notes, 'Veo katkestamine rakendatud.')
    if a.get('sealOpened') is True and not a.get('sealOpenedDate'):
        notes = joined(notes, 'Pitser rikutud; kuupäev puudub.')
    if a.get('proceedingType'):
        notes = joined(notes, 'Menetlus: ' + label('proceedingTypes', a['proceedingType']), a.get('proceedingReferenceNumber'))
    fields['29'] = short(29, notes, 230)
    # Official report checkbox follows publication of this ADR form.
    official = a.get('status') == 'published'
    return dict(blank=blank, fields=fields, rows=rows, appendix=appendix, warnings=warnings,
                form_number=joined(a.get('subFormNumber'), 'v' + str(a['version']) if a.get('version') else ''),
                exemption=a.get('exemptionApplied'), containers=structured(a.get('containerTypes'), list),
                measures=structured(a.get('correctiveMeasures'), list), official=official,
                warning=a.get('resultType') == 'warning', ban=a.get('drivingBanApplied') is True)


TEMPLATES = {
    'adr-form': 'adr-form/adr.html.j2',
    'compound-form': 'compound-form/form.html.j2',
    'foreign-violation-form': 'foreign-violation-form/form.html.j2',
    'labour-inspection': 'labour-inspection/form.html.j2',
    'good-repute': 'good-repute/form.html.j2',
    'tram-card': 'tram-card/form.html.j2',
    'vehicle-technical': 'vehicle-technical/form.html.j2',
    'trailer-technical': 'trailer-technical/form.html.j2',
    'drive-rest-form': 'drive-rest-form/form.html.j2',
    'transport-interruption': 'transport-interruption/form.html.j2',
    'rsi': 'rsi/form.html.j2',
}


def render_html(payload=None, blank=False, template='adr-form'):
    if template not in TEMPLATES:
        raise ValueError('Unknown template')
    if type(blank) is not bool:
        raise ValueError('blank must be boolean')
    if payload is not None and not isinstance(payload, dict):
        raise ValueError('data must be an object')
    env = Environment(loader=FileSystemLoader(ROOT / 'templates'), autoescape=True, undefined=StrictUndefined)
    if template == 'adr-form':
        data = context(payload, blank)
    elif template in ('compound-form', 'foreign-violation-form', 'labour-inspection', 'good-repute', 'tram-card'):
        from forms import build_standalone_context
        data = build_standalone_context(template, payload, blank)
    elif template == 'rsi':
        from forms import build_rsi_context
        data = build_rsi_context(payload, blank)
    else:
        from forms import build_context
        data = build_context(template, payload, blank)
    return env.get_template(TEMPLATES[template]).render(**data), data['warnings']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--template', choices=TEMPLATES, default='adr-form')
    parser.add_argument('--input', type=Path)
    parser.add_argument('--blank', action='store_true')
    parser.add_argument('--output', type=Path, required=True, help='Output base path (without extension)')
    parser.add_argument('--html-only', action='store_true')
    args = parser.parse_args()
    payload = json.loads(args.input.read_text()) if args.input and not args.blank else None
    html, warnings = render_html(payload, args.blank, args.template)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.with_suffix('.html').write_text(html)
    if not args.html_only:
        from weasyprint import HTML
        # No user-supplied URLs are needed by this self-contained template.
        def deny_resources(url, *args, **kwargs):
            raise ValueError('External resources are disabled: ' + url)
        HTML(string=html, url_fetcher=deny_resources).write_pdf(args.output.with_suffix('.pdf'))
    for warning in warnings:
        print('MÄRKUS:', warning)


def render_pdf(payload=None, blank=False, template='adr-form'):
    from weasyprint import HTML
    html, warnings = render_html(payload, blank, template)
    def deny_resources(url, *args, **kwargs):
        raise ValueError('External resources disabled')
    return HTML(string=html, url_fetcher=deny_resources).write_pdf(), warnings


if __name__ == '__main__':
    main()
