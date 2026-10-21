"""Owner-approved migration regressions. DB tests always roll back.

MIGRATION_TEST_DSN must point at a disposable migrated live_review_* database.
Run: python3 -m unittest discover -s tests/sql -p test_owner_decisions_20261019.py -v
"""
import os
import re
import sys
import unittest
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import psycopg2
from psycopg2.extras import Json

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'DSL/migration'))
import decisions
import enrich
import migrate


def values(**kw):
    return {key: [(val, None, None)] for key, val in kw.items()}


class Rules(unittest.TestCase):
    def resolve(self, old, new, times=None):
        return decisions.resolve_shared([1, 2], {1: old, 2: new},
            times or {1: datetime(2024,1,1), 2: datetime(2024,1,2)}, enrich.scalar)

    def test_latest_address_not_max_id_or_lexical_max(self):
        merged, choices = self.resolve(values(**{'InspectionAddress.Line1':'ZZ old'}),
                                       values(**{'InspectionAddress.Line1':'AA new'}))
        self.assertEqual(enrich.scalar(merged, 'InspectionAddress.Line1'), 'AA new')
        self.assertEqual(choices, {'InspectionAddress.Line1':2})
        merged, _ = self.resolve(values(**{'InspectionAddress.Line1':'Old ID, newer edit'}),
                                values(**{'InspectionAddress.Line1':'New ID, older edit'}),
                                {1:datetime(2024,2,1),2:datetime(2024,1,1)})
        self.assertEqual(enrich.scalar(merged,'InspectionAddress.Line1'),'Old ID, newer edit')

    def test_latest_empty_and_mask_never_resurrect_old_value(self):
        for new in ('', '***'):
            merged, _ = self.resolve(values(**{'Driver.FirstName':'Old'}), values(**{'Driver.FirstName':new}))
            self.assertEqual(enrich.scalar(merged,'Driver.FirstName'),new or None)

    def test_missing_and_tied_chronology_remain_blockers(self):
        for times in ({1:None,2:datetime(2024,1,1)}, {1:datetime(2024,1,1),2:datetime(2024,1,1)}):
            with self.assertRaises(ValueError):
                self.resolve(values(**{'Vehicle.RegNo':'A'}),values(**{'Vehicle.RegNo':'B'}),times)

    def test_second_driver_roles_normalized_before_selection(self):
        old=values(**{'Driver.FirstName':'Primary','AdditionalDriver.FirstName':'Second'})
        new=values(**{'RoadWorthinessTeamMember':'true','Driver.FirstName':'Second new','AdditionalDriver.FirstName':'Primary'})
        merged, _=self.resolve(old,new)
        self.assertEqual(enrich.scalar(merged,'Driver.FirstName'),'Primary')
        self.assertEqual(enrich.scalar(merged,'AdditionalDriver.FirstName'),'Second new')

    def test_numeric_cleanup_is_not_truncation(self):
        for raw, expected in [(' 000123 ',123),('000',0),('2147483647',2147483647),('2147483648',None),('12.3',None),('-1',None),('1 23',None),('***',None)]:
            self.assertEqual(enrich.integer(raw),expected)

    def test_exact_tachograph_generation(self):
        for raw, expected in [('arukas','smart_1'),('ARUKAS','smart_1'),('arukas-2','smart_2'),('smart_2','smart_2'),('SMART anything',None)]:
            self.assertEqual(decisions.tachograph(raw),expected)

    def test_p10_preserves_every_selected_paragraph_without_claiming_ok(self):
        v=values(otsus='alustati_menetlust',otsus_vaarteomenetlus='otsus_alustativaarteo_muumenetlust',
                 vm_joustunud_205='on',vm_joustunud_210_lg2='on',vm_joustunud_219='off',rikkumine_muu='§ TEST')
        result=decisions.other_proceeding('RoadControlCard2012',v,enrich.scalar)
        self.assertEqual(result,{'result_type':'legacy_proceedings','proceeding_type':'legacy_other',
          'enforcement_decision':'LS §205; LS §210 lg 2; Muu rikkumise § (LJVIS1): § TEST'})
        self.assertIsNone(decisions.other_proceeding('Roadworthiness2012',v,enrich.scalar))
        for field in ('otsus', 'otsus_vaarteomenetlus'):
            changed={**v, field:[('unknown',None,None)]}
            self.assertIsNone(decisions.other_proceeding('RoadControlCard2012',changed,enrich.scalar))
        with self.assertRaises(ValueError):
            decisions.other_proceeding('RoadControlCard2012',values(otsus='alustati_menetlust',
                otsus_vaarteomenetlus='otsus_alustativaarteo_muumenetlust'),enrich.scalar)
        v['vm_joustunud_unknown']=[('on',None,None)]
        with self.assertRaises(ValueError):decisions.other_proceeding('RoadControlCard2012',v,enrich.scalar)

    def test_binding_rule_does_not_depend_on_ids_or_numbers(self):
        class Cursor:
            def __init__(self, forms, bindings):
                self.results=iter((forms,bindings))
            def execute(self, *args): pass
            def fetchall(self): return next(self.results)
        for first, second in [(1,2),(91001,92002)]:
            forms=[(i,'SYNTHETIC-'+str(i),'RoadControlCard2012','Published',datetime(2024,1,1))
                   for i in (first,second)]
            _,groups=decisions.source_context(Cursor(forms,[]),'test')
            self.assertEqual(dict(groups),{('ControlForm',first):[first],('ControlForm',second):[second]})
            _,groups=decisions.source_context(Cursor(forms,[(first,9),(second,9)]),'test')
            self.assertEqual(dict(groups),{('Control',9):[first,second]})
            with self.assertRaises(ValueError):
                decisions.source_context(Cursor(forms,[(first,9),(first,10)]),'test')



@unittest.skipUnless(os.getenv('MIGRATION_TEST_DSN'), 'Disposable migrated PostgreSQL required')
class Database(unittest.TestCase):
    def setUp(self):
        self.db=psycopg2.connect(os.environ['MIGRATION_TEST_DSN']);self.cur=self.db.cursor()
        self.cur.execute('SELECT current_database()')
        if not self.cur.fetchone()[0].startswith('live_review_'): raise RuntimeError('Disposable target required')
        self.cur.execute('SELECT migration_run_id FROM migration.form_link LIMIT 1')
        self.run=self.cur.fetchone()[0]

    def tearDown(self):
        self.db.rollback();self.db.close()

    def query(self, sql, params=()):
        self.cur.execute(sql,params);return self.cur.fetchall()

    def clone(self, table, **overrides):
        row=self.query(f'SELECT to_jsonb(t) FROM forms.{table} t LIMIT 1')[0][0]
        row.update(overrides)
        # New dev schema: a snapshot must advance the target form's revision.
        row['revision']=self.query(f'SELECT coalesce(max(revision),0)+1 FROM forms.{table} WHERE {table}_key=%s',(row[table+'_key'],))[0][0]
        row['id']=self.query('SELECT nextval(pg_get_serial_sequence(%s,\'id\'))',('forms.'+table,))[0][0]
        self.cur.execute(f'INSERT INTO forms.{table} SELECT (jsonb_populate_record(NULL::forms.{table},%s)).*',(Json(row),))
        return row

    def test_source_mask_cannot_disclose_stale_typed_date(self):
        self.assertEqual(self.query("SELECT migration.source_date('***','1980-01-01'::timestamp)")[0][0],None)
        self.assertEqual(str(self.query("SELECT migration.source_date('01.02.2000',NULL)::date")[0][0]),'2000-02-01')

    def test_null_historical_dates_and_normal_form_constraint(self):
        self.clone('good_repute_form',good_repute_form_key=-91901,legacy_import=True,date_of_birth=None,certificate_issue_date=None)
        self.cur.execute('SAVEPOINT nonlegacy')
        with self.assertRaises(psycopg2.IntegrityError):
            self.clone('good_repute_form',good_repute_form_key=-91902,legacy_import=False,date_of_birth=None)
        self.cur.execute('ROLLBACK TO SAVEPOINT nonlegacy')
        sql=(ROOT/'DSL/Resql/ljvis/POST/control-forms/good-repute/date-policy.sql').read_text().split('*/',1)[1].replace(':id','%(id)s')
        self.cur.execute(sql,{'id':'-91901'});self.assertEqual(self.cur.fetchone()[:2],(True,True))
        self.cur.execute(sql,{'id':''});self.assertEqual(self.cur.fetchone(),(False,False,False,False))

    def test_resql_save_preserves_import_flag_and_null_dates(self):
        row=self.clone('good_repute_form',good_repute_form_key=-91901,legacy_import=True,date_of_birth=None,
                       certificate_issue_date=None,unfit_from_date=None,unfit_until_date=None,fitness_status='unfit',created_at='2020-01-01T00:00:00Z')
        params=dict(key='-91901',status='confirmed',personalCode=row['personal_code'],firstName=row['first_name'],lastName=row['last_name'],
                    dateOfBirth='',placeOfBirth='',certificateNumber=row['certificate_number'],certificateIssueDate='',
                    certificateCountryCode=row['certificate_country_code'],fitnessStatus='unfit',unfitFromDate='',unfitUntilDate='',created_by='test',expected_revision='')
        sql=(ROOT/'DSL/Resql/ljvis/POST/control-forms/good-repute/update.sql').read_text().split('*/',1)[1]
        sql=re.sub(r'(?<!:):([a-zA-Z_]+)',r'%(\1)s',sql)
        self.cur.execute(sql,params)
        self.assertEqual(self.query('SELECT legacy_import,date_of_birth,certificate_issue_date FROM forms.good_repute_form WHERE good_repute_form_key=-91901 ORDER BY created_at DESC,id DESC LIMIT 1')[0],(True,None,None))

    def test_verify_detects_wrong_parent_status_and_value(self):
        self.cur.execute("SELECT target_key FROM migration.form_link WHERE target_table='forms.compound_form' LIMIT 1")
        key=self.cur.fetchone()[0]
        self.cur.execute("UPDATE forms.compound_form SET status=CASE WHEN status='published' THEN 'confirmed' ELSE 'published' END,address='WRONG' WHERE compound_form_key=%s",(key,))
        issues=decisions.mismatches(self.cur,self.run,enrich.scalar)
        self.assertTrue(any(p['check']=='owner_parent_status' for p in issues))
        self.assertTrue(any(p['check']=='owner_shared_value:address' for p in issues))

    def test_unbound_forms_stay_separate_regardless_of_identity(self):
        # Invented identities; identical header values must not imply a binding.
        for i,kind in [(-92001,'Roadworthiness2012'),(-92002,'RoadControlCard2012')]:
            self.cur.execute("INSERT INTO staging.raw_control_form(id,form_code,form_type_name,control_stage,updated_date) VALUES (%s,%s,%s,'Published','2026-03-30')",(i,'SYNTHETIC-'+str(-i),kind))
            self.cur.execute("INSERT INTO migration.disposition(migration_run_id,legacy_source,legacy_id,form_type,target_table,reason) VALUES (%s,'ControlForm',%s,%s,%s,'eligible')",(self.run,str(i),kind,'forms.sp_driver_form' if kind=='Roadworthiness2012' else 'forms.vehicle_technical_form'))
        _,groups=decisions.source_context(self.cur,self.run)
        self.assertEqual(groups[('ControlForm',-92001)],[-92001])
        self.assertEqual(groups[('ControlForm',-92002)],[-92002])

    def test_eav_timestamp_participates_in_latest_card(self):
        i=self.query("SELECT legacy_id::bigint FROM migration.form_link WHERE target_table='forms.compound_form' LIMIT 1")[0][0]
        self.cur.execute("UPDATE staging.raw_control_form_value SET updated_date='2099-01-01' WHERE control_form_id=%s",(i,))
        forms,_=decisions.source_context(self.cur,self.run)
        self.assertEqual(forms[i][4],datetime(2099,1,1))

    def lifecycle_fixture(self, imported=True):
        parent=-91000
        self.clone('compound_form',compound_form_key=parent,status='confirmed',created_at='2020-01-01T00:00:00Z',
                   extra_data={'legacy_decision':decisions.APPROVAL} if imported else {})
        self.clone('sp_driver_form',sp_driver_form_key=-91001,compound_form_key=parent,status='confirmed',enforcement_decision=None,created_at='2020-01-01T00:00:00Z')
        self.clone('vehicle_technical_form',vehicle_technical_form_key=-91002,compound_form_key=parent,status='confirmed',enforcement_decision=None,created_at='2020-01-01T00:00:00Z')
        return parent

    def apply(self, table, key, found='true', decision='TEST decision'):
        return self.query('SELECT * FROM forms.apply_etoimik_decision(%s,%s,%s,%s,%s)',(table,key,found,decision,''))

    def status(self, table, key):
        return self.query(f'SELECT status FROM forms.{table} WHERE {table}_key=%s ORDER BY created_at DESC,id DESC LIMIT 1',(key,))[0][0]

    def test_e_toimik_waits_for_last_part_and_is_idempotent(self):
        parent=self.lifecycle_fixture()
        self.assertEqual(self.apply('sp_driver_form',-91001,'false'),[])
        self.assertEqual(self.apply('sp_driver_form',-91001,decision=''),[])
        self.apply('sp_driver_form',-91001)
        self.assertEqual(self.status('sp_driver_form',-91001),'published')
        self.assertEqual(self.status('compound_form',parent),'confirmed')
        self.apply('vehicle_technical_form',-91002)
        self.assertEqual(self.status('compound_form',parent),'published')
        self.assertEqual(self.apply('sp_driver_form',-91001),[])
        self.assertEqual(self.query('SELECT count(*) FROM forms.compound_form WHERE compound_form_key=%s',(parent,))[0][0],2)

    def test_nonimported_sync_behaviour_unchanged(self):
        parent=self.lifecycle_fixture(False)
        self.apply('sp_driver_form',-91001)
        self.assertEqual(self.status('sp_driver_form',-91001),'published')
        self.assertEqual(self.status('compound_form',parent),'confirmed')
        self.assertEqual(self.query('SELECT count(*) FROM forms.sp_driver_form WHERE sp_driver_form_key=-91001')[0][0],2)

    def test_manual_last_publication_updates_imported_parent(self):
        parent=self.lifecycle_fixture()
        self.apply('sp_driver_form',-91001)
        self.clone('vehicle_technical_form',vehicle_technical_form_key=-91002,compound_form_key=parent,
                   status='published',created_at='2021-01-01T00:00:00Z')
        self.assertEqual(self.status('compound_form',parent),'published')

    def test_old_imported_case_remains_e_toimik_candidate(self):
        parent=self.lifecycle_fixture()
        self.cur.execute("UPDATE forms.compound_form SET authority='PPA',drivers='[{\"personal_code_ee\":\"00000000000\"}]' WHERE compound_form_key=%s",(parent,))
        self.cur.execute("UPDATE forms.sp_driver_form SET proceeding_type='KIIR',proceeding_reference_number='TEST' WHERE sp_driver_form_key=-91001")
        query=(ROOT/'DSL/Resql/ljvis/POST/control-forms/drive-rest-form/driver/select_etoimik_candidates.sql').read_text().split('*/',1)[1]
        self.assertIn(-91001,[r[0] for r in self.query(query)])

    def test_rollbacks_refuse_data_loss(self):
        self.clone('good_repute_form',good_repute_form_key=-91901,legacy_import=True,date_of_birth=None)
        self.cur.execute('SAVEPOINT rollback_test')
        sql=(ROOT/'DSL/Liquibase/changelog/20261126100000-migration-unknown-dates-rollback.sql').read_text()
        with self.assertRaises(psycopg2.Error):self.cur.execute(sql)
        self.cur.execute('ROLLBACK TO SAVEPOINT rollback_test')
        self.clone('vehicle_technical_form',vehicle_technical_form_key=-91903,result_type='legacy_proceedings')
        self.cur.execute('SAVEPOINT rollback_technical')
        sql=(ROOT/'DSL/Liquibase/changelog/20261126120000-historical-technical-proceeding-rollback.sql').read_text()
        with self.assertRaises(psycopg2.Error):self.cur.execute(sql)
        self.cur.execute('ROLLBACK TO SAVEPOINT rollback_technical')



@unittest.skipUnless(os.getenv('MIGRATION_OWNER_TEST_DSN'),'Full owner-decision synthetic migration required')
class OwnerProfile(unittest.TestCase):
    def setUp(self):
        self.db=psycopg2.connect(os.environ['MIGRATION_OWNER_TEST_DSN']);self.cur=self.db.cursor()
        self.cur.execute('SELECT current_database()')
        if not self.cur.fetchone()[0].startswith('live_review_'):raise RuntimeError('Disposable target required')
    def tearDown(self):self.db.rollback();self.db.close()
    def test_unbound_forms_have_separate_parents(self):
        self.cur.execute("""SELECT l.legacy_id,l.target_key FROM migration.form_link l
            WHERE l.target_table='forms.compound_form' AND l.legacy_source='ControlForm'
              AND NOT EXISTS (SELECT 1 FROM staging.raw_control_to_form_binding b
                JOIN staging.raw_control c ON c.id=b.control_id
                WHERE b.control_form_id::text=l.legacy_id)""")
        rows=self.cur.fetchall()
        self.assertTrue(rows, 'Fixture must exercise missing bindings')
        self.assertEqual(len(rows),len({key for _,key in rows}))
    def test_latest_mask_and_header_win_but_draft_does_not(self):
        self.cur.execute("SELECT c.address,c.drivers->0->>'first_name',c.drivers->0->>'birth_date',c.vehicle_mileage,c.status FROM migration.form_link l JOIN forms.compound_form c ON c.compound_form_key=l.target_key WHERE l.legacy_id='149991' AND l.target_table='forms.compound_form'")
        self.assertEqual(self.cur.fetchone(),('NEW','***',None,123,'confirmed'))
        self.cur.execute("SELECT count(*) FROM migration.form_link WHERE legacy_id='149993'")
        self.assertEqual(self.cur.fetchone()[0],0)
    def test_all_matching_proceedings_keep_the_paragraphs(self):
        self.cur.execute("SELECT migration_run_id FROM migration.form_link LIMIT 1")
        run=self.cur.fetchone()[0]
        forms=decisions.technical_forms(self.cur,run)
        eav=decisions.load_eav(self.cur,forms)
        matched=0
        for i,kind in forms.items():
            expected=decisions.other_proceeding(kind,eav[i],enrich.scalar)
            if expected is None: continue
            matched+=1
            self.cur.execute("""SELECT t.result_type,t.proceeding_type,t.enforcement_decision
                FROM forms.vehicle_technical_form t JOIN migration.form_link l
                ON l.target_table='forms.vehicle_technical_form' AND l.target_key=t.vehicle_technical_form_key
                WHERE l.legacy_source='ControlForm' AND l.legacy_id=%s""",(str(i),))
            self.assertEqual(self.cur.fetchall(),[(expected['result_type'],expected['proceeding_type'],expected['enforcement_decision'])])
            self.cur.execute("SELECT count(*) FROM migration.finding WHERE issue='unmapped_control_result' AND legacy_id=%s AND migration_run_id=%s",(str(i),run))
            self.assertEqual(self.cur.fetchone()[0],0)
        self.assertGreater(matched,0, 'Fixture must exercise historical other proceedings')


if __name__=='__main__': unittest.main()
