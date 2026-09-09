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
save('vehicle-technical/defects.json',rows)
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
save('labels.json',names)
