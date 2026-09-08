-- liquibase formatted sql
-- changeset ljvis:20261109100001 ignore:true splitStatements:false
--
-- Dev-only fixture: teavitusi põhjustavad täidetud vormid kolmele kasutajale.
--   47008094914  Maris Albrecht    Justiitsministeerium (id 3)
--   46703292229  Eda Rembel        Kliimaministeerium   (id 5)
--   60001019906  Super Admin       PPA                  (id 1)
--
-- Igale kasutajale 4 teavitust põhjustavat kirjet:
--   2× sõidukeeld (driving_ban, rsi.read)
--   1× kaal/mõõt  (weight_violation, rsi.read)
--   1× NCR teade  (ncr_violation, ncr.read)
--
-- Compound form võtmed: 95010001–95010012
-- VT alamvorm võtmed:   95210001–95210006
-- SP alamvorm võtmed:   95110001–95110003
-- NCR message võtmed:   erru.seq_ncr_message_key (auto)
-- Järgmine PR eemaldab selle faili pärast dev-testimist.
--

DO $$
DECLARE
    v_ncr BIGINT;
BEGIN

IF EXISTS (SELECT 1 FROM forms.compound_form WHERE compound_form_key = 95010001) THEN
    RAISE NOTICE 'notification-test-fixtures already exist, skipping';
    RETURN;
END IF;

-- ══════════════════════════════════════════════════════════════════════════════
-- MARIS ALBRECHT (47008094914, Justiitsministeerium)
-- ══════════════════════════════════════════════════════════════════════════════

-- CF 95010001 — sõidukeeld 1
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010001, 'KOOND-2026-9001/1', 2026, 1, 'published',
    '2026-08-04', '09:15', 'EE',
    'Maris', 'Albrecht', 'JM', 'Justiitsministeerium', 'Vaneminspektor',
    '456LMN', 'LV', 'N2',
    '40012345678', 'OÜ Läti Veod', '[]'::jsonb, '[]'::jsonb, '47008094914'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210001, 95010001, 'th-2026-95210001', 1, 'published',
    '[{"partCode":"1","status":"non_compliant"},{"partCode":"2","status":"checked"}]'::jsonb,
    '[{"partCode":"1","defectCode":"1.1.1","severity":"EOV"}]'::jsonb,
    'driving_ban', true, '47008094914'
);

-- CF 95010002 — sõidukeeld 2
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010002, 'KOOND-2026-9002/1', 2026, 1, 'published',
    '2026-08-18', '13:40', 'EE',
    'Maris', 'Albrecht', 'JM', 'Justiitsministeerium', 'Vaneminspektor',
    'DE-B-7701', 'DE', 'N3',
    '12398760001', 'Schnell Transport GmbH', '[]'::jsonb, '[]'::jsonb, '47008094914'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210002, 95010002, 'th-2026-95210002', 1, 'published',
    '[{"partCode":"3","status":"non_compliant"}]'::jsonb,
    '[{"partCode":"3","defectCode":"3.1.2","severity":"EOV"}]'::jsonb,
    'driving_ban', true, '47008094914'
);

-- CF 95010003 — kaal/mõõt
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010003, 'KOOND-2026-9003/1', 2026, 1, 'published',
    '2026-09-01', '08:00', 'EE',
    'Maris', 'Albrecht', 'JM', 'Justiitsministeerium', 'Vaneminspektor',
    '789OPQ', 'PL', 'N2',
    '20112233445', 'Trans-East sp. z o.o.', '[]'::jsonb, '[]'::jsonb, '47008094914'
);
INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
    transport_type, mass_dimension_non_compliant, mass_dimension_measurements, created_by
) VALUES (
    95110001, 95010003, 'sp-2026-95110001', 1, 'published',
    'international', true,
    '[{"measurement_type":"mass","actual_value":42000,"allowed_value":40000,"excess_value":2000}]'::jsonb,
    '47008094914'
);

-- NCR 1 — Maris Albrecht (incoming, DE saadab EE-le)
v_ncr := nextval('erru.seq_ncr_message_key');
INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status,
    business_case_id, technical_id, workflow_id, sent_at,
    ncr_from, ncr_to, originating_authority, request_source, request_purpose,
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, serious_infringements, created_by
) VALUES (
    v_ncr, 1, 'incoming', 'received',
    'DE-NCR-2026-MA001', 'aa010001-0000-0000-0000-000000000001'::UUID, 'bb010001-0000-0000-0000-000000000001'::UUID,
    '2026-08-12 10:00:00+03', 'DE', 'EE',
    'BAG Deutschland', 'RSI', 'Control',
    'AS Rapla Piim', 'EE-CL-55001',
    '123ABC', 'EE',
    'Fail', '2026-08-11',
    '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-08-11","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":60}]}]'::jsonb,
    '47008094914'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- EDA REMBEL (46703292229, Kliimaministeerium)
-- ══════════════════════════════════════════════════════════════════════════════

-- CF 95010004 — sõidukeeld 1
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010004, 'KOOND-2026-9004/1', 2026, 1, 'published',
    '2026-07-22', '11:30', 'EE',
    'Eda', 'Rembel', 'KLIM', 'Kliimaministeerium', 'Inspektor',
    'FI-ABC-220', 'FI', 'N2',
    '50067890123', 'Pohjolan Kuljetus Oy', '[]'::jsonb, '[]'::jsonb, '46703292229'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210003, 95010004, 'th-2026-95210003', 1, 'published',
    '[{"partCode":"1","status":"non_compliant"},{"partCode":"6","status":"non_compliant"}]'::jsonb,
    '[{"partCode":"1","defectCode":"1.2.1","severity":"EOV"},{"partCode":"6","defectCode":"6.1.1","severity":"OV"}]'::jsonb,
    'driving_ban', true, '46703292229'
);

-- CF 95010005 — sõidukeeld 2
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010005, 'KOOND-2026-9005/1', 2026, 1, 'published',
    '2026-08-30', '15:00', 'EE',
    'Eda', 'Rembel', 'KLIM', 'Kliimaministeerium', 'Inspektor',
    'LV-1111-BC', 'LV', 'N3',
    '40099887766', 'Baltic Road OÜ', '[]'::jsonb, '[]'::jsonb, '46703292229'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210004, 95010005, 'th-2026-95210004', 1, 'published',
    '[{"partCode":"2","status":"non_compliant"}]'::jsonb,
    '[{"partCode":"2","defectCode":"2.1.1","severity":"EOV"}]'::jsonb,
    'driving_ban', true, '46703292229'
);

-- CF 95010006 — kaal/mõõt
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010006, 'KOOND-2026-9006/1', 2026, 1, 'published',
    '2026-09-03', '07:45', 'EE',
    'Eda', 'Rembel', 'KLIM', 'Kliimaministeerium', 'Inspektor',
    'PL-WA-0011', 'PL', 'N2',
    '60044556677', 'GITD Logistyk sp. z o.o.', '[]'::jsonb, '[]'::jsonb, '46703292229'
);
INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
    transport_type, mass_dimension_non_compliant, mass_dimension_measurements, created_by
) VALUES (
    95110002, 95010006, 'sp-2026-95110002', 1, 'published',
    'international', true,
    '[{"measurement_type":"axle_load","actual_value":12500,"allowed_value":11500,"excess_value":1000}]'::jsonb,
    '46703292229'
);

-- NCR 2 — Eda Rembel (incoming, FI saadab EE-le)
v_ncr := nextval('erru.seq_ncr_message_key');
INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status,
    business_case_id, technical_id, workflow_id, sent_at,
    ncr_from, ncr_to, originating_authority, request_source, request_purpose,
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, serious_infringements, created_by
) VALUES (
    v_ncr, 1, 'incoming', 'received',
    'FI-NCR-2026-ER001', 'aa010002-0000-0000-0000-000000000002'::UUID, 'bb010002-0000-0000-0000-000000000002'::UUID,
    '2026-09-02 08:30:00+03', 'FI', 'EE',
    'Traficom Finland', 'RSI', 'Control',
    'AS Tallinna Veod', 'EE-CL-77002',
    '456DEF', 'EE',
    'Fail', '2026-09-01',
    '[{"category":"VSI","infringementType":"201","dateOfInfringement":"2026-09-01","appealPossible":false,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"305"}]}]'::jsonb,
    '46703292229'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- SUPER ADMIN (60001019906, PPA)
-- ══════════════════════════════════════════════════════════════════════════════

-- CF 95010007 — sõidukeeld 1
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010007, 'KOOND-2026-9007/1', 2026, 1, 'published',
    '2026-07-10', '10:00', 'EE',
    'Super', 'Admin', 'PPA', 'Piirivalve', 'Vaneminspektor',
    'PL-KR-5522', 'PL', 'N3',
    '70099887700', 'Kraków Cargo sp. z o.o.', '[]'::jsonb, '[]'::jsonb, '60001019906'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210005, 95010007, 'th-2026-95210005', 1, 'published',
    '[{"partCode":"1","status":"non_compliant"},{"partCode":"4","status":"non_compliant"}]'::jsonb,
    '[{"partCode":"1","defectCode":"1.3.1","severity":"EOV"},{"partCode":"4","defectCode":"4.1.1","severity":"EOV"}]'::jsonb,
    'driving_ban', true, '60001019906'
);

-- CF 95010008 — sõidukeeld 2
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010008, 'KOOND-2026-9008/1', 2026, 1, 'published',
    '2026-08-26', '14:20', 'EE',
    'Super', 'Admin', 'PPA', 'Piirivalve', 'Vaneminspektor',
    'LV-3344-CD', 'LV', 'N2',
    '40022334455', 'Rīgas Transports SIA', '[]'::jsonb, '[]'::jsonb, '60001019906'
);
INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
    parts_summary, parts_defects, result_type, result_transport_interruption, created_by
) VALUES (
    95210006, 95010008, 'th-2026-95210006', 1, 'published',
    '[{"partCode":"5","status":"non_compliant"}]'::jsonb,
    '[{"partCode":"5","defectCode":"5.2.1","severity":"EOV"}]'::jsonb,
    'driving_ban', true, '60001019906'
);

-- CF 95010009 — kaal/mõõt
INSERT INTO forms.compound_form (
    compound_form_key, form_number, control_year, template_version, status,
    control_date, control_time, control_country_code,
    inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
    vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
    company_reg_code, company_name, trailers, drivers, created_by
) VALUES (
    95010009, 'KOOND-2026-9009/1', 2026, 1, 'published',
    '2026-09-04', '06:30', 'EE',
    'Super', 'Admin', 'PPA', 'Piirivalve', 'Vaneminspektor',
    'DE-HH-9901', 'DE', 'N3',
    '80055667788', 'Hamburg Logistics GmbH', '[]'::jsonb, '[]'::jsonb, '60001019906'
);
INSERT INTO forms.sp_driver_form (
    sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
    transport_type, mass_dimension_non_compliant, mass_dimension_measurements, created_by
) VALUES (
    95110003, 95010009, 'sp-2026-95110003', 1, 'published',
    'international', true,
    '[{"measurement_type":"width","actual_value":270,"allowed_value":255,"excess_value":15}]'::jsonb,
    '60001019906'
);

-- NCR 3 — Super Admin (incoming, LV saadab EE-le)
v_ncr := nextval('erru.seq_ncr_message_key');
INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status,
    business_case_id, technical_id, workflow_id, sent_at,
    ncr_from, ncr_to, originating_authority, request_source, request_purpose,
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, serious_infringements, created_by
) VALUES (
    v_ncr, 1, 'incoming', 'received',
    'LV-NCR-2026-SA001', 'aa010003-0000-0000-0000-000000000003'::UUID, 'bb010003-0000-0000-0000-000000000003'::UUID,
    '2026-07-28 09:00:00+03', 'LV', 'EE',
    'RTSA Latvia', 'RSI', 'Control',
    'AS Tallinna Ekspress', 'EE-CL-33003',
    '789GHI', 'EE',
    'Fail', '2026-07-27',
    '[{"category":"VSI","infringementType":"302","dateOfInfringement":"2026-07-27","appealPossible":true,"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":90}]}]'::jsonb,
    '60001019906'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TEAVITUSED — notifications.notification
-- Kõik 12 sündmust lähevad tabelisse. Kasutajad näevad vastavalt õigustele:
--   driving_ban / weight_violation → rsi.read
--   ncr_violation                  → ncr.read
-- ══════════════════════════════════════════════════════════════════════════════

-- driving_ban teavitused (6 vormi)
INSERT INTO notifications.notification (type, required_permission, related_entity_type, related_entity_id, title_et, body_et, created_by)
VALUES
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210001', 'Sõidukeeld — LV-456LMN', 'Maris Albrecht tuvastas sõidukeelu LV sõidukile 456LMN (Läti Veod). Kontroll: 04.08.2026.', 'system'),
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210002', 'Sõidukeeld — DE-B-7701', 'Maris Albrecht tuvastas sõidukeelu DE sõidukile DE-B-7701 (Schnell Transport). Kontroll: 18.08.2026.', 'system'),
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210003', 'Sõidukeeld — FI-ABC-220', 'Eda Rembel tuvastas sõidukeelu FI sõidukile FI-ABC-220 (Pohjolan Kuljetus). Kontroll: 22.07.2026.', 'system'),
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210004', 'Sõidukeeld — LV-1111-BC', 'Eda Rembel tuvastas sõidukeelu LV sõidukile LV-1111-BC (Baltic Road). Kontroll: 30.08.2026.', 'system'),
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210005', 'Sõidukeeld — PL-KR-5522', 'Super Admin tuvastas sõidukeelu PL sõidukile PL-KR-5522 (Kraków Cargo). Kontroll: 10.07.2026.', 'system'),
    ('driving_ban', 'rsi.read', 'vehicle_technical', '95210006', 'Sõidukeeld — LV-3344-CD', 'Super Admin tuvastas sõidukeelu LV sõidukile LV-3344-CD (Rīgas Transports). Kontroll: 26.08.2026.', 'system')
ON CONFLICT (type, related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL DO NOTHING;

-- weight_violation teavitused (3 vormi)
INSERT INTO notifications.notification (type, required_permission, related_entity_type, related_entity_id, title_et, body_et, created_by)
VALUES
    ('weight_violation', 'rsi.read', 'sp_driver_form', '95110001', 'Kaal/mõõt ületus — PL-789OPQ', 'Maris Albrecht tuvastas kaalu ületuse PL sõidukil 789OPQ (Trans-East): tegelik 42t, lubatud 40t. Kontroll: 01.09.2026.', 'system'),
    ('weight_violation', 'rsi.read', 'sp_driver_form', '95110002', 'Kaal/mõõt ületus — PL-WA-0011', 'Eda Rembel tuvastas teljekoormuse ületuse PL sõidukil PL-WA-0011 (GITD Logistyk): +1000 kg. Kontroll: 03.09.2026.', 'system'),
    ('weight_violation', 'rsi.read', 'sp_driver_form', '95110003', 'Kaal/mõõt ületus — DE-HH-9901', 'Super Admin tuvastas laiuse ületuse DE sõidukil DE-HH-9901 (Hamburg Logistics): 270cm, lubatud 255cm. Kontroll: 04.09.2026.', 'system')
ON CONFLICT (type, related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL DO NOTHING;

-- ncr_violation teavitused (3 sissetulevat NCR teadet)
INSERT INTO notifications.notification (type, required_permission, related_entity_type, related_entity_id, title_et, body_et, created_by)
VALUES
    ('ncr_violation', 'ncr.read', 'ncr', 'DE-NCR-2026-MA001', 'NCR — DE kontrollis EE sõidukit (AS Rapla Piim)', 'Saksamaa (BAG) teavitas rikkumisest: MSI 302, sõiduk 123ABC, kontrollikuupäev 11.08.2026.', 'system'),
    ('ncr_violation', 'ncr.read', 'ncr', 'FI-NCR-2026-ER001', 'NCR — FI kontrollis EE sõidukit (AS Tallinna Veod)', 'Soome (Traficom) teavitas rikkumisest: VSI 201, sõiduk 456DEF, kontrollikuupäev 01.09.2026.', 'system'),
    ('ncr_violation', 'ncr.read', 'ncr', 'LV-NCR-2026-SA001', 'NCR — LV kontrollis EE sõidukit (AS Tallinna Ekspress)', 'Läti (RTSA) teavitas rikkumisest: VSI 302, sõiduk 789GHI, kontrollikuupäev 27.07.2026.', 'system')
ON CONFLICT (type, related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL DO NOTHING;

-- Advance sequences past fixture keys
PERFORM setval('forms.seq_vehicle_technical_form_key', GREATEST(95210006, (SELECT last_value FROM forms.seq_vehicle_technical_form_key)));
PERFORM setval('forms.seq_sp_driver_form_key',         GREATEST(95110003, (SELECT last_value FROM forms.seq_sp_driver_form_key)));

RAISE NOTICE 'notification-test-fixtures created: 9 compound forms, 6 VT, 3 SP, 3 NCR, 12 notifications';

END $$;
