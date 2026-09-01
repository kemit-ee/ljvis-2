-- liquibase formatted sql
-- changeset ljvis:20261021100001 ignore:true splitStatements:false
--
-- Test/dev-only fixture for the automatic NCR dispatch Newman suite
-- (cron-jobs.collection.json, LJVIS2-64). One PUBLISHED autojuhi sõidu- ja
-- puhkeaja alamvorm with result KORRAS (result_type defaults to 'ok') on a
-- FOREIGN (DE) N2 vehicle whose carrier has a community-licence copy number —
-- i.e. exactly what select-autodispatch-candidates.sql should pick up.
--
-- Deterministic keys 900011 so Newman can reference them directly. Sequences
-- are advanced past the fixtures. erru_points is empty ('[]') so build.sql
-- derives checkResult = Pass.
--
DO $$
DECLARE
    v_cf BIGINT := 900011;
    v_sp BIGINT := 900011;
BEGIN
    IF EXISTS (SELECT 1 FROM forms.compound_form WHERE compound_form_key = v_cf) THEN
        RAISE NOTICE 'NCR autodispatch fixture already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO forms.compound_form (
        compound_form_key, form_number, control_year, template_version, status,
        control_date, control_time, control_country_code,
        inspector_first_name, inspector_last_name, inspector_organisation_id, inspector_unit, inspector_profession,
        vehicle_reg_nr, vehicle_country_code, vehicle_category_code,
        company_reg_code, company_name, company_activity_licence_copy_number, created_by
    ) VALUES (
        v_cf, 'NCR-AUTODISPATCH-FIXTURE', 2026, 1, 'published',
        CURRENT_DATE - 2, '09:00', 'EE',
        'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
        'DE-NCR-01', 'DE', 'N2',
        -- non-8-digit reg code: stays out of risk-score recalc (which filters ~ '^[0-9]{8}$')
        'DE-REG-01', 'Auslandtransport GmbH', 'DE-CL-99887', 'system'
    );

    INSERT INTO forms.sp_driver_form (
        sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
        transport_type, erru_points, created_by
    ) VALUES (
        v_sp, v_cf, 'NCR-AUTODISPATCH-FIXTURE-SP', 1, 'published',
        'international', '[]'::JSONB, 'system'
    );

    PERFORM setval('forms.seq_compound_form_key', GREATEST(v_cf, (SELECT last_value FROM forms.seq_compound_form_key)));
    PERFORM setval('forms.seq_sp_driver_form_key', GREATEST(v_sp, (SELECT last_value FROM forms.seq_sp_driver_form_key)));

    RAISE NOTICE 'NCR autodispatch fixture created: cf=%, sp=%', v_cf, v_sp;
END $$;
