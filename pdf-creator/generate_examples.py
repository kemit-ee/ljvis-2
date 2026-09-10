"""Generate reproducible, wholly synthetic blank and filled review documents."""
import copy,json
from pathlib import Path
from render import ROOT, TEMPLATES, render_html, render_pdf
c=json.loads((ROOT/'examples/filled.json').read_text())['compoundForm']
c.update(vehicleVin='TESTVIN0000000001',vehicleCategoryCode='B_2012',vehicleMileage='125000',vehicleMake='Näidismark',vehicleModel='Proovimudel',companyActivityLicenceCopyNumber='NÄIDIS-123')
c['drivers'][0].update(citizenshipCode='EE',birthDate='1990-01-01')
c['trailers'][0].update(make='Näidishaagis',model='Proov',categoryCode='D_2012',vin='TRAILERTEST001')
base={'compoundForm':c,'labels':{'countries':{'EE':'Eesti'},'organisations':{'DEMO':'Näidisasutus'}}}
payloads={}
payloads['vehicle-technical']=dict(base,technicalForm={'id':'3001','compoundFormKey':1001,'subFormNumber':'NÄIDIS-T-001','version':1,'status':'published','resultType':'extraordinary_inspection','partsSummary':[{'partCode':'CAA_'+str(i),'status':'non_compliant' if i==1 else 'checked'} for i in range(10)],'partsDefects':[{'partCode':'CAA_1','defectCode':'CAA_1.1.11','severity':'OV'}],'notes':'SÜNTEETILISED ANDMED. Näidisrike PDF-kujunduse kontrollimiseks.'})
payloads['trailer-technical']=copy.deepcopy(payloads['vehicle-technical']);payloads['trailer-technical']['technicalForm']['trailerRegNr']='456DEF'
payloads['transport-interruption']=dict(base,transportInterruptionForm={'id':'4001','compoundFormKey':1001,'subFormNumber':'NÄIDIS-KV-001','version':1,'status':'published','headerText':'NÄIDISASUTUS · väljamõeldud andmed','residenceCountry':'EE','residenceCity':'Tallinn','residenceAddressLine':'Näidise tee 2','interruptionReason':'SÜNTEETILISED ANDMED. Puuduv veodokument, näidis otsuse kujunduse kontrollimiseks.','legalBases':['DEMO_ALUS'],'terminationCondition':'Kuni näidises kirjeldatud puuduse kõrvaldamiseni.','personApplications':'Näidistaotlus puudub.'},printOptions={'interruptionDate':'2026-09-09','interruptionTime':'10:40'})
payloads['transport-interruption']['labels']=copy.deepcopy(base['labels']);payloads['transport-interruption']['labels']['legalBases']={'DEMO_ALUS':'Näidis — õiguslik alus kinnitatakse tegelike andmete põhjal'}
payloads['drive-rest-form']=dict(base,driveRestForm={'id':'5001','compoundFormKey':1001,'subFormNumber':'NÄIDIS-SP-001','version':1,'status':'published','transportType':'Veosevedu','transportNature':'Tasuline','transportClasses':[{'classCode':'DEMO','className':'Näidisvedu'}],'documentChecks':[{'documentCode':'JUHILUBA','documentName':'Juhiluba','violationCode':'NÄIDIS','severityCode':'SI'}],'otherDocuments':[{'documentCode':'VEOSE_DOKUMENDID','documentName':'Veodokument','result':'NOUETEKOHANE','notes':''}],'spApplicability':'RAKENDATAKSE','tachographTypeCode':'DIGITAL','checkedDaysCount':'56','workDaysCount':'40','otherActivityDaysCount':'16','violations5612006':[{'violationCode':'SI901','severityCode':'SI','isDetected':'true'}],'massDimensionMeasurements':[{'measurementType':'Mass (kg)','actualValue':'18000','allowedValue':'18000','excessValue':'0','axleNumber':''}],'resultType':'warning','notes':'SÜNTEETILISED NÄIDISANDMED — ei kajasta tegelikku kontrolli.'})
payloads['rsi']={'rsiMessage':{'id':'6001','businessCaseId':'EE-RSI-NÄIDIS','rsiFrom':'EE','rsiTo':'FI','originatingAuthority':'KLIM','vehicleCategory':'N3','vehicleRegistrationNumber':'ABC123','vehicleRegistrationCountry':'FI','vehicleIdentificationNumber':'TESTVIN123','odometerReading':123456,'driverFirstName':'TEST','driverFamilyName':'DRIVER','driverLicenceNumber':'TEST123','driverLicenceCountry':'FI','inspectionIdentifier':'th-2026-000453/1','inspectionLocation':'Tallinn','inspectionDatetime':'2026-09-10T12:30:00','inspectionAuthorityOrName':'Politsei- ja Piirivalveamet','inspectionPassed':False,'ptiRequested':True,'vehicleProhibitionOrRestriction':False,'checkedItems':[{'partCode':'CAA_1','status':'non_compliant','defects':[{'defectCode':'CAA_1.1.1','severity':'OV'}]},{'partCode':'CAA_10','status':'checked','defects':[]},{'partCode':'CAA_20','status':'checked','defects':[]}]}}
for template,payload in payloads.items():
 folder=ROOT/'examples'/template;folder.mkdir(exist_ok=True)
 (folder/'filled.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
 for blank,name in [(True,'blank'),(False,'filled')]:
  html,warnings=render_html(payload,blank,template);pdf,_=render_pdf(payload,blank,template)
  (folder/(name+'.html')).write_text(html);(folder/(name+'.pdf')).write_bytes(pdf)
  print(template,name,len(pdf),warnings)
