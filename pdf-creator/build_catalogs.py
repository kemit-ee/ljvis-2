"""Regenerate bundled print labels from repository SQL seed data; no database needed."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parent
REPO=Path('/Users/viljauss/code/ljvis-2') if not (ROOT.parent/'DSL').exists() else ROOT.parent
SQL=REPO/'DSL/Liquibase/changelog'
Q=r"'((?:[^']|'')*)'"
def tuples(file,n):
 text=(SQL/file).read_text()
 return [tuple(s.replace("''", "'") for s in row) for row in re.findall(r'\(\s*'+r'\s*,\s*'.join([Q]*n)+r'\s*\)',text)]
def save(path,data):
 p=ROOT/'templates'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
tech='20261020110000-technical-check-defect-classifier.sql'
rows=[{'part':p,'code':c,'name':n,'allowed':sev.split(',')} for p,c,n,sev in tuples(tech,4) if p.startswith('CAA_')]
# Migratsioonide 20261120100000 / 20261120120000 parandused (seeme 20261020110000 on juba dev-is avaldatud,
# seetõttu parandas DB neid UPDATE/DELETE/INSERT-iga; väljatrüki kataloog peab sama seisu kuvama).
corr='20261120100000-technical-check-classifier-corrections.sql'
dropped={'CAA_0.3','CAA_0.4','CAA_3.7','CAA_7.13.1','CAA_7.13.2','CAA_7.13.3'}
rows=[r for r in rows if r['code'] not in dropped]
corr_text=(SQL/corr).read_text()
renamed={m.group(2):m.group(1).replace("''","'") for m in re.finditer(r"SET name = '((?:[^']|'')*)'\s*WHERE code = '(CAA_[0-9.]+)'",corr_text)}
for r in rows:
 if r['code']=='CAA_8.4.1':r['code'],r['name']='CAA_8.4.2','8.4.2 Vedelikulekked'
 elif r['code'] in renamed:r['name']=renamed[r['code']]
have={r['code'] for r in rows}
rows+=[{'part':p,'code':c,'name':n,'allowed':sev.split(',')} for p,c,n,sev in tuples(corr,4) if p.startswith('CAA_') and c.startswith(p+'.') and c not in have]
rows.append({'part':'CAA_11','code':'CAA_11.1','name':'11.1 Muu tehniline viga','allowed':['VO','OV','EOV']})
# Hilisemad raskusastmete parandused (migratsioonid 20261203120000, 20261203130000).
fix={'CAA_1.1.7':['VO','OV'],'CAA_3.6':['VO','OV'],'CAA_4.1.2':['OV'],'CAA_4.2.2':['VO','OV'],'CAA_4.4.2':['VO','OV'],'CAA_4.5.3':['VO','OV'],'CAA_4.5.4':['OV'],'CAA_4.7.2':['VO','OV'],'CAA_4.10':['VO','OV'],'CAA_4.14.2':['OV'],'CAA_5.3.1':['VO','OV','EOV'],'CAA_6.1.4':['OV','EOV'],'CAA_6.1.8':['OV','EOV'],'CAA_6.1.9':['OV'],'CAA_6.2.1':['OV','EOV'],'CAA_6.2.5':['VO','OV','EOV'],'CAA_6.2.6':['VO','OV','EOV'],'CAA_6.2.9':['VO','OV'],'CAA_7.9':['OV'],'CAA_7.11':['OV'],'CAA_8.1.1':['OV','EOV'],'CAA_8.2.1.2':['OV'],'CAA_8.2.2.1':['OV'],'CAA_8.2.2.2':['OV'],'CAA_8.4.1':['OV','EOV'],'CAA_8.4.2':['OV','EOV'],'CAA_9.2':['OV','EOV'],'CAA_9.3':['OV','EOV'],'CAA_1.1.8':['VO','OV','EOV'],'CAA_1.1.15':['OV','EOV'],'CAA_1.1.17':['VO','OV','EOV'],'CAA_1.1.20':['OV'],'CAA_1.4.1':['OV'],'CAA_1.4.2':['OV'],'CAA_2.1.1':['VO','OV','EOV'],'CAA_2.2.2':['OV','EOV']}
# Grupp 2 numeratsiooni nihe (migratsioon 20261120100000): Lisa 2-s puudub 2.4.
shift={'CAA_2.5':('CAA_2.6','2.6 Elektrooniline roolivõimendi (Electronic Power Steering, EPS)'),'CAA_2.4':('CAA_2.5','2.5 Haagise esitelje pöördering')}
for r in rows:
 if r['code'] in shift:r['code'],r['name']=shift[r['code']]
fix.update({'CAA_2.5':['OV','EOV'],'CAA_2.6':['OV']})
for r in rows:r['allowed']=fix.get(r['code'],r['allowed'])
def natural(r):
 n=[int(x) for x in re.findall(r'[0-9]+',r['code'])]
 return (int(re.search(r'[0-9]+',r['part']).group()),n)
rows.sort(key=natural)
save('vehicle-technical/defects.json',rows)
# RSI_FAILED_REASON (direktiiv 2014/47/EL II/III lisa): (code, parent, name, severities).
rsi=[{'code':c,'parent':p or None,'name':n,'severities':sev.split(',') if sev else []} for c,p,n,sev in tuples('20261125100000-rsi-failed-reason-classifier.sql',4) if re.match(r'^(G:)?[0-9]',c)]
save('rsi/failed-reasons.json',rsi)
sp='20260828277000-initial-sp-form-classifiers.sql'
four=tuples(sp,4);parents={c:(n,d,p) for c,n,d,p in four if d not in ['MI','SI','VSI','MSI']}
violations=[]
for c,n,sev,p in four:
 if sev in ['MI','SI','VSI','MSI'] and p in parents:
  pn,article,group=parents[p]
  violations.append({'code':c,'name':pn,'threshold':n,'severity':sev,'article':article,'group':group})
save('drive-rest-form/violations.json',violations)
other=tuples(sp,2);other=[{'code':c,'name':n} for c,n in other if c in ['MOOTORSOIDUKI_LEPING','SOIDUKIJUHI_TOO_LEPING','VEOSE_DOKUMENDID','SUUREMOOTMELISE_VEOSE_ERILUBA','LIINIVEO_SOIDUPLAAN','OMAKULUL_VEOSEVEO_VASTAVUS','OMAKULUL_SOITJATEVEO_VASTAVUS']]
for r in other:
 if r['code']=='VEOSE_DOKUMENDID':r['name']='Veodokument'
save('drive-rest-form/other-documents.json',other)
# Snapshot labels retain exact identifiers; incoming labels can override their wording.
names={}
for f in sorted(SQL.glob('*.sql')):
 if any(x in f.name for x in ('initial-sp-form-classifiers','initial-technical-check-classifiers','initial-doc-right','initial-foreign-infringement','technical-check-defect')):
  for n in [2,3,4]:
   for row in tuples(f.name,n):
    if row[0].isupper() or row[0].startswith('CAA_'): names[row[0]]=row[1]
save('labels.json',names)
print('technical defects',len(rows),'driving violation bands',len(violations))
# Remaining paper checklist categories and newer document labels.
labour='20260828276000-initial-labour-inspection-classifiers.sql'
pairs=tuples(labour,2)
doc_codes={'JUHTIMIS_OIGUS','MOOTORSOIDUKI_TU','HAAGISE_TU','TEGEVUSLUBA','TEGEVUSLOA_ARAKIRI','VEOLUBA','JUHITUNNISTUS','AMETIKOOLITUS','LIINILUBA','JUHUVEO_SOIDULEHT'}
save('drive-rest-form/document-categories.json',[{'code':c,'name':n} for c,n in pairs if c in doc_codes])
save('drive-rest-form/transport-classes.json',[{'code':c,'name':n} for c,n in pairs if c not in doc_codes])
other += [{'code':c,'name':n} for c,n in tuples('20261110100000-other-documents-passenger-items.sql',2)]
for r in other:
 if r['code']=='SOIDUKIJUHI_TOO_LEPING':r['name']='Mootorsõidukijuhi töö- või võlaõiguslik leping või sellest lepingust osapoolte kinnitatud väljavõte'
save('drive-rest-form/other-documents.json',other)
for n in [2,3,4]:
 for row in tuples(labour,n):names[row[0]]=row[1]
for r in other:names[r['code']]=r['name']
# Tehnokaardi rikete nimed vastavad DB seisule pärast parandusi (vanad seemnenimed ja kustutatud koodid välja).
for c in dropped|{'CAA_8.4.1'}:names.pop(c,None)
for r in rows:names[r['code']]=r['name']
for c,n,sev in tuples('20261120100001-technical-check-cargo-securing-defects.sql',3)+tuples('20261206110000-technical-check-cargo-securing-directive.sql',3):
 if c.startswith('CAA_10.'):names[c]=n
save('labels.json',names)
