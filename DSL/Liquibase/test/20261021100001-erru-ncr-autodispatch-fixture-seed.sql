-- liquibase formatted sql
-- changeset ljvis:20261021100001 ignore:true splitStatements:false
--
-- Test/dev-only fixture for the automatic NCR dispatch Newman suite
-- (cron-jobs.collection.json, LJVIS2-64). PUBLISHED driver and teammate forms
-- with result KORRAS (result_type defaults to 'ok') on a
-- Polish (PL) N2 vehicle used by an LT carrier with a missing licence-copy number —
-- i.e. exactly what select-autodispatch-candidates.sql should pick up.
--
-- Deterministic keys 900011-900016 so Newman can reference them directly. Sequences
-- are advanced past the fixtures. erru_points is empty ('[]') so build.sql
-- derives checkResult = Pass.
--
DO $$
DECLARE
    v_cf BIGINT := 900011;
    v_sp BIGINT := 900011;
    v_offset INTEGER;
    v_applicability TEXT;
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
        company_reg_code, company_name, company_country_code, company_activity_licence_copy_number, created_by
    ) VALUES (
        v_cf, 'NCR-AUTODISPATCH-FIXTURE', 2026, 1, 'published',
        CURRENT_DATE - 2, '09:00', 'EE',
        'Test', 'Inspector', 'PPA', 'Liiklusjarelevalve', 'Inspektor',
        'PL-NCR-01', 'PL', 'N2',
        -- non-8-digit reg code: stays out of risk-score recalc (which filters ~ '^[0-9]{8}$')
        'LT-REG-01', 'Test LT Carrier', 'LT', NULL, 'system'
    );

    -- Only key 900011 qualifies. All other conditions stay the same.
    -- Key 900016 first applies, then changes to not checked in a newer snapshot.
    FOR v_offset IN 0..5 LOOP
        v_applicability := CASE v_offset
            WHEN 0 THEN 'RAKENDATAKSE'
            WHEN 1 THEN 'EI_RAKENDATA'
            WHEN 2 THEN 'EI_KONTROLLITUD'
            WHEN 3 THEN NULL
            WHEN 4 THEN ''
            WHEN 5 THEN 'RAKENDATAKSE'
        END;
        INSERT INTO forms.sp_driver_form (
            sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
            transport_type, sp_applicability, erru_points, created_at, created_by
        ) VALUES (
            v_sp + v_offset, v_cf, 'NCR-AUTO-DRIVER-' || v_offset, 1, 'published',
            'international', v_applicability, '[]'::JSONB, now() - INTERVAL '1 minute', 'system'
        );
        INSERT INTO forms.sp_teammate_form (
            sp_teammate_form_key, compound_form_key, sub_form_number, template_version, status,
            transport_type, sp_applicability, erru_points, created_at, created_by
        ) VALUES (
            v_sp + v_offset, v_cf, 'NCR-AUTO-TEAMMATE-' || v_offset, 1, 'published',
            'international', v_applicability, '[]'::JSONB, now() - INTERVAL '1 minute', 'system'
        );
    END LOOP;
    INSERT INTO forms.sp_driver_form (
        sp_driver_form_key, compound_form_key, sub_form_number, template_version, status,
        transport_type, sp_applicability, created_by
    ) VALUES (
        v_sp + 5, v_cf, 'NCR-AUTO-DRIVER-5', 1, 'published',
        'international', 'EI_KONTROLLITUD', 'system'
    );
    INSERT INTO forms.sp_teammate_form (
        sp_teammate_form_key, compound_form_key, sub_form_number, template_version, status,
        transport_type, sp_applicability, created_by
    ) VALUES (
        v_sp + 5, v_cf, 'NCR-AUTO-TEAMMATE-5', 1, 'published',
        'international', 'EI_KONTROLLITUD', 'system'
    );

    PERFORM setval('forms.seq_compound_form_key', GREATEST(v_cf, (SELECT last_value FROM forms.seq_compound_form_key)));
    PERFORM setval('forms.seq_sp_driver_form_key', GREATEST(v_sp + 5, (SELECT last_value FROM forms.seq_sp_driver_form_key)));

    PERFORM setval('forms.seq_sp_teammate_form_key', GREATEST(v_sp + 5, (SELECT last_value FROM forms.seq_sp_teammate_form_key)));

    RAISE NOTICE 'NCR autodispatch fixture created: cf=%, sp=%', v_cf, v_sp;
END $$;
