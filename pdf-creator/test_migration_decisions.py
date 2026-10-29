import json
import unittest
from render import ROOT, render_html

class OwnerPrintTests(unittest.TestCase):
    def test_historical_other_proceeding_keeps_all_paragraphs_in_print(self):
        payload=json.loads((ROOT/'examples/vehicle-technical/filled.json').read_text())
        payload['technicalForm'].update(resultType='legacy_proceedings',proceedingType='legacy_other',enforcementDecision='LS §205; LS §210 lg 2; <TEST>')
        html,_=render_html(payload,False,'vehicle-technical')
        for value in ('Muu menetlus (LJVIS1)','Kohaldati väärteomenetlust (LJVIS1)','LS §205','LS §210 lg 2','&lt;TEST&gt;'):
            self.assertIn(value,html)
        self.assertNotIn('rikkeid või puudusi ei avastatud',html)
    def test_unknown_birth_date_stays_unknown_in_print(self):
        payload=json.loads((ROOT/'examples/good-repute/filled.json').read_text())
        payload['goodReputeForm'].update(dateOfBirth=None,certificateIssueDate=None,unfitFromDate=None,unfitUntilDate=None)
        html,_=render_html(payload,False,'good-repute')
        self.assertIn('Sünniaeg',html)
        self.assertNotIn('None',html)
        self.assertNotIn('Invalid Date',html)

if __name__=='__main__':unittest.main()
