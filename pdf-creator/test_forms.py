import copy,json,unittest
from render import ROOT,TEMPLATES,render_html
from forms import build_context

class FormTests(unittest.TestCase):
    def fixture(self,name):return json.loads((ROOT/'examples'/name/'filled.json').read_text())
    def test_every_new_template_blank_discards_personal_data_and_ticks(self):
        for name in TEMPLATES:
            if name=='adr-form':continue
            with self.subTest(template=name):
                html,_=render_html(self.fixture(name),True,name)
                self.assertNotIn('×',html)
                for value in ('123ABC','Mari','Proovimudel','00000000'):
                    self.assertNotIn(value,html)
    def test_every_control_form_template_has_blank_and_filled_contract(self):
        names=('compound-form','foreign-violation-form','labour-inspection','good-repute','tram-card')
        for name in names:
            with self.subTest(template=name):
                payload=self.fixture(name)
                filled,_=render_html(payload,False,name)
                blank,_=render_html(payload,True,name)
                self.assertIn('<table',filled)
                self.assertIn('<table',blank)
                self.assertNotEqual(filled,blank)
                key={'compound-form':'compoundForm','foreign-violation-form':'foreignViolationForm','labour-inspection':'labourInspectionForm','good-repute':'goodReputeForm','tram-card':'tramCard'}[name]
                payload[key].pop('id')
                with self.assertRaises(ValueError):render_html(payload,False,name)
    def test_correct_parent_and_json_text_contract(self):
        for name,key,field in [('vehicle-technical','technicalForm','partsDefects'),('drive-rest-form','driveRestForm','documentChecks'),('transport-interruption','transportInterruptionForm','legalBases')]:
            p=self.fixture(name);parsed=render_html(p,False,name)
            p[key][field]=json.dumps(p[key][field]);p[key]={'response':p[key]};p['compoundForm']={'response':p['compoundForm']}
            self.assertEqual(parsed,render_html(p,False,name))
            p[key]['response']['compoundFormKey']=999
            with self.assertRaises(ValueError):render_html(p,False,name)
    def test_ok_form_cannot_assert_roadworthiness_for_defective_vehicle(self):
        p=self.fixture('vehicle-technical');p['technicalForm']['resultType']='ok'
        with self.assertRaises(ValueError):render_html(p,False,'vehicle-technical')
    def test_trailer_is_matched_by_registration_not_position(self):
        p=self.fixture('trailer-technical')
        d=build_context('trailer-technical',p);self.assertEqual(d['fields']['reg'],'456DEF')
        self.assertEqual(d['fields']['vin'],'TRAILERTEST001')
        p['technicalForm']['trailerRegNr']='NO-SUCH-TRAILER'
        with self.assertRaises(ValueError):build_context('trailer-technical',p)
    def test_cargo_summary_uses_real_caa10_code(self):
        p=self.fixture('vehicle-technical');p['technicalForm']['partsSummary']=[{'partCode':'CAA_10','checked':True,'hasDefect':True}]
        rows=build_context('vehicle-technical',p)['parts']
        row=next(r for r in rows if r['code']=='CAA_10')
        self.assertEqual(row['status'],'non_compliant');self.assertIn('Veose kinnitamine',row['name'])
    def test_ok_result_with_cargo_securing_issue_still_prints_roadworthy_act(self):
        p=self.fixture('vehicle-technical');p['technicalForm']['resultType']='ok'
        p['technicalForm']['partsSummary']=[{'partCode':'CAA_10','checked':True,'hasDefect':True}]
        p['technicalForm']['partsDefects']=[{'defectCode':'CAA_10.A','severity':'VO'}]
        d=build_context('vehicle-technical',p)
        self.assertEqual(d['layout'],'roadworthy-act')
    def test_unknown_defect_is_preserved_and_known_defect_marked(self):
        p=self.fixture('vehicle-technical');p['technicalForm']['partsDefects'].append({'partCode':'CAA_1','defectCode':'FUTURE_CODE','severity':'EOV'})
        rows=[r for page in build_context('vehicle-technical',p)['defect_pages'] for col in page for r in col]
        self.assertEqual(next(r for r in rows if r['code']=='CAA_1.1.11')['selections'],['OV'])
        self.assertEqual(next(r for r in rows if r['code']=='FUTURE_CODE')['selections'],['EOV'])
    def test_interruption_dates_are_not_inferred_from_control_date(self):
        p=self.fixture('transport-interruption');p.pop('printOptions')
        d=build_context('transport-interruption',p)
        self.assertEqual(d['fields']['startDate'],'');self.assertTrue(d['warnings'])
        self.assertEqual(d['fields']['receiptDate'],'')
    def test_long_notes_and_multiple_records_preserved(self):
        p=self.fixture('drive-rest-form');note='<script>õäöü</script>'*200+' END-SENTINEL';p['driveRestForm']['notes']=note
        html,_=render_html(p,False,'drive-rest-form')
        self.assertNotIn('<script>',html);self.assertIn('END-SENTINEL',html);self.assertIn('Vt lisa',html)
        p['driveRestForm']['violations5612006'].append({'violationCode':'UNKNOWN_CODE','severityCode':'VSI','isDetected':'true'})
        html,_=render_html(p,False,'drive-rest-form');self.assertIn('UNKNOWN_CODE',html)

    def test_technical_back_is_always_part_of_control_card(self):
        html,_=render_html(self.fixture('vehicle-technical'),False,'vehicle-technical')
        self.assertIn('Kontrollitavate detailide loetelu',html)
        self.assertNotIn('technical-back',TEMPLATES)

    def test_rsi_prints_every_failed_reason_with_allowed_boxes_only(self):
        from forms import build_rsi_context
        for blank in (True,False):
            data=build_rsi_context(self.fixture('rsi'),blank)
            reasons=[r for r in data['reason_rows'] if r['kind']=='reason']
            self.assertEqual(476,len(reasons))
            self.assertEqual(12,len(data['parts']))
            self.assertTrue(all(any(b['allowed'] for b in r['boxes']) for r in reasons))
        filled=build_rsi_context(self.fixture('rsi'),False)
        ticked=[r['label'] for r in filled['reason_rows'] if r['kind']=='reason' and any(b['checked'] for b in r['boxes'])]
        self.assertEqual(3,len(ticked))
        vacuum=next(r for r in filled['reason_rows'] if r['kind']=='reason' and r['label'].startswith('a) Ebapiisav õhurõhk'))
        self.assertEqual([False,True,False],[b['checked'] for b in vacuum['boxes']])
        self.assertEqual([False,True,True],[b['allowed'] for b in vacuum['boxes']])
        self.assertEqual({'0':'checked','1':'non_compliant','20':'non_compliant'},{p['name'].split('.')[0]:p['status'] for p in filled['parts'] if p['status']})
    def test_rsi_incoming_erru_shape_and_legacy_codes(self):
        from forms import build_rsi_context
        p=self.fixture('rsi');p['rsiMessage']['checkedItems']=json.dumps([{'itemType':5,'itemFailed':True,'failedChecks':[{'failedReason':'5.2.3.a','failedAssessment':'Dangerous'}]}])
        data=build_rsi_context(p,False)
        tyre=next(r for r in data['reason_rows'] if r['kind']=='reason' and r['boxes'][2]['checked'])
        self.assertTrue(tyre['label'].startswith('a) '))
        p['rsiMessage']['checkedItems']=[{'partCode':'CAA_1','status':'non_compliant','defects':[{'defectCode':'CAA_1.1.1','severity':'OV'}]}]
        html,_=render_html(p,False,'rsi')
        self.assertIn('CAA_1.1.1 (OV)',html)
        self.assertIn('Pidurisüsteem',html)
    def test_real_partssummary_shape_is_checked_hasdefect_not_status(self):
        # Regression for a production print failure: partsSummary rows are
        # {partCode, checked, hasDefect} (frontend commit 1782322f, 2026-09-14),
        # not the old {partCode, status}. Payload below is a real published
        # form's API response (driving_ban result, CAA_1/CAA_5 defects, no
        # 'status' key anywhere in partsSummary).
        p=self.fixture('vehicle-technical')
        p['technicalForm'].update(
            resultType='driving_ban',
            violations=['MSI302'],
            partsDefects=[{'defectCode':'CAA_1.1.21','partCode':'CAA_1','severity':'OV'},{'defectCode':'CAA_5.2.3','partCode':'CAA_5','severity':'EOV'}],
            partsSummary=[
                {'partCode':'CAA_0','checked':True,'hasDefect':False},
                {'partCode':'CAA_1','checked':True,'hasDefect':True},
                {'partCode':'CAA_2','checked':True,'hasDefect':False},
                {'partCode':'CAA_3','checked':True,'hasDefect':False},
                {'partCode':'CAA_4','checked':True,'hasDefect':False},
                {'partCode':'CAA_5','checked':True,'hasDefect':True},
                {'partCode':'CAA_6','checked':True,'hasDefect':False},
                {'partCode':'CAA_7','checked':True,'hasDefect':False},
                {'partCode':'CAA_8','checked':True,'hasDefect':False},
                {'partCode':'CAA_9','checked':False,'hasDefect':False},
                {'partCode':'CAA_10','checked':True,'hasDefect':False},
                {'partCode':'CAA_11','checked':False,'hasDefect':False},
            ],
        )
        html,_=render_html(p,False,'vehicle-technical')
        self.assertIn('Rikkumised', html)
        d=build_context('vehicle-technical',p)
        statuses={row['code']:row['status'] for row in d['parts']}
        self.assertEqual(statuses['CAA_1'],'non_compliant')
        self.assertEqual(statuses['CAA_5'],'non_compliant')
        self.assertEqual(statuses['CAA_9'],'not_checked')
        self.assertEqual(statuses['CAA_10'],'checked')

if __name__=='__main__':unittest.main()
