-- liquibase formatted sql
-- changeset ljvis:20260818100002 ignore:true splitStatements:false
--
-- Test/dev-only fixtures for LJVIS2-64 §4.1 (NCR eeltäitmine) Newman tests: two SP driver
-- sub-forms with deterministic keys, one on an M1 (private car) vehicle and one on an N2
-- (transport undertaking) vehicle, both carrying the SAME erru_points (302 + 105) so the
-- Newman suite can assert that build.sql excludes 302 for M1 but keeps it for N2.
--
-- Deterministic high keys (900001+) are used so Newman can reference them directly without
-- reading back a dynamically-allocated id first. Sequences are advanced past these values
-- so subsequent application-created forms never collide with the fixtures.
--
DO $$
DECLARE
    v_cf_m1  BIGINT := 900001;
    v_sp_m1  BIGINT := 900001;
    v_cf_n2  BIGINT := 900002;
    v_sp_n2  BIGINT := 900002;
BEGIN
    IF EXISTS (SELECT 1 FROM forms.compound_form WHERE compound_form_key = v_cf_m1) THEN
        RAISE NOTICE 'NCR SP-form fixtures already exist, skipping';
        RETURN;
    END IF;

    -- M1 (private car) — 302 (sõidukeeld) must be EXCLUDED from the NCR eeltäitmine
    INSERT INTO forms.compound_form (
        compound_form_key, form_number, control_year, template_version, status,
        control_date, control_time, control_country_code,
        inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
        vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
        company_name, company_activity_licence_copy_number, created_by
    ) VALUES (
        v_cf_m1, 'NCR-FIXTURE-M1', 2026, 1, 'confirmed',
        CURRENT_DATE - 5, '10:00', 'EE',
        'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
        'M1FIXTURE', 'EE', 'M1',
        'NCR Fixture Transport OU', 'EE-CL-FIXTURE1', 'system'
    );
    INSERT INTO forms.sp_driver_form (
        sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
        transport_type, erru_points, created_by
    ) VALUES (
        v_sp_m1, v_cf_m1, 'NCR-FIXTURE-SP-M1', 1, 'confirmed',
        'international',
        '[{"erru_code":"302","severity_category":"MSI","source_type":"auto_from_violation"},{"erru_code":"105","severity_category":"SI","source_type":"manual"}]'::JSONB,
        'system'
    );

    -- N2 (transport undertaking vehicle) — 302 must be KEPT
    INSERT INTO forms.compound_form (
        compound_form_key, form_number, control_year, template_version, status,
        control_date, control_time, control_country_code,
        inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
        vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
        company_name, company_activity_licence_copy_number, created_by
    ) VALUES (
        v_cf_n2, 'NCR-FIXTURE-N2', 2026, 1, 'confirmed',
        CURRENT_DATE - 3, '11:00', 'EE',
        'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
        'N2FIXTURE', 'EE', 'N2',
        'NCR Fixture Transport OU 2', 'EE-CL-FIXTURE2', 'system'
    );
    INSERT INTO forms.sp_driver_form (
        sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
        transport_type, erru_points, created_by
    ) VALUES (
        v_sp_n2, v_cf_n2, 'NCR-FIXTURE-SP-N2', 1, 'confirmed',
        'international',
        '[{"erru_code":"302","severity_category":"MSI","source_type":"auto_from_violation"},{"erru_code":"105","severity_category":"SI","source_type":"manual"}]'::JSONB,
        'system'
    );

    -- Advance sequences past the fixture keys so real usage never collides.
    PERFORM setval('forms.seq_compound_form_key', GREATEST(v_cf_n2, (SELECT last_value FROM forms.seq_compound_form_key)));
    PERFORM setval('forms.seq_sp_driver_form_key', GREATEST(v_sp_n2, (SELECT last_value FROM forms.seq_sp_driver_form_key)));

    RAISE NOTICE 'NCR SP-form fixtures created: M1 cf=%/sp=%, N2 cf=%/sp=%', v_cf_m1, v_sp_m1, v_cf_n2, v_sp_n2;
END $$;
