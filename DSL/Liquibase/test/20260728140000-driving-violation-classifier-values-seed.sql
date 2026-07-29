-- liquibase formatted sql
-- changeset ljvis:20260728140000 ignore:true splitStatements:false
--
-- Test/dev-only seed: two classifiers used by the Labour Inspectorate control act
-- (labour_inspection_form, LJVIS-75). Classifier VALUE data is seeded exclusively via
-- DSL/Liquibase/test/ (plain-SQL, applied in dev/CI only) — never via the production
-- changelog/ — consistent with the rest of the project's classifier data (see e.g.
-- 20260630100002-form-classifier-data.sql). In production, classifier values are entered
-- via the "Classifier value management" functionality, not via Liquibase migrations.
--
-- 1. DRIVING_VIOLATION — 3-level hierarchy per LJVIS-75 analysis §4 "Rikkumised":
--      level 1 (parent_key NULL)   = regulation category group (e.g. "Sõiduajad")
--      level 2 (parent_key = L1)   = legal-basis article reference (e.g. "Artikli 6 lõige 1")
--      level 3 (parent_key = L2)   = severity/range leaf code (e.g. "MI · 9h < ... < 10h")
--
--    IMPORTANT — level-3 data limitation: the source analysis document only gives two
--    illustrative level-3 examples ("MI · 9h < ... < 10h", "SI · 10h ... < 11h") and does not
--    provide the full severity/range table (MSI/VSI/SI/MI bands) for every one of the 27
--    level-2 legal-basis entries below. Fabricating a full legally-binding severity table
--    without that source data would risk seeding incorrect compliance data. This seed
--    therefore adds exactly ONE clearly-marked PLACEHOLDER level-3 leaf per level-2 entry so
--    the hierarchy, UI, and violations JSONB shape are fully exercisable in dev/test. The real
--    severity/range table (e.g. sourced from the ERRU severity classification under
--    Commission Implementing Regulation (EU) 2016/403) MUST replace these placeholder leaves
--    via the "Classifier value management" functionality before production go-live.
--
-- 2. TRANSPORT_TYPE (Transpordiliigid) — flat 4-value classifier for the "Kontrollimised" matrix.

DO $$
DECLARE
    v_driving_violation_classifier_key BIGINT;
    v_transport_type_classifier_key    BIGINT;
    v_l1_key                           BIGINT;
    v_l2_key                           BIGINT;
    v_regulation                       TEXT;
    v_l1_name                          TEXT;
    v_l1_code                          TEXT;
    v_l2_names                         TEXT[];
    v_l2_name                          TEXT;
    v_l2_idx                           INTEGER;
    v_l1_idx                           INTEGER;
    v_group_parts                      TEXT[];
    -- One row per level-1 group, pipe-delimited: 'regulation|level-1 name|level-1 code|level-2 name 1;level-2 name 2;...'
    -- (a flat TEXT[] is used instead of a nested TEXT[][] because Postgres requires all
    -- sub-arrays of a multidimensional array literal to share the same length, which the
    -- level-2 lists below do not — they range from 1 to 10 entries per group)
    v_groups                           TEXT[] := ARRAY[
        '(EÜ) nr 561/2006|Sõiduajad|REG561_DRIVING_TIME|Artikli 6 lõige 1;Artikli 6 lõige 2;Artikli 6 lõige 3',
        '(EÜ) nr 561/2006|Vaheajad|REG561_BREAKS|Artikkel 7',
        '(EÜ) nr 561/2006|Puhkeperioodid|REG561_REST_PERIODS|Artikli 8 lõige 2;Artikli 8 lõige 5;Artikli 8 lõige 6',
        '(EÜ) nr 561/2006|12 päeva reeglist lubatav erand|REG561_12DAY_EXCEPTION|Artikli 8 lõike 6 punkt a;Artikli 8 lõike 6 punkt b alapunkt ii;Artikli 8 lõike 6 punkt d',
        '(EÜ) nr 561/2006|Töökorraldus|REG561_WORK_ORGANISATION|Artikli 10 lõige 1;Artikli 10 lõige 2',
        '(EL) nr 165/2014|Sõidumeerikute, juhikaartide või salvestuslehtede kasutamine|REG165_TACHOGRAPH_USE|Artikkel 27;Artikli 32 lõige 1;Artikli 32 lõige 1 ja artikli 33 lõige 1;Artikli 32 lõige 3;Artikli 33 lõige 2;Artikli 34 lõige 1;Artikli 34 lõige 2;Artikli 34 lõige 3;Artikli 34 lõige 4;Artikli 34 lõige 5',
        '(EL) nr 165/2014|Rikked|REG165_MALFUNCTIONS|Artikli 37 lõige 2',
        'direktiiv 2002/15/EÜ|Maksimaalne iganädalane tööaeg|DIR200215_MAX_WEEKLY_WORKTIME|Artikkel 4',
        'direktiiv 2002/15/EÜ|Vaheajad|DIR200215_BREAKS|Artikli 5 lõige 1',
        'direktiiv 2002/15/EÜ|Öötöö|DIR200215_NIGHT_WORK|Artikli 7 lõige 1',
        'direktiiv 2002/15/EÜ|Salvestused|DIR200215_RECORDS|Artikkel 9'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DRIVING_VIOLATION') THEN
        RETURN;
    END IF;

    -- ── 1. DRIVING_VIOLATION classifier ──────────────────────────────────
    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    VALUES (
        nextval('classifier.seq_classifier_key'),
        'DRIVING_VIOLATION',
        'Sõiduaja- ja puhkeaja rikkumised',
        'EL määruse (EÜ) nr 561/2006, EL määruse (EL) nr 165/2014 ja direktiivi 2002/15/EÜ rikkumiste 3-tasandiline klassifikaator (LJVIS-75).',
        'ljvis2'
    )
    RETURNING classifier_key INTO v_driving_violation_classifier_key;

    FOR v_l1_idx IN 1 .. array_length(v_groups, 1) LOOP
        v_group_parts := string_to_array(v_groups[v_l1_idx], '|');
        v_regulation  := v_group_parts[1];
        v_l1_name     := v_group_parts[2];
        v_l1_code     := v_group_parts[3];
        v_l2_names    := string_to_array(v_group_parts[4], ';');

        INSERT INTO classifier.classifier_value (
            classifier_value_key, classifier_key, code, name, description, parent_key, valid_from, created_by
        )
        VALUES (
            nextval('classifier.seq_classifier_value_key'),
            v_driving_violation_classifier_key,
            v_l1_code,
            v_l1_name,
            v_regulation,
            NULL,
            CURRENT_DATE,
            'ljvis2'
        )
        RETURNING classifier_value_key INTO v_l1_key;

        FOR v_l2_idx IN 1 .. array_length(v_l2_names, 1) LOOP
            v_l2_name := v_l2_names[v_l2_idx];

            INSERT INTO classifier.classifier_value (
                classifier_value_key, classifier_key, code, name, description, parent_key, valid_from, created_by
            )
            VALUES (
                nextval('classifier.seq_classifier_value_key'),
                v_driving_violation_classifier_key,
                v_l1_code || '_L2_' || v_l2_idx,
                v_l2_name,
                v_regulation || ' - ' || v_l1_name,
                v_l1_key,
                CURRENT_DATE,
                'ljvis2'
            )
            RETURNING classifier_value_key INTO v_l2_key;

            -- PLACEHOLDER level-3 leaf — see file header comment. Replace before go-live.
            INSERT INTO classifier.classifier_value (
                classifier_value_key, classifier_key, code, name, description, parent_key, valid_from, created_by
            )
            VALUES (
                nextval('classifier.seq_classifier_value_key'),
                v_driving_violation_classifier_key,
                v_l1_code || '_L2_' || v_l2_idx || '_L3_PLACEHOLDER',
                'MI · PLACEHOLDER — asenda tegeliku raskusastme vahemikuga',
                'PLACEHOLDER level-3 leaf; test/dev-only, real severity/range table not present in source analysis document.',
                v_l2_key,
                CURRENT_DATE,
                'ljvis2'
            );
        END LOOP;
    END LOOP;

    -- ── 2. TRANSPORT_TYPE (Transpordiliigid) classifier — flat, 4 values ─
    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    VALUES (
        nextval('classifier.seq_classifier_key'),
        'TRANSPORT_TYPE',
        'Transpordiliigid',
        'Veoliikide klassifikaator Tööinspektsiooni kontrollakti "Kontrollimised" maatriksi ridade jaoks (LJVIS-75).',
        'ljvis2'
    )
    RETURNING classifier_key INTO v_transport_type_classifier_key;

    INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
    VALUES
        (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'PASSENGER_TRANSPORT', 'Sõitjate vedu', CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'CARGO_TRANSPORT', 'Veose vedu', CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'OWN_ACCOUNT_TRANSPORT', 'Oma kulul autovedu', CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'COMMERCIAL_TRANSPORT', 'Tasuline autovedu', CURRENT_DATE, 'ljvis2');
END $$;
