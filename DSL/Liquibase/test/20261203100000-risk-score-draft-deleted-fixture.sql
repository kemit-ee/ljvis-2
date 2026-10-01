-- liquibase formatted sql
-- changeset ljvis:20261203100000 ignore:true splitStatements:false
--
-- Riskiskoori arvutus peab arvestama ainult AVALIKUSTATUD, mittekustutatud vorme
-- (calculate_risk_score.sql / company_controls_breakdown.sql). Eraldi fail, et
-- 20260827100001-st juba rakendatud ettevõtteid mitte puutuda.
--
-- 90000071 "Riskiskoori Test AS Mustand Kustutatud" — 1 avalikustatud koondvorm:
--   SP-juht #1: avalikustatud 1x MSI (90), hilisem MUSTAND 4x MSI (360) => loeb 90
--   SP-juht #2: avalikustatud 1x VSI (30), hilisem KUSTUTATUD versioon => ei loe
--   r=1, R=90 => Roheline (vigase arvutuse korral 360+30=390 => Punane)
-- 90000072 "Riskiskoori Test AS Kustutatud Koondvorm" — avalikustatud koondvorm,
--   hilisem KUSTUTATUD koondvormi versioon => ei loe, r=0 => Hall
-- 90000073 "Riskiskoori Test AS Kustutamine" — 1 avalikustatud koondvorm, kaks
--   avalikustatud SP-juhti (1x MSI = 90 ja 4x MSI = 360); R=450 => Punane.
--   Newman kustutab teise (95100732) avalikus API-s ja ootab, et kustutamine
--   käivitab ümberarvutuse: R=90 => Roheline.
--
DO $$
DECLARE
  cf_71 BIGINT := 95000711;
  cf_72 BIGINT := 95000721;
  cf_73 BIGINT := 95000731;
  msi  TEXT := '{"violationCode":"V1","severityCode":"MSI","isDetected":"true"}';
BEGIN
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    trailers, company_reg_code, company_name, drivers, created_at, created_by
  ) VALUES
  (nextval('forms.compound_form_id_seq'), cf_71, 'RISK-FIXTURE-71', 2026, 1, 'published',
   CURRENT_DATE - INTERVAL '20 days', '13:00:00', 'EE', 'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000071', 'Riskiskoori Test AS Mustand Kustutatud', '[]'::jsonb, now() - INTERVAL '20 days', 'system'),
  (nextval('forms.compound_form_id_seq'), cf_72, 'RISK-FIXTURE-72', 2026, 1, 'published',
   CURRENT_DATE - INTERVAL '20 days', '13:00:00', 'EE', 'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000072', 'Riskiskoori Test AS Kustutatud Koondvorm', '[]'::jsonb, now() - INTERVAL '20 days', 'system'),
  (nextval('forms.compound_form_id_seq'), cf_72, 'RISK-FIXTURE-72', 2026, 1, 'deleted',
   CURRENT_DATE - INTERVAL '20 days', '13:00:00', 'EE', 'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000072', 'Riskiskoori Test AS Kustutatud Koondvorm', '[]'::jsonb, now() - INTERVAL '10 days', 'system'),
  (nextval('forms.compound_form_id_seq'), cf_73, 'RISK-FIXTURE-73', 2026, 1, 'published',
   CURRENT_DATE - INTERVAL '20 days', '13:00:00', 'EE', 'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
   '[]'::jsonb, '90000073', 'Riskiskoori Test AS Kustutamine', '[]'::jsonb, now() - INTERVAL '20 days', 'system');

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations, created_at, created_by
  ) VALUES
  -- 90000071 juht #1: avalikustatud 1x MSI, hiljem mustand 4x MSI
  (95100711, cf_71, 'sp-2026-95100711/1', 1, 'published', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   ('[' || msi || ']')::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '20 days', 'system'),
  (95100711, cf_71, 'sp-2026-95100711/1', 1, 'draft', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   ('[' || msi || ',' || msi || ',' || msi || ',' || msi || ']')::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '10 days', 'system'),
  -- 90000071 juht #2: avalikustatud 1x VSI, hiljem kustutatud
  (95100712, cf_71, 'sp-2026-95100712/1', 1, 'published', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   '[{"violationCode":"V2","severityCode":"VSI","isDetected":"true"}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '20 days', 'system'),
  (95100712, cf_71, 'sp-2026-95100712/1', 1, 'deleted', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   '[{"violationCode":"V2","severityCode":"VSI","isDetected":"true"}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '10 days', 'system'),
  -- 90000072: avalikustatud SP-juht kustutatud koondvormil
  (95100721, cf_72, 'sp-2026-95100721/1', 1, 'published', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   ('[' || msi || ']')::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '20 days', 'system'),
  -- 90000073: kaks avalikustatud SP-juhti
  (95100731, cf_73, 'sp-2026-95100731/1', 1, 'published', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   ('[' || msi || ']')::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '20 days', 'system'),
  (95100732, cf_73, 'sp-2026-95100732/1', 1, 'published', 'active', 'Veosevedu', 'HOIATUS', 'YLD', 'RAKENDATAKSE',
   ('[' || msi || ',' || msi || ',' || msi || ',' || msi || ']')::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   now() - INTERVAL '20 days', 'system');
END $$;
