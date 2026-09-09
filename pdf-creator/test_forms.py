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
    def test_cargo_summary_uses_real_caa11_code(self):
        p=self.fixture('vehicle-technical');p['technicalForm']['partsSummary']=[{'partCode':'CAA_11','status':'non_compliant'}]
        rows=build_context('vehicle-technical',p)['parts']
        row=next(r for r in rows if r['code']=='CAA_11')
        self.assertEqual(row['status'],'non_compliant');self.assertIn('Veose kinnitamine',row['name'])
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

if __name__=='__main__':unittest.main()
