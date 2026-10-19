#!/usr/bin/env python3
"""Run the production risk SQL against isolated temporary form fixtures.
Usage: python3 tests/sql/risk-all-forms.py -- psql -U ljvis -d ljvis_db
"""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[2]
tables=('compound_form','sp_driver_form','sp_teammate_form','foreign_violation_form','tram_control_card','labour_inspection_form','vehicle_technical_form','trailer_technical_form','adr_form','form_search')
def remap(s):
    for t in tables: s=s.replace('forms.'+t,'fixture_'+t)
    return s.replace('classifier.classifier_value','fixture_classifier_value').replace('risk.additional_controls','pg_temp.additional_controls').replace('CREATE SCHEMA IF NOT EXISTS risk;','')
def query(name):
    s=(root/f'DSL/Resql/ljvis/POST/risk_score/{name}.sql').read_text()
    return remap(s.replace(':company_reg_code',"'80410960'").replace(':window_start',"'2024-10-16'").replace(':window_end',"'2026-10-16'"))
sp='''id BIGINT,compound_form_key BIGINT,status TEXT,selection_status TEXT,sp_applicability TEXT,result_type TEXT,proceeding_type TEXT,created_at TIMESTAMPTZ,
violations_561_2006 JSONB DEFAULT '[]',violations_165_2014 JSONB DEFAULT '[]',violations_2002_15 JSONB DEFAULT '[]',violations_593_2008 JSONB DEFAULT '[]',violations_2020_1057 JSONB DEFAULT '[]',document_checks JSONB DEFAULT '[]',cabotage_violations JSONB DEFAULT '[]',mass_dimension_measurements JSONB DEFAULT '[]' '''
sql='BEGIN;\n'+f'CREATE TEMP TABLE fixture_sp_driver_form (sp_driver_form_key BIGINT,{sp});\n'+f'CREATE TEMP TABLE fixture_sp_teammate_form (sp_teammate_form_key BIGINT,{sp});\n'+f'CREATE TEMP TABLE fixture_tram_control_card (tram_control_card_key BIGINT,company_reg_code TEXT,company_name TEXT,{sp});\n'+'''
CREATE TEMP TABLE fixture_compound_form (id BIGINT,compound_form_key BIGINT,company_reg_code TEXT,company_name TEXT,status TEXT,created_at TIMESTAMPTZ);
CREATE TEMP TABLE fixture_foreign_violation_form (id BIGINT,foreign_violation_form_key BIGINT,company_reg_code TEXT,company_name TEXT,status TEXT,created_at TIMESTAMPTZ,violations JSONB);
CREATE TEMP TABLE fixture_labour_inspection_form (id BIGINT,labour_inspection_form_key BIGINT,company_reg_code TEXT,company_name TEXT,status TEXT,created_at TIMESTAMPTZ,vehicle_count INT,violations JSONB);
CREATE TEMP TABLE fixture_vehicle_technical_form (id BIGINT,vehicle_technical_form_key BIGINT,compound_form_key BIGINT,status TEXT,created_at TIMESTAMPTZ,selection_status TEXT DEFAULT 'active',violations JSONB);
CREATE TEMP TABLE fixture_trailer_technical_form (id BIGINT,trailer_technical_form_key BIGINT,compound_form_key BIGINT,status TEXT,created_at TIMESTAMPTZ,selection_status TEXT DEFAULT 'active',violations JSONB);
CREATE TEMP TABLE fixture_adr_form (id BIGINT,adr_form_key BIGINT,compound_form_key BIGINT,status TEXT,created_at TIMESTAMPTZ,infringements JSONB,other_infringements JSONB DEFAULT '[]');
CREATE TEMP TABLE fixture_form_search (form_key BIGINT,form_type TEXT,form_number TEXT,main_date DATE,vehicle_reg_nr TEXT);
CREATE TEMP TABLE fixture_classifier_value (id BIGINT,classifier_value_key BIGINT,description TEXT,created_at TIMESTAMPTZ);
INSERT INTO fixture_compound_form VALUES (1,10,'80410960','Risk test','published','2026-01-01');
INSERT INTO fixture_sp_driver_form (id,sp_driver_form_key,compound_form_key,status,selection_status,sp_applicability,created_at,violations_561_2006,mass_dimension_measurements)
 VALUES (1,11,10,'published','active','RAKENDATAKSE','2026-01-01','[{"severityCode":"MSI"}]','[{"severity":"VSI","level3Code":"VSI843"}]');
INSERT INTO fixture_compound_form VALUES (2,50,'80410960','Risk test','published','2026-01-01');
INSERT INTO fixture_sp_driver_form (id,sp_driver_form_key,compound_form_key,status,selection_status,sp_applicability,result_type,created_at)
 VALUES (2,51,50,'published','active','EI_RAKENDATA','ok','2026-01-01');
INSERT INTO fixture_vehicle_technical_form VALUES (1,12,10,'published','2026-01-01','active','["VSI800"]'),(2,13,10,'published','2026-01-01','active','["MSI101"]'),(3,13,10,'deleted','2026-02-01','active','["MSI101"]');
INSERT INTO fixture_trailer_technical_form VALUES (1,14,10,'published','2026-01-01','active','["SI901"]');
INSERT INTO fixture_adr_form VALUES (1,15,10,'published','2026-01-01','[{"inspectionStatus":"NC","infringementDetected":true,"records":[{"responsibleParticipants":["C"],"reg2016403Code":"1","reg2016403Severity":"MSI"},{"responsibleParticipants":["F"],"reg2016403Code":"1","reg2016403Severity":"MSI"},{"responsibleParticipants":["C"],"reg2016403Code":"NONE","riskCategory":"I"}]}]','[]');
INSERT INTO fixture_tram_control_card (id,tram_control_card_key,company_reg_code,company_name,status,sp_applicability,result_type,created_at,violations_561_2006)
 VALUES (1,20,'80410960','Risk test','published','RAKENDATAKSE','HOIATUS','2026-01-01','[{"severityCode":"VSI"},{"severityCode":"MSI","isDetected":false}]'),(2,21,'80410960','Risk test','published','EI_KONTROLLITUD','KORRAS','2026-01-01','[]');
INSERT INTO fixture_labour_inspection_form VALUES (1,30,'80410960','Risk test','published','2026-01-01',2,'[{"level3ValueKey":300,"quantity":3}]');
INSERT INTO fixture_classifier_value VALUES (1,300,'SI','2026-01-01');
INSERT INTO fixture_foreign_violation_form VALUES (1,40,'80410960','Risk test','published','2026-01-01','["SI901"]');
INSERT INTO fixture_form_search VALUES (10,'compound','koond-test','2026-01-01','TEST'),(20,'tram_control_card','tram-test','2026-01-01','TEST'),(30,'labour_inspection','ti-test','2026-01-01',NULL),(40,'foreign_violation','vr-test','2026-01-01',NULL);
'''
sql+=remap((root/'DSL/Liquibase/changelog/20261016211000-risk-additional-controls.sql').read_text())
sql+='\nCREATE TEMP VIEW actual_score AS '+query('calculate_risk_score')
sql+='\nCREATE TEMP VIEW actual_breakdown AS '+query('company_controls_breakdown')
sql+='''
DO $$ BEGIN
 IF (SELECT total_controls FROM actual_score) <> 4 OR (SELECT risk_score FROM actual_score) <> 76.25 THEN
  RAISE EXCEPTION 'Wrong score: %', (SELECT row_to_json(s) FROM actual_score s);
 END IF;
 IF EXISTS (SELECT 1 FROM actual_breakdown WHERE form_key=50 AND NOT is_fully_excluded) THEN RAISE EXCEPTION 'Not-applied SP with result ok must be fully excluded'; END IF;
 IF (SELECT COUNT(*) FROM actual_breakdown WHERE NOT is_fully_excluded) <> 4 THEN RAISE EXCEPTION 'Breakdown control count differs'; END IF;
 IF (SELECT SUM(weighted_points) FROM actual_breakdown WHERE NOT is_fully_excluded) <> 305 THEN RAISE EXCEPTION 'Breakdown points differ'; END IF;
 IF (SELECT weighted_points FROM actual_breakdown WHERE form_type='compound') <> 250 THEN RAISE EXCEPTION 'SP (incl. mass/dimension severity), vehicle, trailer and ADR must count once per compound'; END IF;
 IF (SELECT weighted_points FROM actual_breakdown WHERE form_type='labour_inspection') <> 15 THEN RAISE EXCEPTION 'TI quantity and vehicle divisor must apply'; END IF;
END $$;
-- A technical-only control must also count. Drafts, deleted forms, excluded TRAM and old controls must not count.
DELETE FROM fixture_sp_driver_form;
DO $$ BEGIN
 IF (SELECT total_controls FROM actual_score) <> 4 OR (SELECT risk_score FROM actual_score) <> 46.25 THEN RAISE EXCEPTION 'Technical/ADR-only compound missing'; END IF;
END $$;
INSERT INTO fixture_tram_control_card SELECT (jsonb_populate_record(NULL::fixture_tram_control_card,to_jsonb(t)||jsonb_build_object('id',t.id+10,'status','deleted','created_at','2026-02-01'))).* FROM fixture_tram_control_card t;
UPDATE fixture_labour_inspection_form SET status='confirmed';
UPDATE fixture_foreign_violation_form SET created_at='2020-01-01';
DO $$ BEGIN
 IF (SELECT total_controls FROM actual_score) <> 1 THEN RAISE EXCEPTION 'Deleted, unpublished or expired controls counted'; END IF;
END $$;
UPDATE fixture_labour_inspection_form SET status='published',vehicle_count=0;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM actual_score;
  RAISE EXCEPTION 'Invalid TI vehicle count must not produce a score';
 EXCEPTION WHEN division_by_zero THEN NULL;
 END;
END $$;
ROLLBACK;
''' 
command=sys.argv[1:]
if command[:1]==['--']: command=command[1:]
if not command: raise SystemExit(__doc__)
subprocess.run(command+['-X','-q','-v','ON_ERROR_STOP=1'],input=sql,text=True,check=True)
print('OK: SP, TRAM, TI, vehicle, trailer, ADR and VR; one compound denominator; exclusions; TI vehicles and quantities; breakdown matches score')
