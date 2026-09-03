-- liquibase formatted sql
-- changeset ljvis:20260903100000 ignore:true splitStatements:false
--
-- Kasutusjuhendi ekraanipiltide näidisvormid (docs/screenshots/capture.mjs).
-- Viis täidetud liitvormi eri staatustes + alamvormid, et juhendisse saaks
-- pildistada tehnokontrolli, ADR, veo katkestamise, sõidu-/puhkeaja alamvorme
-- ning failide ja versioonide vaateid.
--
--   95002001 KOOND-2026-4001  avaldatud   -> sp_driver + vehicle_technical + adr
--   95002002 KOOND-2026-4002  kinnitatud  -> sp_driver + kv (veo katkestamine) + trailer_technical
--   95002003 KOOND-2026-4003  salvestatud -> sp_driver + vehicle_technical + 2 manust
--   95002004 AJALUGU-2026-4004  3 versiooni (salvestatud -> kinnitatud -> avaldatud)
--   95002005 KOOND-2026-4005  kinnitatud  -> sp_teammate + adr
--
-- Kõik loojaks 60001019906 (Super Admin), et vaadetes kuvataks nimi.

DO $$
DECLARE
  v_by TEXT := '60001019906';
BEGIN
  IF EXISTS (SELECT 1 FROM forms.compound_form WHERE compound_form_key = 95002001) THEN
    RAISE NOTICE 'user-guide fixture forms already exist, skipping';
    RETURN;
  END IF;

  -- ================================================================
  -- F1 — 95002001  KOOND-2026-4001/1  AVALDATUD
  -- ================================================================
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code, county, city, road, kilometer, road_type,
    road_tax_status,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_make, vehicle_model, vehicle_country_code, vehicle_vin,
    vehicle_first_registration, vehicle_body_type, vehicle_category_code, vehicle_mileage,
    trailers, company_reg_code, company_name, company_country_code, company_county, company_city,
    company_address, company_postal_code, company_activity_licence_copy_number,
    drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), 95002001, 'KOOND-2026-4001/1', 2026, 1, 'published',
    CURRENT_DATE - 12, '09:40', 'EE', '484', '513', 'Tallinna ringtee', 12, 'Riigimaantee',
    'Ei kohaldu',
    'Marek', 'Kask', 'PPA', 'Lõuna prefektuur', 'Vaneminspektor',
    '123ABC', 'Volvo', 'FH 460', 'EE', 'YV1JS9CG9MA123456',
    DATE '2019-04-15', 'Sadulveduk', 'N3', 384500,
    '[]'::jsonb, '10099887', 'AS Rapla Piim', 'EE', 'Rapla maakond', 'Rapla',
    'Tehnika 12', '79511', 'EE-CL-100998-01',
    '[{"personalCodeEe":"38904012760","personalCodeForeign":"","firstName":"Andres","lastName":"Lepik","citizenshipCode":"EE","birthDate":"1989-04-01"}]'::jsonb,
    now() - INTERVAL '12 days', v_by
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    tachograph_type_code, checked_days_count, work_days_count, other_activity_days_count,
    document_checks, violations_561_2006, notes, created_at, created_by
  ) VALUES (
    95102001, 95002001, 'sp-2026-95102001/1', 1, 'published', 'active',
    'Veosevedu', 'ok', 'none', 'RAKENDATAKSE',
    'digital', 28, 21, 3,
    '[{"documentCode":"DRIVER_CARD","status":"OK"},{"documentCode":"DRIVING_LICENCE","status":"OK"}]'::jsonb,
    '[]'::jsonb, 'Kontrollitud 28 päeva, rikkumisi ei tuvastatud.', now() - INTERVAL '12 days', v_by
  );

  INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, notes, created_at, created_by
  ) VALUES (
    95202001, 95002001, 'vt-2026-95202001/1', 1, 'published',
    '[{"partCode":"1","name":"Pidurisüsteem","checked":true},{"partCode":"2","name":"Rooliseade","checked":true},{"partCode":"6","name":"Teljed, rattad, rehvid","checked":true}]'::jsonb,
    '[]'::jsonb, 'ok', 'Puudusi ei tuvastatud.', now() - INTERVAL '12 days', v_by
  );

  INSERT INTO forms.adr_form (
    adr_form_key, compound_form_key, sub_form_number, version, status,
    driver_adr_certificate_number, dangerous_goods, exemption_applied, container_type,
    infringements, result_type, corrective_measures, notes, created_at, created_by
  ) VALUES (
    95302001, 95002001, 'adr-2026-95302001/1', 1, 'published',
    'EE/ADR/2023/00456',
    '[{"unNumber":"1202","properShippingName":"Diislikütus","class":"3","packingGroup":"III","quantity":"18000 l"}]'::jsonb,
    false, 'TANK',
    '[]'::jsonb, 'ok', '[]'::jsonb, 'Veos nõuetekohaselt märgistatud ja dokumenteeritud.',
    now() - INTERVAL '12 days', v_by
  );

  -- ================================================================
  -- F2 — 95002002  KOOND-2026-4002/1  KINNITATUD
  -- ================================================================
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code, county, city, road, kilometer, road_type,
    road_tax_status,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_make, vehicle_model, vehicle_country_code, vehicle_vin,
    vehicle_first_registration, vehicle_body_type, vehicle_category_code, vehicle_mileage,
    trailers, company_reg_code, company_name, company_country_code, company_county, company_city,
    company_address, company_postal_code, company_activity_licence_copy_number,
    drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), 95002002, 'KOOND-2026-4002/1', 2026, 1, 'confirmed',
    CURRENT_DATE - 6, '14:15', 'EE', '495', '564', 'Tartu–Võru maantee', 8, 'Riigimaantee',
    'Tasutud',
    'Kristiina', 'Mägi', 'PPA', 'Lõuna prefektuur', 'Inspektor',
    '456DEF', 'Scania', 'R 500', 'EE', 'XLER4X20005123789',
    DATE '2021-08-20', 'Kinnine kast', 'N3', 210300,
    '[{"regNr":"901ABC","countryCode":"EE","make":"Schmitz","model":"SKO 24","vin":"WSM00000003123456","firstRegistration":"2021-05-10","bodyType":"Kardinhaagis","categoryCode":"O4","categoryOther":""}]'::jsonb,
    '11055443', 'Elbe Transport OÜ', 'EE', '495', '564',
    'Ringtee 25', '50105', 'EE-CL-110554-02',
    '[{"personalCodeEe":"37502153012","personalCodeForeign":"","firstName":"Priit","lastName":"Sepp","citizenshipCode":"EE","birthDate":"1975-02-15"}]'::jsonb,
    now() - INTERVAL '6 days', v_by
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability,
    tachograph_type_code, checked_days_count, work_days_count,
    document_checks, violations_561_2006, notes, created_at, created_by
  ) VALUES (
    95102002, 95002002, 'sp-2026-95102002/1', 1, 'confirmed', 'active',
    'Veosevedu', 'warning', 'YLD', 'RAKENDATAKSE',
    'digital', 28, 19,
    '[{"documentCode":"DRIVER_CARD","status":"OK"}]'::jsonb,
    '[{"violationCode":"6.1.a","severityCode":"SI","isDetected":"true","description":"Ööpäevase puhkeaja lühendamine"}]'::jsonb,
    'Tuvastati üks tõsine rikkumine, tehtud hoiatus.', now() - INTERVAL '6 days', v_by
  );

  INSERT INTO forms.kv_form (
    kv_form_key, compound_form_key, sub_form_number, version, status,
    header_text, residence_country, residence_region, residence_city, residence_address_line, residence_postal_code,
    interruption_reason, legal_bases, person_applications, created_at, created_by
  ) VALUES (
    95402002, 95002002, 'kv-2026-95402002/1', 1, 'confirmed',
    'Autoveo katkestamise otsus', 'EE', 'Tartu maakond', 'Tartu', 'Ringtee 25', '50105',
    'Juhi ööpäevane puhkeaeg ei olnud tagatud; sõidu jätkamine ohustaks liiklusohutust.',
    '[{"code":"LS_92","name":"Liiklusseadus § 92 lg 4"}]'::jsonb,
    'Vedaja esindaja selgitusi ei esitanud.', now() - INTERVAL '6 days', v_by
  );

  INSERT INTO forms.trailer_technical_form (
    trailer_technical_form_key, compound_form_key, sub_form_number, version, status,
    trailer_reg_nr, parts_summary, parts_defects, result_type, notes, created_at, created_by
  ) VALUES (
    95502002, 95002002, 'tt-2026-95502002/1', 1, 'confirmed',
    '901ABC',
    '[{"partCode":"1","name":"Pidurisüsteem","checked":true},{"partCode":"6","name":"Teljed, rattad, rehvid","checked":true}]'::jsonb,
    '[{"partCode":"6.2","name":"Rehvi turvisemuster","severity":"minor","note":"Ühe rehvi turvis 1,4 mm"}]'::jsonb,
    'ok', 'Märkusena fikseeritud ühe rehvi turvisemuster 1,4 mm; veo katkestamiseks alust ei ole.', now() - INTERVAL '6 days', v_by
  );

  -- ================================================================
  -- F3 — 95002003  KOOND-2026-4003/1  SALVESTATUD (mustand) + manused
  -- ================================================================
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code, county, city, road, kilometer, road_type,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_make, vehicle_model, vehicle_country_code, vehicle_category_code, vehicle_mileage,
    trailers, company_reg_code, company_name, company_country_code, company_county, company_city, company_address,
    drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), 95002003, 'KOOND-2026-4003/1', 2026, 1, 'saved',
    CURRENT_DATE - 1, '11:05', 'EE', '492', '547', 'Via Baltica', 130, 'Riigimaantee',
    'Jaanika', 'Rand', 'PPA', 'Lääne prefektuur', 'Inspektor',
    '789GHI', 'MAN', 'TGX 18.510', 'EE', 'N3', 95120,
    '[]'::jsonb, '12077665', 'Baltic Cargo OÜ', 'EE', '492', '547', 'Riia mnt 231',
    '[{"personalCodeEe":"39106255018","personalCodeForeign":"","firstName":"Toomas","lastName":"Ilves","citizenshipCode":"EE","birthDate":"1991-06-25"}]'::jsonb,
    now() - INTERVAL '1 day', v_by
  );

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability, checked_days_count,
    created_at, created_by
  ) VALUES (
    95102003, 95002003, 'sp-2026-95102003/1', 1, 'saved', 'active',
    'Veosevedu', 'ok', 'none', 'RAKENDATAKSE', 28, now() - INTERVAL '1 day', v_by
  );

  INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, created_at, created_by
  ) VALUES (
    95202003, 95002003, 'vt-2026-95202003/1', 1, 'saved',
    '[{"partCode":"1","name":"Pidurisüsteem","checked":true}]'::jsonb, '[]'::jsonb, 'ok',
    now() - INTERVAL '1 day', v_by
  );

  -- ================================================================
  -- F6 — välisriigi rikkumise vorm 95003001 (salvestatud) + manused
  --      failide lisamise peatüki jaoks (docs/user-guide/14).
  -- ================================================================
  INSERT INTO forms.foreign_violation_form (
    id, foreign_violation_form_key, form_number, template_version, status, data_entry_date,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    reporting_country_code, reporting_authority_name, inspection_date, inspection_time,
    inspection_region, inspection_city, inspection_country_code,
    company_reg_code, company_name, company_country_code,
    driver_first_name, driver_last_name, licence_copy_number,
    vehicle_reg_nr, vehicle_make, vehicle_model, vehicle_country_code,
    violation_description, minor_violations_count,
    sanction_code, recommended_measure_code, violations, created_at, created_by
  ) VALUES (
    nextval('forms.foreign_violation_form_id_seq'), 95003001, 'VR-2026-3001/1', 1, 'saved', CURRENT_DATE - 2,
    'Marek', 'Kask', 'PPA', 'Lõuna prefektuur', 'Vaneminspektor',
    'DE', 'Bundesamt für Güterverkehr', CURRENT_DATE - 9, '15:20',
    'Bayern', 'München', 'DE',
    '10099887', 'AS Rapla Piim', 'EE',
    'Andres', 'Lepik', 'EE-CL-100998-01',
    '123ABC', 'Volvo', 'FH 460', 'EE',
    'Ületatud ööpäevane sõiduaeg 45 minuti võrra.', 0,
    'TRAHV', 'HOIATUS', '[]'::jsonb, now() - INTERVAL '2 days', v_by
  );

  INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by) VALUES
    ('KOOND-2026-4003/1', 'kontrolli-foto-1.jpg', 'fixtures/koond-2026-4003/kontrolli-foto-1.jpg', 'active', v_by),
    ('KOOND-2026-4003/1', 'juhi-selgitus.pdf',    'fixtures/koond-2026-4003/juhi-selgitus.pdf',    'active', v_by),
    ('VR-2026-3001/1',    'valisriigi-teade.pdf',      'fixtures/vr-2026-3001/valisriigi-teade.pdf',      'active', v_by),
    ('VR-2026-3001/1',    'soidumeeriku-valjavote.pdf', 'fixtures/vr-2026-3001/soidumeeriku-valjavote.pdf', 'active', v_by),
    ('VR-2026-3001/1',    'kontrollfoto.jpg',          'fixtures/vr-2026-3001/kontrollfoto.jpg',          'active', v_by);

  -- ================================================================
  -- F4 — 95002004  AJALUGU-2026-4004  kolm versiooni
  -- ================================================================
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code, county, city, road, kilometer, road_type,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_make, vehicle_country_code, vehicle_category_code,
    trailers, company_reg_code, company_name, company_country_code, drivers, created_at, created_by
  ) VALUES
  (nextval('forms.compound_form_id_seq'), 95002004, 'AJALUGU-2026-4004/1', 2026, 1, 'saved',
   CURRENT_DATE - 20, '08:20', 'EE', '490', '536', 'Tallinn–Narva maantee', 98, 'Riigimaantee',
   'Rain', 'Tamm', 'PPA', 'Ida prefektuur', 'Inspektor',
   '321JKL', 'DAF', 'EE', 'N3',
   '[]'::jsonb, '13088776', 'Nord Line AS', 'EE',
   '[{"personalCodeEe":"38207134019","personalCodeForeign":"","firstName":"Jüri","lastName":"Oja","citizenshipCode":"EE","birthDate":"1982-07-13"}]'::jsonb,
   now() - INTERVAL '20 days', v_by),
  (nextval('forms.compound_form_id_seq'), 95002004, 'AJALUGU-2026-4004/2', 2026, 1, 'confirmed',
   CURRENT_DATE - 20, '08:20', 'EE', '490', '536', 'Tallinn–Narva maantee', 98, 'Riigimaantee',
   'Rain', 'Tamm', 'PPA', 'Ida prefektuur', 'Inspektor',
   '321JKL', 'DAF', 'EE', 'N3',
   '[]'::jsonb, '13088776', 'Nord Line AS', 'EE',
   '[{"personalCodeEe":"38207134019","personalCodeForeign":"","firstName":"Jüri","lastName":"Oja","citizenshipCode":"EE","birthDate":"1982-07-13"}]'::jsonb,
   now() - INTERVAL '10 days', v_by),
  (nextval('forms.compound_form_id_seq'), 95002004, 'AJALUGU-2026-4004/3', 2026, 1, 'published',
   CURRENT_DATE - 20, '08:20', 'EE', '490', '536', 'Tallinn–Narva maantee', 98, 'Riigimaantee',
   'Rain', 'Tamm', 'PPA', 'Ida prefektuur', 'Inspektor',
   '321JKL', 'DAF', 'EE', 'N3',
   '[]'::jsonb, '13088776', 'Nord Line AS', 'EE',
   '[{"personalCodeEe":"38207134019","personalCodeForeign":"","firstName":"Jüri","lastName":"Oja","citizenshipCode":"EE","birthDate":"1982-07-13"}]'::jsonb,
   now() - INTERVAL '2 days', v_by);

  INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability, checked_days_count, work_days_count,
    created_at, created_by
  ) VALUES (
    95102004, 95002004, 'sp-2026-95102004/1', 1, 'published', 'active',
    'Veosevedu', 'ok', 'none', 'RAKENDATAKSE', 28, 22, now() - INTERVAL '2 days', v_by
  );

  -- ================================================================
  -- F5 — 95002005  KOOND-2026-4005/1  KINNITATUD -> sp_teammate + adr
  -- ================================================================
  INSERT INTO forms.compound_form (
    id, compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code, county, city, road, kilometer, road_type,
    road_tax_status,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_make, vehicle_model, vehicle_country_code, vehicle_category_code, vehicle_mileage,
    trailers, company_reg_code, company_name, company_country_code, company_county, company_city, company_address,
    company_postal_code, company_activity_licence_copy_number,
    drivers, created_at, created_by
  ) VALUES (
    nextval('forms.compound_form_id_seq'), 95002005, 'KOOND-2026-4005/1', 2026, 1, 'confirmed',
    CURRENT_DATE - 4, '16:30', 'EE', '486', '517', 'Tallinn–Narva maantee', 165, 'Riigimaantee',
    'Ei kohaldu',
    'Aivar', 'Saar', 'PPA', 'Ida prefektuur', 'Vaneminspektor',
    '654MNO', 'Mercedes-Benz', 'Actros 1845', 'EE', 'N3', 302880,
    '[]'::jsonb, '14033221', 'Viru Ekspress OÜ', 'EE', '486', '517', 'Narva mnt 4',
    '41531', 'EE-CL-140332-05',
    '[{"personalCodeEe":"38810204025","personalCodeForeign":"","firstName":"Margus","lastName":"Peil","citizenshipCode":"EE","birthDate":"1988-10-20"}]'::jsonb,
    now() - INTERVAL '4 days', v_by
  );

  INSERT INTO forms.sp_teammate_form (
    sp_teammate_form_key, compound_form_key, sub_form_number, template_version, status, selection_status,
    transport_type, result_type, proceeding_type, sp_applicability, checked_days_count, work_days_count,
    document_checks, notes, created_at, created_by
  ) VALUES (
    95602005, 95002005, 'spt-2026-95602005/1', 1, 'confirmed', 'active',
    'Veosevedu', 'ok', 'none', 'RAKENDATAKSE', 28, 20,
    '[{"documentCode":"DRIVER_CARD","status":"OK"}]'::jsonb,
    'Kaassõitja sõidu- ja puhkeaeg nõuetekohane.', now() - INTERVAL '4 days', v_by
  );

  INSERT INTO forms.adr_form (
    adr_form_key, compound_form_key, sub_form_number, version, status,
    driver_adr_certificate_number, dangerous_goods, exemption_applied, container_type,
    infringements, result_type, corrective_measures, notes, created_at, created_by
  ) VALUES (
    95302005, 95002005, 'adr-2026-95302005/1', 1, 'confirmed',
    'EE/ADR/2022/01187',
    '[{"unNumber":"1863","properShippingName":"Lennukikütus","class":"3","packingGroup":"III","quantity":"22000 l"}]'::jsonb,
    false, 'TANK',
    '[{"infringementCode":"ADR-5.4.1","severity":"II","description":"Veodokumendil puudus ohtliku veose klassifikaatorikood"}]'::jsonb,
    'ok', '[]'::jsonb, 'Puudus kõrvaldati kohapeal.', now() - INTERVAL '4 days', v_by
  );

  RAISE NOTICE 'Kasutusjuhendi näidisvormid loodud (95002001..95002005).';
END $$;
