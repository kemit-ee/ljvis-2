-- liquibase formatted sql
-- changeset ljvis:20260528114200 ignore:true

DO $$
DECLARE
    v_seed_by TEXT := 'seed_epic_02_09';
    v_admin_user_id BIGINT;
    v_liisa_user_id BIGINT;
    v_peeter_user_id BIGINT;
    v_kliim_org_id BIGINT;
    v_trans_org_id BIGINT;
    v_classifier_group_id BIGINT;
    v_membership_id BIGINT;
    v_link_id BIGINT;
    v_permission_id BIGINT;
    v_classifier_id BIGINT;
    v_classifier_value_id BIGINT;
BEGIN
    SELECT id
    INTO v_admin_user_id
    FROM user_account
    WHERE personal_code = '38001085718'
    ORDER BY id
    LIMIT 1;

    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Required base seed user with personal_code 38001085718 is missing';
    END IF;

    INSERT INTO organisation (name, code, created_by)
    VALUES ('Kliimaministeerium', 'KLI', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO organisation (name, code, created_by)
    VALUES ('Transpordiamet', 'TRA', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO v_kliim_org_id FROM organisation WHERE code = 'KLI';
    SELECT id INTO v_trans_org_id FROM organisation WHERE code = 'TRA';

    INSERT INTO user_account (personal_code, created_by)
    VALUES ('49501010011', v_seed_by)
    ON CONFLICT (personal_code) DO NOTHING;

    INSERT INTO user_account (personal_code, created_by)
    VALUES ('49602020022', v_seed_by)
    ON CONFLICT (personal_code) DO NOTHING;

    SELECT id INTO v_liisa_user_id FROM user_account WHERE personal_code = '49501010011';
    SELECT id INTO v_peeter_user_id FROM user_account WHERE personal_code = '49602020022';

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_data_state
        WHERE user_account_id = v_liisa_user_id
          AND first_name = 'Liisa'
          AND last_name = 'Klassifikaator'
          AND organisation_id = v_trans_org_id
          AND email = 'liisa.klassifikaator@transpordiamet.ee'
          AND structural_unit = 'TRAM'
          AND job_title = 'Analüütik'
    ) THEN
        INSERT INTO user_account_data_state (
            user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, access_end, created_at, created_by
        ) VALUES (
            v_liisa_user_id, 'Liisa', 'Klassifikaator', v_trans_org_id, 'liisa.klassifikaator@transpordiamet.ee', '51234567', 'TRAM', 'Analüütik', DATE '2025-01-01', NULL, now() - INTERVAL '2 days', v_seed_by
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_data_state
        WHERE user_account_id = v_liisa_user_id
          AND first_name = 'Liisa'
          AND last_name = 'Klassifikaator'
          AND organisation_id = v_kliim_org_id
          AND email = 'liisa.klassifikaator@kliimaministeerium.ee'
          AND structural_unit = 'KLIM'
          AND job_title = 'Peakasutaja'
    ) THEN
        INSERT INTO user_account_data_state (
            user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, access_end, created_at, created_by
        ) VALUES (
            v_liisa_user_id, 'Liisa', 'Klassifikaator', v_kliim_org_id, 'liisa.klassifikaator@kliimaministeerium.ee', '51234567', 'KLIM', 'Peakasutaja', DATE '2025-02-01', NULL, now() - INTERVAL '1 day', v_seed_by
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_state
        WHERE user_account_id = v_liisa_user_id
          AND status = 'active'
    ) THEN
        INSERT INTO user_account_state (user_account_id, status, created_at, created_by)
        VALUES (v_liisa_user_id, 'active', now() - INTERVAL '1 day', v_seed_by);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_data_state
        WHERE user_account_id = v_peeter_user_id
          AND first_name = 'Peeter'
          AND last_name = 'Vaataja'
          AND organisation_id = v_trans_org_id
          AND email = 'peeter.vaataja@transpordiamet.ee'
          AND structural_unit = 'LÄÄNE PREFEKTUUR'
          AND job_title = 'Koordinaator'
    ) THEN
        INSERT INTO user_account_data_state (
            user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, access_end, created_at, created_by
        ) VALUES (
            v_peeter_user_id, 'Peeter', 'Vaataja', v_trans_org_id, 'peeter.vaataja@transpordiamet.ee', '59876543', 'LÄÄNE PREFEKTUUR', 'Koordinaator', DATE '2025-03-01', DATE '2026-12-31', now() - INTERVAL '1 day', v_seed_by
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_state
        WHERE user_account_id = v_peeter_user_id
          AND status = 'active'
    ) THEN
        INSERT INTO user_account_state (user_account_id, status, created_at, created_by)
        VALUES (v_peeter_user_id, 'active', now() - INTERVAL '12 hours', v_seed_by);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_state
        WHERE user_account_id = v_peeter_user_id
          AND status = 'pending_deactivation'
    ) THEN
        INSERT INTO user_account_state (user_account_id, status, created_at, created_by)
        VALUES (v_peeter_user_id, 'pending_deactivation', now() - INTERVAL '6 hours', v_seed_by);
    END IF;

    SELECT ugns.user_group_id
    INTO v_classifier_group_id
    FROM user_group_name_state ugns
    WHERE ugns.name = 'Klassifikaatori haldurid'
    ORDER BY ugns.id DESC
    LIMIT 1;

    IF v_classifier_group_id IS NULL THEN
        INSERT INTO user_group (created_by)
        VALUES (v_seed_by)
        RETURNING id INTO v_classifier_group_id;

        INSERT INTO user_group_name_state (user_group_id, name, created_at, created_by)
        VALUES (v_classifier_group_id, 'Klassifikaatori haldurid', now() - INTERVAL '1 day', v_seed_by);
    END IF;

    SELECT id
    INTO v_link_id
    FROM user_group_organisation
    WHERE user_group_id = v_classifier_group_id
      AND organisation_id = v_kliim_org_id
    ORDER BY id
    LIMIT 1;

    IF v_link_id IS NULL THEN
        INSERT INTO user_group_organisation (user_group_id, organisation_id, created_by)
        VALUES (v_classifier_group_id, v_kliim_org_id, v_seed_by)
        RETURNING id INTO v_link_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_group_organisation_state
        WHERE user_group_organisation_id = v_link_id
          AND status = 'active'
    ) THEN
        INSERT INTO user_group_organisation_state (user_group_organisation_id, status, created_by)
        VALUES (v_link_id, 'active', v_seed_by);
    END IF;

    SELECT id
    INTO v_link_id
    FROM user_group_organisation
    WHERE user_group_id = v_classifier_group_id
      AND organisation_id = v_trans_org_id
    ORDER BY id
    LIMIT 1;

    IF v_link_id IS NULL THEN
        INSERT INTO user_group_organisation (user_group_id, organisation_id, created_by)
        VALUES (v_classifier_group_id, v_trans_org_id, v_seed_by)
        RETURNING id INTO v_link_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_group_organisation_state
        WHERE user_group_organisation_id = v_link_id
          AND status = 'active'
    ) THEN
        INSERT INTO user_group_organisation_state (user_group_organisation_id, status, created_by)
        VALUES (v_link_id, 'active', v_seed_by);
    END IF;

    INSERT INTO permission (code, description, created_by)
    VALUES ('classifier.list', 'Klassifikaatorite nimekirja vaatamine (kogu süsteemiülene kataloog).', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO permission (code, description, created_by)
    VALUES ('classifier.read', 'Klassifikaatori detailvaate avamine (päis + väärtuste nimekiri).', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO permission (code, description, created_by)
    VALUES ('classifier.edit', 'Klassifikaatori päise muutmine (nimetus, selgitus); kood muutmatu.', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO permission (code, description, created_by)
    VALUES ('classifier_value.edit', 'Klassifikaatori väärtuse lisamine ning kehtivusperioodi muutmine.', v_seed_by)
    ON CONFLICT (code) DO NOTHING;

    FOREACH v_permission_id IN ARRAY ARRAY[
        (SELECT id FROM permission WHERE code = 'classifier.list'),
        (SELECT id FROM permission WHERE code = 'classifier.read'),
        (SELECT id FROM permission WHERE code = 'classifier.edit'),
        (SELECT id FROM permission WHERE code = 'classifier_value.edit')
    ]
    LOOP
        SELECT id
        INTO v_link_id
        FROM user_group_permission
        WHERE user_group_id = v_classifier_group_id
          AND permission_id = v_permission_id
        ORDER BY id
        LIMIT 1;

        IF v_link_id IS NULL THEN
            INSERT INTO user_group_permission (user_group_id, permission_id, created_by)
            VALUES (v_classifier_group_id, v_permission_id, v_seed_by)
            RETURNING id INTO v_link_id;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM user_group_permission_state
            WHERE user_group_permission_id = v_link_id
              AND status = 'active'
        ) THEN
            INSERT INTO user_group_permission_state (user_group_permission_id, status, created_by)
            VALUES (v_link_id, 'active', v_seed_by);
        END IF;
    END LOOP;

    SELECT id
    INTO v_membership_id
    FROM user_account_user_group
    WHERE user_account_id = v_liisa_user_id
      AND user_group_id = v_classifier_group_id
    ORDER BY id
    LIMIT 1;

    IF v_membership_id IS NULL THEN
        INSERT INTO user_account_user_group (user_account_id, user_group_id, created_by)
        VALUES (v_liisa_user_id, v_classifier_group_id, v_seed_by)
        RETURNING id INTO v_membership_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_user_group_state
        WHERE user_account_user_group_id = v_membership_id
          AND status = 'active'
    ) THEN
        INSERT INTO user_account_user_group_state (user_account_user_group_id, status, created_by)
        VALUES (v_membership_id, 'active', v_seed_by);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_latest
        WHERE user_account_id = v_liisa_user_id
          AND created_by = v_seed_by
    ) THEN
        INSERT INTO user_account_latest (
            user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title, organisation_id, organisation_name, access_start, access_end, status, user_groups, created_by
        ) VALUES (
            v_liisa_user_id,
            '49501010011',
            'Liisa',
            'Klassifikaator',
            'liisa.klassifikaator@kliimaministeerium.ee',
            '51234567',
            'KLIM',
            'Peakasutaja',
            v_kliim_org_id,
            'Kliimaministeerium',
            DATE '2025-02-01',
            NULL,
            'active',
            jsonb_build_array(jsonb_build_object('id', v_classifier_group_id, 'name', 'Klassifikaatori haldurid')),
            v_seed_by
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_account_latest
        WHERE user_account_id = v_peeter_user_id
          AND created_by = v_seed_by
    ) THEN
        INSERT INTO user_account_latest (
            user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title, organisation_id, organisation_name, access_start, access_end, status, user_groups, created_by
        ) VALUES (
            v_peeter_user_id,
            '49602020022',
            'Peeter',
            'Vaataja',
            'peeter.vaataja@transpordiamet.ee',
            '59876543',
            'LÄÄNE PREFEKTUUR',
            'Koordinaator',
            v_trans_org_id,
            'Transpordiamet',
            DATE '2025-03-01',
            DATE '2026-12-31',
            'pending_deactivation',
            '[]'::jsonb,
            v_seed_by
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM user_group_latest
        WHERE user_group_id = v_classifier_group_id
          AND created_by = v_seed_by
    ) THEN
        INSERT INTO user_group_latest (
            user_group_id, name, organisations, covers_all_organisations, permissions, created_by
        ) VALUES (
            v_classifier_group_id,
            'Klassifikaatori haldurid',
            jsonb_build_array(
                jsonb_build_object('id', v_kliim_org_id, 'name', 'Kliimaministeerium'),
                jsonb_build_object('id', v_trans_org_id, 'name', 'Transpordiamet')
            ),
            false,
            jsonb_build_array(
                jsonb_build_object('id', (SELECT id FROM permission WHERE code = 'classifier.list'), 'code', 'classifier.list'),
                jsonb_build_object('id', (SELECT id FROM permission WHERE code = 'classifier.read'), 'code', 'classifier.read'),
                jsonb_build_object('id', (SELECT id FROM permission WHERE code = 'classifier.edit'), 'code', 'classifier.edit'),
                jsonb_build_object('id', (SELECT id FROM permission WHERE code = 'classifier_value.edit'), 'code', 'classifier_value.edit')
            ),
            v_seed_by
        );
    END IF;

    INSERT INTO classifier (code, created_by)
    VALUES ('RIIK', v_admin_user_id)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO classifier (code, created_by)
    VALUES ('DOKL', v_admin_user_id)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO classifier (code, created_by)
    VALUES ('SUGU', v_admin_user_id)
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'RIIK';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_name_state WHERE classifier_id = v_classifier_id AND name = 'Riik'
    ) THEN
        INSERT INTO classifier_name_state (classifier_id, name, description, created_by)
        VALUES (v_classifier_id, 'Riik', 'Riikide klassifikaator', v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_latest WHERE classifier_id = v_classifier_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_latest (classifier_id, code, name, description, created_by)
        VALUES (v_classifier_id, 'RIIK', 'Riik', 'Riikide klassifikaator', v_admin_user_id);
    END IF;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'DOKL';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_name_state WHERE classifier_id = v_classifier_id AND name = 'Dokumendi liik'
    ) THEN
        INSERT INTO classifier_name_state (classifier_id, name, description, created_by)
        VALUES (v_classifier_id, 'Dokumendi liik', 'Dokumendi liikide klassifikaator', v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_latest WHERE classifier_id = v_classifier_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_latest (classifier_id, code, name, description, created_by)
        VALUES (v_classifier_id, 'DOKL', 'Dokumendi liik', 'Dokumendi liikide klassifikaator', v_admin_user_id);
    END IF;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'SUGU';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_name_state WHERE classifier_id = v_classifier_id AND name = 'Sugu'
    ) THEN
        INSERT INTO classifier_name_state (classifier_id, name, description, created_by)
        VALUES (v_classifier_id, 'Sugu', 'Soo klassifikaator', v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_latest WHERE classifier_id = v_classifier_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_latest (classifier_id, code, name, description, created_by)
        VALUES (v_classifier_id, 'SUGU', 'Sugu', 'Soo klassifikaator', v_admin_user_id);
    END IF;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'RIIK';

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'EE', 'Eesti', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'EE';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'RIIK', 'EE', 'Eesti', DATE '2020-01-01', NULL, true, v_admin_user_id);
    END IF;

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'FI', 'Soome', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'FI';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'RIIK', 'FI', 'Soome', DATE '2020-01-01', NULL, true, v_admin_user_id);
    END IF;

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'LV', 'Läti', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'LV';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until = DATE '2025-12-31'
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', DATE '2025-12-31', v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'RIIK', 'LV', 'Läti', DATE '2020-01-01', DATE '2025-12-31', false, v_admin_user_id);
    END IF;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'DOKL';

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'TAOTLUS', 'Taotlus', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'TAOTLUS';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2024-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2024-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'DOKL', 'TAOTLUS', 'Taotlus', DATE '2024-01-01', NULL, true, v_admin_user_id);
    END IF;

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'LUBA', 'Luba', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'LUBA';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2024-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2024-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'DOKL', 'LUBA', 'Luba', DATE '2024-01-01', NULL, true, v_admin_user_id);
    END IF;

    SELECT id INTO v_classifier_id FROM classifier WHERE code = 'SUGU';

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'M', 'Mees', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'M';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'SUGU', 'M', 'Mees', DATE '2020-01-01', NULL, true, v_admin_user_id);
    END IF;

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'N', 'Naine', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'N';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'SUGU', 'N', 'Naine', DATE '2020-01-01', NULL, true, v_admin_user_id);
    END IF;

    INSERT INTO classifier_value (classifier_id, code, name, created_by)
    VALUES (v_classifier_id, 'X', 'Määramata', v_admin_user_id)
    ON CONFLICT (classifier_id, code) DO NOTHING;
    SELECT id INTO v_classifier_value_id FROM classifier_value WHERE classifier_id = v_classifier_id AND code = 'X';
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_validity_state WHERE classifier_value_id = v_classifier_value_id AND valid_from = DATE '2020-01-01' AND valid_until IS NULL
    ) THEN
        INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
        VALUES (v_classifier_value_id, DATE '2020-01-01', NULL, v_admin_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM classifier_value_latest WHERE classifier_value_id = v_classifier_value_id AND created_by = v_admin_user_id
    ) THEN
        INSERT INTO classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, valid_until, is_valid, created_by)
        VALUES (v_classifier_value_id, v_classifier_id, 'SUGU', 'X', 'Määramata', DATE '2020-01-01', NULL, true, v_admin_user_id);
    END IF;
END $$;
