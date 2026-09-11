"""Adapters for compound-linked print forms. Names match public Ruuter bodies."""
import json
from render import ROOT, unwrap, structured, joined, dt

TITLES = {
 'vehicle-technical': 'MOOTORSÕIDUKI JA SELLE HAAGISE TEHNONÕUETELE VASTAVUSE KONTROLLKAAR',
 'trailer-technical': 'MOOTORSÕIDUKI JA SELLE HAAGISE TEHNONÕUETELE VASTAVUSE KONTROLLKAAR',
 'drive-rest-form': 'AUTOJUHI SÕIDU- JA PUHKEAJA KONTROLLKAART',
 'transport-interruption': 'AUTOVEO KATKESTAMISE OTSUS',
}
PARTS = ['Identifitseerimine','Pidurisüsteem','Rooliseade','Nähtavus','Valgustusseadmed ja elektrisüsteem','Teljed, veljed, rehvid, vedrustus','Šassii ja selle kinnitused','Muu varustus, sh sõidumeerik ja kiiruspiirik','Saasted, sh heitgaasid ning kütuse- ja õlilekked','Reisijateveoks kasutatava sõiduki täiendavad sõlmed','Veose kinnitamine']
CATEGORIES=[('A_2012','N2'),('B_2012','N3'),('C_2012','O3'),('D_2012','O4'),('E_2012','M2'),('F_2012','M3'),('G3_2012','T1b'),('H2_2012','T2b'),('I_2012','T3b'),('J_2012','T4.1b'),('K_2012','T4.2b'),('L_2012','T4.3b'),('OTHER_2012','Muu')]
RESULTS={'ok':'Korras','warning':'Hoiatus','precept':'Ettekirjutus','misdemeanor_proceedings':'Väärteomenetlus','driving_ban':'Sõidukeeld / juhtimiselt kõrvaldamine','arrest':'Arest','transport_interruption':'Autovedu on katkestatud','extraordinary_inspection':'Erakorraline ülevaatus','extraordinary_inspection_ta':'Erakorraline ülevaatus ja liiklusregistri andmete täpsustamine'}
PROCEEDINGS={'LYHI':'Väärteo lühimenetlus','KIIR':'Väärteo kiirmenetlus','YLD':'Väärteo üldmenetlus'}

STANDALONE_TITLES = {
 'compound-form': 'SÕIDUKI JA VEOETTEVÕTJA KONTROLLKAART',
 'foreign-violation-form': 'VÄLISRIIGI RIKKUMISE KONTROLLKAART',
 'labour-inspection': 'TÖÖINSPEKTSIOONI KONTROLLKAART',
 'good-repute': 'HEA MAINE NÕUDELE MITTEVASTAVAKS TUNNISTATUD VEOKORRALDUSJUHI ANDMEVORM',
 'tram-card': 'TRANSPORDIAMETI KONTROLLKAART',
}


class SafeDict(dict):
    """A print-view mapping where an absent optional field renders as empty."""
    def __missing__(self, key):
        return ''


def safe_tree(value):
    if isinstance(value, dict):
        return SafeDict({key: safe_tree(item) for key, item in value.items()})
    if isinstance(value, list):
        return [safe_tree(item) for item in value]
    return value


def build_standalone_context(template, payload=None, blank=False):
    """Normalise standalone control forms for their print-only Jinja templates."""
    payload = {} if blank else (payload or {})
    key = {
        'compound-form': 'compoundForm',
        'foreign-violation-form': 'foreignViolationForm',
        'labour-inspection': 'labourInspectionForm',
        'good-repute': 'goodReputeForm',
        'tram-card': 'tramCard',
    }[template]
    f = safe_tree(unwrap(payload.get(key, {})))
    if not blank and not f.get('id'):
        raise ValueError('Filled mode requires ' + key + '.id')
    labels = safe_tree(payload.get('labels', {}))
    bundled = json.loads((ROOT/'templates/labels.json').read_text())
    appendix, warnings = [], []

    def label(group, code):
        if code in ('', None):
            return ''
        return str(labels.get(group, {}).get(str(code), bundled.get(str(code), code)))

    def short(title, value, limit=400):
        value = str(value or '')
        if len(value) > limit or value.count('\n') > 6:
            appendix.append({'title': title, 'text': value})
            return 'Vt lisa: ' + title
        return value

    drivers = safe_tree(structured(f.get('drivers'), list))
    trailers = safe_tree(structured(f.get('trailers'), list))
    fields = {
        'place': short('Kontrolli koht', joined(label('countries', f.get('controlCountryCode')), f.get('county'), f.get('city'), f.get('address'), label('roads', f.get('road')), f.get('roadOther'), str(f['kilometer']) + ' km' if f.get('kilometer') else '')),
        'date': dt(f.get('controlDate') or f.get('inspectionDate')),
        'time': str(f.get('controlTime') or f.get('inspectionTime') or '')[:5],
        'vehicle': joined(f.get('vehicleMake'), f.get('vehicleModel')),
        'vehicleReg': joined(f.get('vehicleCountryCode'), f.get('vehicleRegNr')),
        'vehicleVin': f.get('vehicleVin') or '',
        'company': joined(f.get('companyName'), f.get('companyRegCode')),
        'companyAddress': joined(f.get('companyAddressLine1'), f.get('companyAddressLine2'), f.get('companyCity'), f.get('companyCounty'), f.get('companyPostalCode'), label('countries', f.get('companyCountryCode'))),
        'licence': f.get('companyActivityLicenceCopyNumber') or f.get('licenceCopyNumber') or '',
        'inspector': joined(f.get('inspectorName'), f.get('inspectorFirstName'), f.get('inspectorLastName'), label('organisations', f.get('inspectorOrganisationId')), label('units', f.get('inspectorUnit')), f.get('inspectorProfession')),
        'notes': short('Märkused', f.get('notes')),
    }
    people = [{**p, 'display': joined(' '.join(filter(None, [p.get('firstName'), p.get('lastName')])), p.get('personalCodeEe') or p.get('personalCodeForeign'), label('countries', p.get('citizenshipCode')), dt(p.get('birthDate')))} for p in drivers]
    trailer_rows = [{**t, 'display': joined(t.get('make'), t.get('model'), t.get('countryCode'), t.get('regNr'), t.get('vin'))} for t in trailers]
    data = dict(template=template, title=STANDALONE_TITLES[template], number=joined(f.get('formNumber'), 'v'+str(f['version']) if f.get('version') else ''), blank=blank, f=f, fields=fields, drivers=people, trailers=trailer_rows, appendix=appendix, warnings=warnings, label=label, yes=yes, dt=dt, short=short)
    if template == 'foreign-violation-form':
        data.update(
            violations=[label('violations', x) for x in structured(f.get('violations'), list)],
            additional_sanctions=[label('sanctions', x) for x in structured(f.get('additionalSanctionCodes'), list)],
            sanction=label('sanctions', f.get('sanctionCode')),
            recommendation=label('recommendedMeasures', f.get('recommendedMeasureCode')),
        )
    elif template == 'labour-inspection':
        matrix = safe_tree(structured(f.get('controlsMatrix'), list))
        data.update(matrix=matrix, violations=safe_tree(structured(f.get('violations'), list)))
    elif template == 'tram-card':
        data.update(
            transport_classes=safe_tree(structured(f.get('transportClasses'), list)),
            document_checks=safe_tree(structured(f.get('documentChecks'), list)),
            other_documents=safe_tree(structured(f.get('otherDocuments'), list)),
            cabotage=safe_tree(structured(f.get('cabotageViolations'), list)),
            violation_groups=[
                {'title': title, 'rows': safe_tree(structured(f.get(field), list))}
                for field, title in [('violations5612006','Määrus (EÜ) nr 561/2006'),('violations1652014','Määrus (EL) nr 165/2014'),('violations200215','Direktiiv 2002/15/EÜ'),('violations5932008','Määrus (EÜ) nr 593/2008'),('violations20201057','Direktiiv (EL) 2020/1057')]
            ],
        )
    return data

RSI_PARTS = {
 'CAA_0':'Sõiduki identifitseerimine','CAA_1':'Pidurisüsteem','CAA_2':'Rooliseade',
 'CAA_3':'Nähtavus','CAA_4':'Valgustusseadmed ja elektrisüsteemi osad',
 'CAA_5':'Teljed, veljed, rehvid, vedrustus','CAA_6':'Šassii ja selle kinnitused',
 'CAA_7':'Muu varustus','CAA_8':'Välisriigi vedaja kabotaažvedu','CAA_9':'Täiendavad ülevaatused reisijateveoks kasutatavale sõidukile',
 'CAA_10':'10. Sõiduki sobivus','CAA_20':'20. Kinnitusmeetodid'
}

def build_rsi_context(payload=None, blank=False):
    raw = {} if blank else unwrap((payload or {}).get('rsiMessage', payload or {}))
    if not blank and not raw.get('id'):
        raise ValueError('Filled RSI mode requires rsiMessage.id')
    checked = structured(raw.get('checkedItems'), list)
    rows = []
    by_code = {item.get('partCode'): item for item in checked}
    for code, name in RSI_PARTS.items():
        item = by_code.get(code, {})
        rows.append({'name': name, 'status': item.get('status', ''), 'defects': structured(item.get('defects'), list)})
    rows = [row for row in rows if row['status'] in ('checked', 'non_compliant') or not blank]
    identification = structured(raw.get('identificationDetails'), dict)
    address = identification.get('address') or {}
    return {
        'title': 'TEHNOKONTROLLI TEADE RSI', 'number': raw.get('businessCaseId', ''),
        'blank': blank, 'r': raw, 'rows': rows, 'warnings': [], 'appendix': [],
        'inspection_date': dt(raw.get('inspectionDatetime')),
        'inspection_time': str(raw.get('inspectionDatetime') or '')[11:16],
        'purpose': raw.get('requestPurpose', ''),
        'holder_type': identification.get('isVehicleHolder', ''),
        'holder_name': identification.get('transportUndertakingName') or identification.get('companyName') or joined(identification.get('firstName'), identification.get('familyName')),
        'holder_licence': identification.get('communityLicenceNumber', ''),
        'holder_address': address.get('address', ''), 'holder_city': address.get('city', ''),
        'holder_country': address.get('country', ''), 'holder_postcode': address.get('postCode', ''),
    }


def yes(value):
    if value in (True, 'true'): return True
    if value in (False, 'false', '', None): return False
    raise ValueError('Invalid boolean value')


def build_context(template, payload=None, blank=False):
    payload={} if blank else (payload or {})
    is_technical=template in ('vehicle-technical','trailer-technical')
    key='technicalForm' if is_technical else 'driveRestForm' if template=='drive-rest-form' else 'transportInterruptionForm'
    c=unwrap(payload.get('compoundForm',{})); f=unwrap(payload.get(key,{})); opt=payload.get('printOptions',{})
    if not blank:
        if not c.get('id') or not f.get('id'): raise ValueError('Filled mode requires compound and '+key+' IDs')
        if str(c['id'])!=str(f.get('compoundFormKey')): raise ValueError('compoundFormKey does not match compound.id')
    labels=payload.get('labels',{}); bundled=json.loads((ROOT/'templates/labels.json').read_text())
    warnings=[]; appendix=[]
    def label(group,code):
        return str(labels.get(group,{}).get(str(code),bundled.get(str(code),code))) if code not in ('',None) else ''
    def short(title,value,limit=220):
        value=str(value or '')
        if len(value)>limit or value.count('\n')>3:
            appendix.append({'title':title,'text':value});return 'Vt lisa: '+title
        return value
    def person(p):
        return joined(' '.join(filter(None,[p.get('firstName'),p.get('lastName')])),p.get('personalCodeEe') or p.get('personalCodeForeign') or dt(p.get('birthDate')))
    drivers=structured(c.get('drivers'),list);trailers=structured(c.get('trailers'),list)
    driver_index=opt.get('driverIndex',0)
    if type(driver_index) is not int or driver_index<0:raise ValueError('driverIndex must be a nonnegative integer')
    if drivers and driver_index>=len(drivers):raise ValueError('driverIndex outside compound.drivers')
    driver=drivers[driver_index] if drivers else {}
    vehicle={'regNr':c.get('vehicleRegNr'),'countryCode':c.get('vehicleCountryCode'),'make':c.get('vehicleMake'),'model':c.get('vehicleModel'),'vin':c.get('vehicleVin'),'categoryCode':c.get('vehicleCategoryCode'),'categoryOther':c.get('vehicleCategoryOther'),'mileage':c.get('vehicleMileage')}
    vehicle_mode='trailer' if template=='trailer-technical' else opt.get('vehicle','vehicle')
    if is_technical and vehicle_mode=='trailer':
        candidates=[t for t in trailers if t.get('regNr')==f.get('trailerRegNr') and f.get('trailerRegNr')]
        if not blank and len(candidates)!=1:raise ValueError('trailerRegNr must identify exactly one compound trailer')
        vehicle=candidates[0] if candidates else {}
    elif vehicle_mode!='vehicle':raise ValueError('vehicle must be vehicle or trailer')
    fields={
      'place':short('Kontrolli koht',joined(label('countries',c.get('controlCountryCode')),c.get('county'),c.get('city'),c.get('address'),label('roads',c.get('road')),c.get('roadOther'),str(c['kilometer'])+' km' if c.get('kilometer') is not None else '')),
      'date':dt(c.get('controlDate')),'time':str(c.get('controlTime') or '')[:5],
      'vehicle':short('Sõiduk',joined(vehicle.get('make'),vehicle.get('model'))),'reg':vehicle.get('regNr') or '', 'country':vehicle.get('countryCode') or '', 'vin':vehicle.get('vin') or '', 'mileage':vehicle.get('mileage') or '',
      'category':vehicle.get('categoryCode') or '', 'categoryOther':short('Muu kategooria',vehicle.get('categoryOther')),
      'trailers':short('Haagised','; '.join(joined(t.get('make'),t.get('model'),t.get('countryCode'),t.get('regNr')) for t in trailers)),
      'company':short('Vedaja',joined(c.get('companyName'),c.get('companyRegCode'))),
      'companyAddress':short('Vedaja aadress',joined(c.get('companyAddressLine1'),c.get('companyCity'),c.get('companyCounty'),c.get('companyPostalCode'),label('countries',c.get('companyCountryCode')))),
      'licence':c.get('companyActivityLicenceCopyNumber') or '',
      'driver':short('Juht',person(driver)), 'driverName':' '.join(filter(None,[driver.get('firstName'),driver.get('lastName')])), 'citizenship':label('countries',driver.get('citizenshipCode')),
      'secondDriver':short('Teine juht','; '.join(person(p) for i,p in enumerate(drivers) if i!=driver_index)),
      'inspector':short('Kontrollija',joined(c.get('inspectorFirstName'),c.get('inspectorLastName'),c.get('inspectorProfession'),label('organisations',c.get('inspectorOrganisationId')),label('units',c.get('inspectorUnit')))),
      'result':label('results',RESULTS.get(f.get('resultType'),f.get('resultType'))),
      'proceeding':joined(PROCEEDINGS.get(f.get('proceedingType'),f.get('proceedingType')),f.get('proceedingReferenceNumber')),
      'notes':short('Märkused',f.get('notes'),500),
    }
    layout='roadworthy-act' if is_technical and not blank and f.get('resultType')=='ok' else 'control-card'
    data=dict(layout=layout,title='KOMMERTSSÕIDUKI KONTROLLIAKT' if layout=='roadworthy-act' else TITLES[template],blank=blank,fields=fields,f=f,appendix=appendix,warnings=warnings,number=joined(f.get('subFormNumber'),'v'+str(f['version']) if f.get('version') else ''),categories=CATEGORIES)
    if is_technical:
        summary=structured(f.get('partsSummary'),list);defects=structured(f.get('partsDefects'),list)
        if layout=='roadworthy-act' and (defects or any(r.get('status')=='non_compliant' for r in summary)):
            raise ValueError('Roadworthy act requires no recorded defects or non-compliant parts')
        states={}
        for row in summary:
            if row.get('status') not in ('checked','not_checked','non_compliant'):raise ValueError('Invalid partsSummary status')
            if row.get('partCode') in states:raise ValueError('Duplicate partsSummary code')
            states[row.get('partCode')]=row.get('status')
        parts=[{'code':'CAA_'+str(11 if i==10 else i),'name':str(i)+'. '+n,'status':states.pop('CAA_'+str(11 if i==10 else i),'')} for i,n in enumerate(PARTS)]
        parts.extend({'code':code,'name':label('technicalParts',code),'status':status} for code,status in states.items())
        catalog=json.loads((ROOT/'templates/vehicle-technical/defects.json').read_text());selected={}
        for row in defects:
            if row.get('severity') not in ('VO','OV','EOV'):raise ValueError('Invalid defect severity')
            selected.setdefault(row.get('defectCode'),set()).add(row['severity'])
        full=[]
        for row in catalog:
            full.append(dict(row,selections=sorted(selected.pop(row['code'],set()))))
        for code,sevs in selected.items():full.append({'code':code,'part':'','name':label('technicalDefects',code),'allowed':['VO','OV','EOV'],'selections':sorted(sevs)})
        defect_rows=[{'code':r.get('defectCode'),'name':label('technicalDefects',r.get('defectCode')),'severity':r['severity']} for r in defects]
        # Chunked three-column print sheets; no row is discarded in blank or filled mode.
        pages=[]
        for start in range(0,len(full),90):
            chunk=full[start:start+90];pages.append([chunk[i:i+30] for i in range(0,len(chunk),30)])
        data.update(parts=parts,defects=defect_rows,defect_pages=pages)
        extra=[]
        for key,title in [('eraYvMntRegnr','Registreerimisnumber'),('eraYvMntVintin','VIN-/TIN-kood'),('eraYvMntAxles','Telgede arv'),('eraYvMntPlaces','Istekohtade arv'),('eraYvMntRebuilt','Ümberehitus')]:
            if yes(f.get(key)):extra.append(title)
        data['registry_changes']=', '.join(extra)
        data['transport_interruption']=yes(f.get('resultTransportInterruption'))
        data['violations']=[label('violations',v) for v in structured(f.get('violations'),list)]
    elif template=='transport-interruption':
        fields.update(header=short('Asutuse päis',f.get('headerText'),450),residence=short('Elukoht',joined(f.get('residenceAddressLine'),f.get('residenceCity'),f.get('residenceRegion'),f.get('residencePostalCode'),label('countries',f.get('residenceCountry')))),reason=short('Katkestamise põhjus',f.get('interruptionReason'),550),termination=short('Lõppemise tingimus',f.get('terminationCondition'),350),applications=short('Isiku taotlused',f.get('personApplications'),300),startDate=dt(opt.get('interruptionDate')),startTime=str(opt.get('interruptionTime') or '')[:5],end=short('Katkestamise lõpp',opt.get('interruptionUntil')),receiptDate=dt(opt.get('receiptDate')))
        data['legal_bases']=[label('legalBases',x) for x in structured(f.get('legalBases'),list)]
        if not blank and not opt.get('interruptionDate'):warnings.append('Katkestamise algusaeg puudub Ruuteri vastuses; printOptions.interruptionDate/interruptionTime jäävad tühjaks.')
    else:
        data['transport_class_catalog']=json.loads((ROOT/'templates/drive-rest-form/transport-classes.json').read_text())
        data['transport_class_codes']=[r.get('classCode') for r in structured(f.get('transportClasses'),list)]
        data['transport_classes']=[joined(t.get('className') or label('transportClasses',t.get('classCode'))) for t in structured(f.get('transportClasses'),list)]
        other=structured(f.get('otherDocuments'),list);base=json.loads((ROOT/'templates/drive-rest-form/other-documents.json').read_text());by={r.get('documentCode'):r for r in other}
        for row in base:
            item=by.pop(row['code'],{});row.update(result=item.get('result',''),notes=short('Dokument '+row['name'],item.get('notes'),160))
        if not blank and f.get('transportType') != 'Sõitjatevedu':
            base=[r for r in base if r['code'] not in {'SOIDUKI_VEDAJA_NIMI','LIINI_NUMBER','LIINI_NIMETUS','ATL_SOIDUPLAAN_ENNETAB','ATL_PEATUS_PUUDUMINE','ATL_VALE_PEATUS','ATL_VALE_SOIDUK'} or r['result']]
        base.extend({'code':r.get('documentCode'),'name':r.get('documentName') or label('documents',r.get('documentCode')),'result':r.get('result',''),'notes':short('Dokument',r.get('notes'))} for r in by.values())
        data['other_documents']=base
        data['document_categories']=json.loads((ROOT/'templates/drive-rest-form/document-categories.json').read_text())
        data['document_checks']=[{'name':r.get('documentName') or r.get('level2Name') or label('documents',r.get('documentCode')),'code':r.get('violationCode') or r.get('level3Code') or '', 'severity':r.get('severityCode') or r.get('level3Name') or ''} for r in structured(f.get('documentChecks'),list)]
        data['cabotage']=[{'name':label('violations',r.get('violationCode')),'severity':r.get('severityCode','')} for r in structured(f.get('cabotageViolations'),list)]
        catalog=json.loads((ROOT/'templates/drive-rest-form/violations.json').read_text())
        groups=[]
        for field,title in [('violations5612006','Määrus (EÜ) nr 561/2006'),('violations1652014','Määrus (EL) nr 165/2014'),('violations200215','Direktiiv 2002/15/EÜ'),('violations5932008','Määrus (EÜ) nr 593/2008'),('violations20201057','Direktiiv (EL) 2020/1057')]:
            rows=[]
            for r in structured(f.get(field),list):
                matches=[x for x in catalog if x['code']==r.get('violationCode')]
                name=joined(matches[0]['name'],matches[0]['threshold']) if len(matches)==1 else label('violations',r.get('violationCode'))
                if len(matches)>1:warnings.append('Mitmetähenduslik rikkumiskood '+str(r.get('violationCode'))+'; trükitud koodina, vastet ei oletata.')
                rows.append({'code':r.get('violationCode',''),'name':name,'severity':r.get('severityCode',''),'detected':yes(r.get('isDetected'))})
            groups.append({'title':title,'rows':rows})
        data['violation_groups']=groups;data['violation_catalog']=catalog
        data['measurements']=structured(f.get('massDimensionMeasurements'),list)
        data['tachograph_options']=[('ANALOGUE','Analoogsõidumeerik'),('DIGITAL','Digitaalne sõidumeerik'),('SMART_1','Arukas sõidumeerik SMART 1'),('SMART_2','Arukas sõidumeerik SMART 2')]
        data['tachograph']=label('tachographs',f.get('tachographTypeCode'))
        data['road_tax']=joined(label('roadTax',c.get('roadTaxStatus')),c.get('roadTaxNotes'))
        data['additional_measure']=RESULTS.get(f.get('additionalMeasure'),f.get('additionalMeasure') or '')
        data['atp']=yes(f.get('atpViolationFound'))
        data['atp_notes']=short('ATP',f.get('atpViolationDescription'))
        data['mass_noncompliant']=yes(f.get('massDimensionNonCompliant'))
        data['empty_run']=yes(f.get('transportEmptyRun'));data['exempt']=yes(f.get('transportNatureExempt'));data['not_downloaded']=yes(f.get('tachographDataNotDownloaded'))
    return data
