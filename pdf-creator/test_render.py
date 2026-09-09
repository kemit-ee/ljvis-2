import copy
import json
import unittest
from render import ROOT, context, render_html


class TemplateTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads((ROOT / 'examples/filled.json').read_text())

    def test_blank_discards_all_supplied_data(self):
        text, _ = render_html(self.payload, blank=True)
        self.assertNotIn('123ABC', text)
        self.assertNotIn('×', text)
        self.assertNotIn('Näidis', text)
        self.assertIn('31.', text)

    def test_json_strings_and_envelope_match_parsed_objects(self):
        encoded = copy.deepcopy(self.payload)
        for key in ('infringements', 'dangerousGoods', 'containerTypes', 'correctiveMeasures', 'lastLoadAddress', 'nextLoadAddress'):
            encoded['adrForm'][key] = json.dumps(encoded['adrForm'][key])
        encoded['adrForm'] = {'response': encoded['adrForm']}
        encoded['compoundForm'] = {'response': encoded['compoundForm']}
        self.assertEqual(render_html(encoded), render_html(self.payload))

    def test_long_text_is_preserved_in_appendix_and_escaped(self):
        note = '<img src="https://example.com/private">ÕÄÖÜ & ŠŽ ' * 200
        self.payload['adrForm']['notes'] = note
        data = context(self.payload)
        self.assertIn('Vt lisa', data['fields']['29'])
        self.assertTrue(any(note.strip() in item['text'] for item in data['appendix']))
        text, _ = render_html(self.payload)
        self.assertIn('&lt;img', text)
        self.assertNotIn('<img', text)

    def test_multiple_infringements_keep_row_and_record_association(self):
        records = self.payload['adrForm']['infringements'][1]['records']
        records.append({'riskCategory': 'III', 'adrReference': 'TEST-SECOND', 'responsibleParticipants': ['L', 'P'], 'notes': 'LAST-RECORD'})
        data = context(self.payload)
        self.assertEqual(data['rows'][1]['risk'], 'Vt lisa')
        self.assertIn('LAST-RECORD', str(data['appendix']))

    def test_official_report_follows_adr_publication(self):
        for status in ('saved', 'confirmed', 'published', 'deleted', None):
            with self.subTest(status=status):
                self.payload['adrForm']['status'] = status
                self.payload['compoundForm']['status'] = 'published'
                # Legacy input and proceedings cannot override ADR publication.
                self.payload['printOptions'] = {'officialReport': status != 'published'}
                self.payload['adrForm']['resultType'] = 'misdemeanor_proceedings'
                data = context(self.payload)
                self.assertEqual(data['official'], status == 'published')
                self.assertFalse(data['warnings'])
        self.payload['adrForm']['status'] = 'published'
        self.assertFalse(context(self.payload, blank=True)['official'])
        self.assertNotIn('×', render_html(self.payload, blank=True)[0])
        self.assertIsNone(context(blank=True)['exemption'])

    def test_mismatched_parent_and_bad_json_rejected(self):
        self.payload['adrForm']['compoundFormKey'] = 999
        with self.assertRaises(ValueError):
            context(self.payload)
        self.payload['adrForm']['compoundFormKey'] = 1001
        self.payload['adrForm']['infringements'] = 'broken'
        with self.assertRaises(ValueError):
            context(self.payload)


if __name__ == '__main__':
    unittest.main()
