-- liquibase formatted sql
-- changeset ljvis:20260827100001 ignore:true splitStatements:false
--
-- LJVIS2-151: three published compound_forms (+ their sp_driver_form) covering
-- the three SP-control categories from docs/risk-score/formula.md, so
-- calculate_risk_score.sql can be exercised end-to-end without needing the
-- (not-yet-built, LJVIS2-69) compound_form publish UI flow. Uses distinct
-- fictional 8-digit company_reg_code values in the 900000xx range to avoid
-- colliding with any real or other-fixture data.
--
-- 90000001 "Riskiskoori Test AS Punane"   — 2 published controls:
--   control #1: MSI(1)+SI(1) => weighted=100
--   control #2: MSI(4) => weighted=360
--   R = (100+360)/2 = 230 => Punane (R>=201)
-- 90000002 "Riskiskoori Test OÜ Nullpunkt" — proceeding_type=KIIR, sp_applicability=RAKENDATAKSE, no violations => zero-point, r=1, R=0 (Roheline)
-- 90000003 "Riskiskoori Test AS Valistatud" — sp_applicability=EI_KONTROLLITUD + result_type=KORRAS => fully excluded, r=0 (Hall)
-- 90000004 — TWO compound_forms with DIFFERENT company_name (a name change
--   between controls), neither needs to be published/have SP forms — this
--   fixture exists purely to catch the calculate_risk_score.sql regression
--   where company_name was picked from an arbitrarily-ordered per-
--   compound_form_key CTE instead of "most recent row overall"; the newer
--   row ("Riskiskoori Test AS Uus Nimi", 10 days ago) must win over the
--   older one ("Riskiskoori Test AS Vana Nimi", 90 days ago).
--
DO $$
DECLARE
  cf_key_1a BIGINT := 95000101; -- Punane co, control #1 (MSI+SI, weighted 100)
  cf_key_1b BIGINT := 95000102; -- Punane co, control #2 (MSI+VSI+SI+MI, weighted much higher, pulls average > 200)
  cf_key_2  BIGINT := 95000201; -- Nullpunkt co
  cf_key_3  BIGINT := 95000301; -- Valistatud co
  cf_key_4a BIGINT := 95000401; -- Nimemuutus co, older compound_form (older name)
  cf_key_4b BIGINT := 95000402; -- Nimemuutus co, newer compound_form (newer name)
BEGIN
  -- ===== Company 1: "Punane" (two published controls) =====
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES
  (nextval('forms.compound_form_id_seq'), cf_key_1a, 'RISK-FIXTURE-1A', 2026, 1, 'published',
   CURRENT_DATE - INTERVAL '60 days', '10:00:00', 'EE',
   'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000001', 'Riskiskoori Test AS Punane', '[]'::jsonb, now() - INTERVAL '60 days', 'system'),
  (nextval('forms.compound_form_id_seq'), cf_key_1b, 'RISK-FIXTURE-1B', 2026, 1, 'published',
   CURRENT_DATE - INTERVAL '30 days', '10:00:00', 'EE',
   'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000001', 'Riskiskoori Test AS Punane', '[]'::jsonb, now() - INTERVAL '30 days', 'system');

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations, created_at, created_by
  ) VALUES
  -- control #1: 1x MSI + 1x SI => 1*90 + 1*10 = 100 weighted; alone => R=100 (Roheline boundary)
  (95100101, cf_key_1a, 'sp-2026-95100101/1', 1, 'published', 'active',
   'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   '[{"violationCode":"V1","severityCode":"MSI","isDetected":"true"}]'::jsonb,
   '[]'::jsonb,
   '[{"violationCode":"V2","severityCode":"SI","isDetected":"true"}]'::jsonb,
   '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '60 days', 'system'),
  -- control #2: 4x MSI => 4*90 = 360 weighted; combined with #1: (100+360)/2 = 230 (Punane, R>=201)
  -- NOTE: kept as a single company with two controls specifically so the
  -- "R uses AVERAGE weighted score across controls, not a max" rule is
  -- exercised — see docs/risk-score/formula.md §Valem.
  (95100102, cf_key_1b, 'sp-2026-95100102/1', 1, 'published', 'active',
   'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   '[{"violationCode":"V1","severityCode":"MSI","isDetected":"true"},{"violationCode":"V3","severityCode":"MSI","isDetected":"true"},{"violationCode":"V4","severityCode":"MSI","isDetected":"true"},{"violationCode":"V5","severityCode":"MSI","isDetected":"true"}]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '30 days', 'system');

  -- ===== Company 2: "Nullpunkt" (zero-point control) =====
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), cf_key_2, 'RISK-FIXTURE-2', 2026, 1, 'published',
    CURRENT_DATE - INTERVAL '45 days', '11:00:00', 'EE',
    'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
    '[]'::jsonb, '90000002', 'Riskiskoori Test OU Nullpunkt', '[]'::jsonb, now() - INTERVAL '45 days', 'system'
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations, created_at, created_by
  ) VALUES (
    95100201, cf_key_2, 'sp-2026-95100201/1', 1, 'published', 'active',
    'Veosevedu', 'KORRAS', 'KIIR', 'RAKENDATAKSE',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    now() - INTERVAL '45 days', 'system'
  );

  -- ===== Company 3: "Valistatud" (fully excluded control) =====
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), cf_key_3, 'RISK-FIXTURE-3', 2026, 1, 'published',
    CURRENT_DATE - INTERVAL '20 days', '12:00:00', 'EE',
    'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
    '[]'::jsonb, '90000003', 'Riskiskoori Test AS Valistatud', '[]'::jsonb, now() - INTERVAL '20 days', 'system'
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations, created_at, created_by
  ) VALUES (
    95100301, cf_key_3, 'sp-2026-95100301/1', 1, 'published', 'active',
    'Veosevedu', 'KORRAS', 'YLD', 'EI_KONTROLLITUD',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    now() - INTERVAL '20 days', 'system'
  );

  -- ===== Company 4: "Nimemuutus" (company_name most-recent-row regression check) =====
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES
  (nextval('forms.compound_form_id_seq'), cf_key_4a, 'RISK-FIXTURE-4A', 2026, 1, 'saved',
   CURRENT_DATE - INTERVAL '90 days', '09:00:00', 'EE',
   'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000004', 'Riskiskoori Test AS Vana Nimi', '[]'::jsonb, now() - INTERVAL '90 days', 'system'),
  (nextval('forms.compound_form_id_seq'), cf_key_4b, 'RISK-FIXTURE-4B', 2026, 1, 'saved',
   CURRENT_DATE - INTERVAL '10 days', '09:00:00', 'EE',
   'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000004', 'Riskiskoori Test AS Uus Nimi', '[]'::jsonb, now() - INTERVAL '10 days', 'system');
END $$;
