"""Synthetic migration/diagnostic regressions. All DB mutations roll back.

MIGRATION_TEST_DSN must reference a disposable live_review_* target migrated
from the synthetic audit fixture. No production/source records are embedded.
"""
import json
import os
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
import psycopg2

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'DSL/migration'))
import decisions, diagnostics, enrich, evidence, migrate


class Numbers(unittest.TestCase):
    def test_bootstrap_configuration_failure_has_private_report(self):
        with tempfile.TemporaryDirectory() as d:
            env={**os.environ,'MIGRATION_ENV_FILE':os.devnull,'CUTOFF':'not-a-date',
                 'MIGRATION_LOG_DIR':d}
            env.pop('RUN_ID',None)
            result=subprocess.run([sys.executable,str(Path(migrate.__file__))],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,1)
            reports=list(Path(d).glob('*/failure.json'))
            self.assertEqual(len(reports),1)
            self.assertEqual(json.loads(reports[0].read_text())['type'],'ValueError')
            self.assertEqual(reports[0].stat().st_mode & 0o777,0o600)

    def test_approved_digits_only_and_boundaries(self):
        cases=[(' 000123 ',999,(123,'normalized')),('000',999,(0,'normalized')),
               ('999',999,(999,'unchanged')),('1000',999,(100,'right_digits_removed')),
               ('3000000000',2147483647,(300000000,'right_digits_removed')),
               ('2147483647',2147483647,(2147483647,'unchanged')),
               ('2147483648',2147483647,(214748364,'right_digits_removed')),
               ('9'*10000,999,(999,'right_digits_removed')),
               ('***',999,(None,'masked')),(' ',999,(None,'missing'))]
        for raw,limit,expected in cases:
            with self.subTest(raw=raw[:30]):self.assertEqual(decisions.approved_number(raw,limit),expected)
        for raw in ('-1','12.3','1 23','1e3','abc','１２３'):
            self.assertEqual(decisions.approved_number(raw,999),(None,'invalid'))
        self.assertIsNone(enrich.integer('3000000000'),'P12 must not apply to all integer fields')

    def test_durable_event_distinguishes_attempt_from_commit(self):
        with tempfile.TemporaryDirectory() as d:
            diagnostics.start(d,'test')
            try:
                diagnostics.owner(42,'OdometerReading','3000000000',300000000,'P12')
                diagnostics.emit('run_outcome',outcome='failed',target_transaction='rolled_back')
                diagnostics.export_owner_events(d)
                result=json.loads((Path(d)/'owner-decisions.json').read_text())
                self.assertEqual(result[0]['before'],'3000000000')
                self.assertEqual(result[0]['after'],300000000)
                self.assertEqual(result[0]['target_transaction'],'rolled_back')
                self.assertEqual((Path(d)/'events.jsonl').stat().st_mode & 0o777,0o600)
            finally: diagnostics._journal=None


@unittest.skipUnless(os.getenv('MIGRATION_TEST_DSN'),'Disposable synthetic migrated DB required')
class Database(unittest.TestCase):
    def setUp(self):
        self.db=psycopg2.connect(os.environ['MIGRATION_TEST_DSN'])
        self.cur=self.db.cursor()
        self.cur.execute('SELECT current_database()')
        if not self.cur.fetchone()[0].startswith('live_review_'):raise RuntimeError('Disposable target required')
        self.cur.execute('SELECT migration_run_id FROM migration.form_link LIMIT 1');self.run=self.cur.fetchone()[0]
        self.folder=tempfile.TemporaryDirectory();diagnostics.start(self.folder.name,str(self.run))
    def tearDown(self):
        self.db.rollback();self.db.close();self.folder.cleanup();diagnostics._journal=None

    def test_source_baseline_and_each_form_are_accounted(self):
        self.assertEqual(evidence.extraction_mismatches(self.cur,self.run),[])
        rows=diagnostics.reconciliation(self.cur,self.run,migrate.ALL_TARGETS)
        self.cur.execute('SELECT count(*) FROM migration.disposition WHERE migration_run_id=%s',(self.run,))
        self.assertEqual(len(rows),self.cur.fetchone()[0])
        self.assertTrue(rows)
        self.assertFalse(any(r['outcome'].startswith('missing') for r in rows))
        self.assertEqual(len({(r['legacy_source'],r['legacy_id']) for r in rows}),len(rows))

    def test_count_mismatch_names_the_table_and_numbers(self):
        self.cur.execute("UPDATE migration.extraction_manifest SET source_count=source_count+1 WHERE migration_run_id=%s AND source_table='raw_control_form_value'",(self.run,))
        result=evidence.extraction_mismatches(self.cur,self.run)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['table'],'raw_control_form_value')
        self.assertEqual(result[0]['source'],result[0]['staging']+1)

    def test_dropped_primary_link_has_source_number_and_id(self):
        self.cur.execute("SELECT legacy_id,target_table FROM migration.form_link WHERE target_table='forms.sp_driver_form' LIMIT 1")
        i,table=self.cur.fetchone()
        self.cur.execute('DELETE FROM migration.form_link WHERE legacy_id=%s AND target_table=%s',(i,table))
        row=next(r for r in diagnostics.reconciliation(self.cur,self.run,migrate.ALL_TARGETS) if r['legacy_id']==i)
        self.assertEqual(row['outcome'],'missing_target_link');self.assertTrue(row['source_form_number'])
        problems=migrate.check_integrity(self.cur,self.run)
        self.assertTrue(any(r['legacy_id']==i for p in problems if p['check']=='missing_target_links' for r in p['records']))

    def test_dangling_target_is_not_counted_as_migrated(self):
        self.cur.execute("UPDATE migration.form_link SET target_key=-987654 WHERE target_table='forms.sp_driver_form'")
        rows=diagnostics.reconciliation(self.cur,self.run,migrate.ALL_TARGETS)
        self.assertTrue(any(r['outcome']=='missing_target_row' for r in rows))

    def test_changed_source_reports_exact_row_and_field(self):
        self.cur.execute("SELECT id FROM staging.raw_control_form_value WHERE classifier_name='OdometerReading' LIMIT 1")
        i=self.cur.fetchone()[0]
        self.cur.execute("UPDATE staging.raw_control_form_value SET value='CHANGED' WHERE id=%s",(i,))
        details=evidence.row_differences(self.cur,self.run,['raw_control_form_value'])
        self.assertEqual(len(details),1);self.assertEqual(details[0]['source_id'],str(i))
        self.assertIn('value',details[0]['changed_fields']);self.assertIsNotNone(details[0]['control_form_id'])

    def test_wrong_number_or_clock_is_detected_per_field(self):
        self.cur.execute("SELECT target_key FROM migration.form_link WHERE target_table='forms.compound_form' AND legacy_id='960001'")
        key=self.cur.fetchone()[0]
        self.cur.execute("UPDATE forms.compound_form SET vehicle_mileage=1,control_time='15:00' WHERE compound_form_key=%s",(key,))
        problems=decisions.mismatches(self.cur,self.run,enrich.scalar)
        self.assertTrue(any(p['check']=='owner_numeric_value' and p['legacy_id']=='960001' for p in problems))
        self.assertTrue(any(p['check']=='owner_time_value' and p['legacy_id']=='960001' for p in problems))

    def test_synthetic_approved_values_and_valid_clock(self):
        self.cur.execute('''SELECT l.legacy_id,t.vehicle_mileage,t.kilometer,t.control_time::text
            FROM migration.form_link l JOIN forms.compound_form t ON t.compound_form_key=l.target_key
            WHERE l.target_table='forms.compound_form' AND l.legacy_id IN ('960000','960001','960002','960006')''')
        self.assertEqual({r[0]:r[1:] for r in self.cur.fetchall()},
            {'960000':(123,7,'14:35:00'),'960001':(300000000,123,'00:00:00'),
             '960002':(2147483647,999,'00:00:00'),'960006':(999999999,123,'07:05:00')})

    def test_sql_error_after_diagnostics_keeps_rows_outside_rollback(self):
        folder=Path(self.folder.name);(folder/'sql').mkdir()
        path=folder/'sql'/'04-injected-error.sql'
        path.write_text("""INSERT INTO migration.finding VALUES
            (:'run_id','warning','ControlForm','960001','synthetic_before_error','test');
            INSERT INTO migration.quality_report(migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,raw_value,applied_default)
            VALUES (:'run_id','ControlForm','960001','forms.compound_form','vehicle_mileage','synthetic_approval','3000000000','300000000');
            SELECT 1/0;""")
        with self.assertRaises(psycopg2.Error):
            migrate.observed_step(self.cur,self.run,folder,'injected',
                lambda:migrate.execute_file(self.cur,path,self.run,'2023-10-01'))
        self.db.rollback()
        self.cur.execute("SELECT count(*) FROM migration.finding WHERE issue='synthetic_before_error'")
        self.assertEqual(self.cur.fetchone()[0],0)
        events=[json.loads(line) for line in (folder/'events.jsonl').read_text().splitlines()]
        self.assertTrue(any(e.get('issue')=='synthetic_before_error' for e in events))
        self.assertTrue(any(e.get('issue')=='synthetic_approval' and e['raw_value']=='3000000000' for e in events))
        sql_error=next(e for e in events if e['event']=='sql_statement_failed')
        self.assertEqual(sql_error['postgres']['sqlstate'],'22012')
        self.assertEqual(sql_error['statement_index'],3)

    def test_unknown_fields_have_key_value_and_source_row(self):
        self.cur.execute("SELECT detail FROM migration.finding WHERE issue='unmapped_eav' AND legacy_id='960001'")
        findings=[json.loads(r[0]) for r in self.cur.fetchall()]
        row=next(r for r in findings if r['field']=='synthetic_unknown_violation')
        self.assertEqual(row['raw_value'],'on');self.assertIsNotNone(row['source_row_id'])


if __name__=='__main__':unittest.main()
