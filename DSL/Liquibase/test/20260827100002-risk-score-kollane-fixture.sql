-- liquibase formatted sql
-- changeset ljvis:20260827100002 ignore:true splitStatements:false
--
-- LJVIS2-150/151/152: closes the Kollane/Amber coverage gap flagged in
-- .ai/ljvis-tasks/LJVIS2-150/test-cases.md §D ("Kollane/Amber scenario not
-- covered by any fixture, only verified by reading the code"). Separate
-- file from 20260827100001 (not appended to it) so re-running this one
-- never touches the already-applied 90000001-04 companies.
--
-- 90000006 "Riskiskoori Test AS Kollane" — 1 published control:
--   1x MSI(90) + 1x VSI(30) = 120 weighted; r=1 => R=120 => Kollane (101<=R<=200)
-- (reg code moved 90000005 -> 90000006: #184 repurposed 90000005 for the
--  "Kontrollimata / no SP form" scenario in 20260827100001.)
--
DO $$
DECLARE
  cf_key_6 BIGINT := 95000501;
BEGIN
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), cf_key_6, 'RISK-FIXTURE-5', 2026, 1, 'published',
    CURRENT_DATE - INTERVAL '15 days', '13:00:00', 'EE',
    'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
    '[]'::jsonb, '90000006', 'Riskiskoori Test AS Kollane', '[]'::jsonb, now() - INTERVAL '15 days', 'system'
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations, created_at, created_by
  ) VALUES (
    95100501, cf_key_6, 'sp-2026-95100501/1', 1, 'published', 'active',
    'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
    '[{"violationCode":"V1","severityCode":"MSI","isDetected":"true"},{"violationCode":"V2","severityCode":"VSI","isDetected":"true"}]'::jsonb,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    now() - INTERVAL '15 days', 'system'
  );
END $$;
