"""Synthetic diagnostic regressions; all database changes roll back.

Use MIGRATION_TEST_DSN pointing at a disposable, migrated live_review_* DB.
No real form identities or values are included in these fixtures.
"""
import csv
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

import psycopg2

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'DSL/migration'))
import diagnostics
import identifiers


@unittest.skipUnless(os.getenv('MIGRATION_TEST_DSN'), 'Disposable migrated DB required')
class DiagnosticEvidence(unittest.TestCase):
    def setUp(self):
        self.db = psycopg2.connect(os.environ['MIGRATION_TEST_DSN'])
        self.cur = self.db.cursor()
        self.cur.execute('SELECT current_database()')
        if not self.cur.fetchone()[0].startswith('live_review_'):
            self.db.close()
            raise RuntimeError('Disposable target required')
        self.cur.execute('SELECT migration_run_id FROM migration.form_link LIMIT 1')
        self.run = self.cur.fetchone()[0]
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.addCleanup(self.db.close)
        self.addCleanup(self.db.rollback)
        self.addCleanup(setattr, diagnostics, '_journal', None)
        # Third matching number is excluded, so it must not be a conflict peer.
        for i, code, status in [(9909001,'zz-2099-00001/1','Published'),
                                (9909002,'zz-2099-00001/2','Confirmed'),
                                (9909003,'zz-2099-00001/3','Saved'),
                                (9909004,'zz-2099-00004/1','Published'),
                                (9909005,'zz-2099-00005/1','Published'),
                                (9909006,'zz-2099-00001/0','Published'),
                                (9909007,'zz-2099-00001/1','Published')]:
            self.cur.execute('''INSERT INTO staging.raw_control_form
                (id,form_code,form_version,control_stage,form_type_name,controlled_date)
                VALUES (%s,%s,1,%s,'RoadControlCard2012','2099-01-01')''', (i,code,status))
            self.cur.execute('''INSERT INTO migration.disposition
                (migration_run_id,legacy_source,legacy_id,form_type,reason,target_table)
                VALUES (%s,'ControlForm',%s,'RoadControlCard2012',%s,'forms.vehicle_technical_form')''',
                (self.run,str(i),'excluded_status' if status=='Saved' else 'eligible'))
        self.cur.execute("UPDATE migration.disposition SET target_table='forms.sp_driver_form' WHERE migration_run_id=%s AND legacy_id='9909007'",(self.run,))
        identifiers.preflight(self.cur,self.run)
        self.long_value = 'SYNTHETIC,"Ü\nVIN_TOO_LONG'
        self.eav(9909101,9909001,'Vehicle.VinCode',self.long_value)
        self.eav(9909102,9909001,'Vehicle.VinCode','SHORT')
        self.finding('9909001','oversized_source_text','Vehicle.VinCode exceeds target length 17; no silent truncation')
        self.eav(9909103,9909002,'otsus','alustati_menetlust')
        self.eav(9909104,9909002,'otsus_vaarteomenetlus','otsus_alustativaarteo_muumenetlust')
        self.eav(9909105,9909002,'rikkumine_muu','')
        self.finding('9909002','unresolved_approved_proceeding','Historical other proceeding has no decision paragraphs; inspect source')
        self.finding('9909004','unmapped_control_result','Missing, unknown or multiple otsus values')
        self.eav(9909106,9909005,'otsus','ok')
        self.eav(9909107,9909005,'otsus','liiklemise_keeld')
        self.finding('9909005','unmapped_control_result','Missing, unknown or multiple otsus values')
        for control in (9909201,9909202):
            self.cur.execute('INSERT INTO staging.raw_control(id) VALUES (%s)',(control,))
            self.cur.execute('INSERT INTO staging.raw_control_to_form_binding(id,control_id,control_form_id) VALUES (%s,%s,9909001)',(control,control))
        self.finding('*','unresolved_owner_group','ControlForm:9909001: multiple control bindings')

    def eav(self, row, form, key, value):
        self.cur.execute('INSERT INTO staging.raw_control_form_value(id,control_form_id,classifier_name,value) VALUES (%s,%s,%s,%s)',(row,form,key,value))

    def finding(self, form, issue, detail):
        self.cur.execute("INSERT INTO migration.finding VALUES (%s,'blocker','ControlForm',%s,%s,%s)",(self.run,form,issue,detail))

    def exported(self):
        return {(r['legacy_id'],r['issue']):r for r in diagnostics.detailed_findings(self.cur,self.run)}

    def test_collision_has_all_selected_peers_and_original_numbers(self):
        row=self.exported()['9909001','source_document_number_collision']
        self.assertEqual(row['source_form_number'],'zz-2099-00001/1')
        self.assertEqual(row['field'],'FormCode')
        self.assertEqual(row['raw_value'],'zz-2099-00001/1')
        self.assertEqual({p['legacy_id'] for p in row['context']['conflicting_forms']},{'9909001','9909002'})
        self.assertEqual(row['context']['base_number'],'zz-2099-00001')

    def test_values_limits_and_binding_identity_are_self_contained(self):
        data=self.exported();row=data['9909001','oversized_source_text']
        self.assertEqual(row['raw_value'],[self.long_value])
        self.assertEqual(row['context']['target_max_length'],17)
        self.assertEqual(row['context']['source_values'][0]['actual_length'],len(self.long_value))
        self.assertEqual(row['context']['source_values'][0]['source_row_id'],9909101)
        owner=data['9909001','unresolved_owner_group']
        self.assertEqual(owner['source_form_number'],'zz-2099-00001/1')
        self.assertEqual(owner['raw_value'],[9909201,9909202])
        self.assertEqual(owner['context']['recorded_legacy_id'],'*')

    def test_absent_empty_and_multiple_values_are_distinct(self):
        data=self.exported();other=data['9909002','unresolved_approved_proceeding']
        self.assertEqual(other['raw_value']['rikkumine_muu'],[''])
        self.assertNotIn('rikkumine_muu',other['context']['missing_fields'])
        self.assertFalse(other['context']['paragraph_fields_present'])
        absent=data['9909004','unmapped_control_result']
        self.assertEqual(absent['raw_value']['otsus'],[])
        self.assertEqual(absent['context']['missing_fields'],['otsus'])
        multiple=data['9909005','unmapped_control_result']
        self.assertEqual(multiple['raw_value']['otsus'],['ok','liiklemise_keeld'])

    def test_export_is_read_only_and_survives_rollback_with_csv_roundtrip(self):
        self.cur.execute('SELECT * FROM migration.finding WHERE migration_run_id=%s ORDER BY 1,2,3,4,5,6',(self.run,))
        before=self.cur.fetchall()
        diagnostics.start(self.folder.name,str(self.run))
        diagnostics.checkpoint(self.cur,self.run,self.folder.name,'synthetic-preflight')
        rows=diagnostics.detailed_findings(self.cur,self.run)
        path=Path(self.folder.name)/'findings-detailed.csv'
        diagnostics.write_csv(path,rows,diagnostics.FINDING_COLUMNS)
        self.cur.execute('SELECT * FROM migration.finding WHERE migration_run_id=%s ORDER BY 1,2,3,4,5,6',(self.run,))
        self.assertEqual(before,self.cur.fetchall())
        self.db.rollback()
        events=[json.loads(line) for line in (Path(self.folder.name)/'events.jsonl').read_text().splitlines()]
        row=next(r for r in events if r.get('legacy_id')=='9909001' and r.get('issue')=='oversized_source_text')
        self.assertEqual(row['raw_value'],[self.long_value])
        self.assertTrue(row['reason']);self.assertEqual(row['source_form_number'],'zz-2099-00001/1')
        with path.open(newline='') as f:
            row=next(r for r in csv.DictReader(f) if r['legacy_id']=='9909001' and r['issue']=='oversized_source_text')
        self.assertEqual(json.loads(row['raw_value']),[self.long_value])
        self.assertEqual(path.stat().st_mode & 0o777,0o600)


if __name__=='__main__':
    unittest.main()
