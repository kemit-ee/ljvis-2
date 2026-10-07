-- Synthetic provider data for a disposable CI database; never run against production.
INSERT INTO forms.labour_inspection_form (
  labour_inspection_form_key, form_number, version, status, inspector_name,
  inspection_date, inspection_type, company_name, company_reg_code,
  external_inspection_id, punished_person_id_code,
  punished_person_first_name, punished_person_last_name, created_by
)
SELECT nextval('forms.seq_labour_inspection_form_key'),
       'SOAP-CI-' || n, 1, 'saved', 'CI Inspektor',
       DATE '2026-06-15', 'cargo', 'CI SOAP OÜ', '12345678',
       'xtr-soap-fixture-' || n, '39001010001', 'Demo', 'Test', 'xtr-test'
FROM generate_series(1,2) AS n
WHERE NOT EXISTS (SELECT 1 FROM forms.labour_inspection_form
                  WHERE external_inspection_id = 'xtr-soap-fixture-' || n);

-- Fixed high keys reserved for this disposable fixture, including a non-empty inspection query.
INSERT INTO forms.compound_form (
 compound_form_key, form_number, control_year, template_version, status,
 control_date, control_time, control_country_code, inspector_first_name,
 inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
 vehicle_reg_nr, vehicle_country_code, company_name, company_reg_code
)
SELECT 900000001, 'SOAP-CI-COMPOUND', 2026, 1, 'confirmed',
 DATE '2026-06-15', TIME '10:00', 'EE', 'CI', 'Test', '70001231', 'CI', 'CI',
 '123ABC', 'EE', 'CI SOAP OÜ', '12345678'
WHERE NOT EXISTS (SELECT 1 FROM forms.compound_form WHERE compound_form_key=900000001);

INSERT INTO forms.vehicle_technical_form (
 vehicle_technical_form_key, compound_form_key, sub_form_number, status,
 result_type, parts_defects, era_yv_mnt_regnr, notes
)
SELECT 900000001, 900000001, 'SOAP-CI-TECH', 'confirmed',
 'extraordinary_inspection', '[{"partCode":"1","defectCode":"1.1"}]'::jsonb, true, 'CI note'
WHERE NOT EXISTS (SELECT 1 FROM forms.vehicle_technical_form WHERE vehicle_technical_form_key=900000001);
