-- liquibase formatted sql
-- changeset ljvis:20261123100000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: 43 level-2 rikkumisliiki (sh Rooma I, kõik 7 lähetamise
-- koodi ja kogu SOIDUAJAD haru) selgusid mõnes keskkonnas olevat täiesti ilma
-- tase-3 (raskusastme) kirjeteta — 20260828277000 seemne suur tase-3
-- lisamisplokk ei ole seal kunagi tegelikult käivitunud; ainus põhjus, miks
-- osa (16+3) rikkumisliike üldse valitavad on, on hilisemad sihitud
-- parandused (20261016100000, 20260901100000 sektsioon A, 20261122110000).
-- Ilma tase-3 kirjeta renderdab singleCheckbox-vaade `null` (Rooma I) või
-- jätab "Vali" rippmenüü halliks (l3Options.length === 0) — rikkumist ei
-- saa üldse lisada.
--
-- Kordab 20260828277000 algset tase-3 andmestikku nende 43 rikkumisliigi
-- jaoks, aga: (a) duplikaatne bare 'MI' kood asendatakse kohe kordumatuga
-- (<parent_code>_MI, sama muster mis 20260901130000/20261122110000), ja
-- (b) raskusaste on juba viidud kooskõlla 2016/403 I lisaga (vt
-- 20260901100000 sektsioon B) — see UPDATE ei jõudnud neid ridu kunagi
-- puudutada, sest neid polnud veel olemas.
--
-- Idempotentne: parendi lapsed lisatakse ainult siis, kui neid MIGRATSIOONI
-- ALGUSES (mitte iga rea kohta eraldi) veel ei olnud — see väldib, et sama
-- parendi 2.-3. rea lisamine jääks vahele, kuna 1. rida on selleks hetkeks
-- juba lisatud.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'DRIVING_VIOLATION'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'DRIVING_VIOLATION classifier not found, skipping';
            RETURN;
        END IF;

        -- Snapshot enne lisamist: parendid, millel juba PRAEGU (enne seda
        -- migratsiooni) pole ühtegi tase-3 last. Ainult neile lisatakse.
        CREATE TEMP TABLE tmp_eligible_parents ON COMMIT DROP AS
            SELECT p.classifier_value_key, p.code
            FROM classifier.classifier_value p
            WHERE p.classifier_key = v_clf_key
              AND NOT EXISTS (
                  SELECT 1 FROM classifier.classifier_value cv
                  WHERE cv.parent_key = p.classifier_value_key
              );

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('SOIDUAJAD_01', 'SOIDUAJAD_01_MI', '9h < ... < 10h',           'MI'),
                ('SOIDUAJAD_01', 'SI901',           '10h ≤ ... < 11h',          'SI'),
                ('SOIDUAJAD_01', 'VSI800',          '11h ≤ ...',                'VSI'),
                ('SOIDUAJAD_02', 'MSI102',          '13h30 ≤ ...',              'MSI'),
                ('SOIDUAJAD_03', 'SOIDUAJAD_03_MI', '10h < ... < 11h',          'MI'),
                ('SOIDUAJAD_03', 'SI902',           '11h ≤ ... < 12h',          'SI'),
                ('SOIDUAJAD_03', 'VSI801',          '12h ≤ ...',                'VSI'),
                ('SOIDUAJAD_04', 'MSI103',          '15h ≤ ...',                'MSI'),
                ('SOIDUAJAD_05', 'SOIDUAJAD_05_MI', '56h < ... < 60h',          'MI'),
                ('SOIDUAJAD_05', 'SI903',           '60h ≤ ... < 65h',          'SI'),
                ('SOIDUAJAD_05', 'VSI802',          '65h ≤ ... < 70h',          'VSI'),
                ('SOIDUAJAD_06', 'MSI104',          '70h ≤ ...',                'MSI'),
                ('SOIDUAJAD_07', 'SOIDUAJAD_07_MI', '90h < ... < 100h',         'MI'),
                ('SOIDUAJAD_07', 'SI904',           '100h ≤ ... < 105h',        'SI'),
                ('SOIDUAJAD_07', 'VSI803',          '105h ≤ ... < 112h30',      'VSI'),
                ('SOIDUAJAD_08', 'MSI101',          '112h30 ≤ ...',             'MSI'),

                ('VAHEAJAD_561_01', 'VAHEAJAD_561_01_MI', '4h30 < ... < 5h',    'MI'),
                ('VAHEAJAD_561_01', 'SI905',              '5h ≤ ... < 6h',      'SI'),
                ('VAHEAJAD_561_01', 'VSI804',             '6h ≤ ...',           'VSI'),

                ('PUHKEPERIOODID_01', 'PUHKEPERIOODID_01_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_01', 'SI906',                '8h30 ≤ ... < 10h', 'SI'),
                ('PUHKEPERIOODID_01', 'VSI805',               '... < 8h30',     'VSI'),
                ('PUHKEPERIOODID_02', 'PUHKEPERIOODID_02_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_02', 'SI907',                '7h ≤ ... < 8h',  'SI'),
                ('PUHKEPERIOODID_02', 'VSI806',               '... < 7h',       'VSI'),
                ('PUHKEPERIOODID_03', 'PUHKEPERIOODID_03_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_03', 'SI908',                '3h + [7h ≤ ... < 8h]', 'SI'),
                ('PUHKEPERIOODID_03', 'VSI807',               '3h + [... < 7h]', 'VSI'),
                ('PUHKEPERIOODID_04', 'PUHKEPERIOODID_04_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_04', 'SI909',                '7h ≤ ... < 8h',  'SI'),
                ('PUHKEPERIOODID_04', 'VSI808',               '... < 7h',       'VSI'),
                ('PUHKEPERIOODID_05', 'PUHKEPERIOODID_05_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_05', 'SI910',                '20h ≤ ... < 22h', 'SI'),
                ('PUHKEPERIOODID_05', 'VSI809',               '... < 20h',      'VSI'),
                ('PUHKEPERIOODID_06', 'PUHKEPERIOODID_06_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_06', 'SI911',                '36h ≤ ... < 42h', 'SI'),
                ('PUHKEPERIOODID_06', 'VSI810',               '... < 36h',      'VSI'),
                ('PUHKEPERIOODID_07', 'PUHKEPERIOODID_07_MI', 'MI',             'MI'),
                ('PUHKEPERIOODID_07', 'SI912',                '3h ≤ ... < 12h', 'SI'),
                ('PUHKEPERIOODID_07', 'VSI811',               '12h ≤ ...',      'VSI'),

                ('PAEVA_12_ERAND_01', 'PAEVA_12_ERAND_01_MI', 'MI',             'MI'),
                ('PAEVA_12_ERAND_01', 'SI913',                '3h ≤ ... < 12h', 'SI'),
                ('PAEVA_12_ERAND_01', 'VSI812',               '12h ≤ ...',      'VSI'),
                ('PAEVA_12_ERAND_02', 'PAEVA_12_ERAND_02_MI', 'MI',             'MI'),
                ('PAEVA_12_ERAND_02', 'SI914',                '65h < ... ≤ 67h', 'SI'),
                ('PAEVA_12_ERAND_02', 'VSI813',               '... ≤ 65h',      'VSI'),
                ('PAEVA_12_ERAND_03', 'SI915',                '3h < ... < 4,5h', 'SI'),
                ('PAEVA_12_ERAND_03', 'VSI814',               '4,5h ≤ ...',     'VSI'),

                ('TOOKORRALDUS_02', 'VSI815', 'VSI', 'MSI'),
                ('TOOKORRALDUS_03', 'VSI816', 'VSI', 'MSI'),

                ('SOIDUMEERIKUD_02', 'VSI818',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_03', 'MSI601',  'MSI', 'MSI'),
                ('SOIDUMEERIKUD_04', 'MSI602',  'MSI', 'MSI'),
                ('SOIDUMEERIKUD_05', 'MSI603',  'MSI', 'MSI'),
                ('SOIDUMEERIKUD_06', 'VSI819',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_07', 'VSI820',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_09', 'MSI205',  'MSI', 'MSI'),
                ('SOIDUMEERIKUD_10', 'VSI821',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_11', 'VSI822',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_12', 'VSI823',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_13', 'VSI824',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_14', 'VSI825',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_15', 'VSI826',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_16', 'VSI827',  'VSI', 'MSI'),
                ('SOIDUMEERIKUD_17', 'SI916',   'SI',  'MSI'),
                ('SOIDUMEERIKUD_18', 'VSI828',  'VSI', 'MSI'),

                ('RIKKED_02', 'VSI835', 'VSI', 'SI'),

                ('MAKS_TOOAEG_01', 'SI917',  '56h ≤ ... < 60h', 'SI'),
                ('MAKS_TOOAEG_01', 'VSI836', '60h ≤ ...',       'VSI'),
                ('MAKS_TOOAEG_02', 'SI918',  '65h ≤ ... < 70h', 'VSI'),
                ('MAKS_TOOAEG_02', 'VSI837', '70h ≤ ...',       'MSI'),

                ('VAHEAJAD_TOOAEG_01', 'SI919',  '10min < ... ≤ 20min', 'SI'),
                ('VAHEAJAD_TOOAEG_01', 'VSI838', '≤ 10min',             'VSI'),
                ('VAHEAJAD_TOOAEG_02', 'SI920',  '20min < ... ≤ 30min', 'SI'),
                ('VAHEAJAD_TOOAEG_02', 'VSI839', '≤ 20min',             'VSI'),

                ('OOTOO_01', 'SI921',  '11h ≤ ... < 13h', 'SI'),
                ('OOTOO_01', 'VSI840', '13h ≤ ...',        'VSI'),

                ('SALVESTUSED_01', 'VSI841', 'VSI', 'MSI'),
                ('SALVESTUSED_02', 'VSI842', 'VSI', 'MSI'),

                ('ROOMA_I_01', 'ROOMA_I_01_MI', 'MI', 'MSI'),

                ('LAHETAMINE_01', 'LAHETAMINE_01_MI', 'MI', 'SI'),
                ('LAHETAMINE_02', 'LAHETAMINE_02_MI', 'MI', 'SI'),
                ('LAHETAMINE_03', 'LAHETAMINE_03_MI', 'MI', 'MSI'),
                ('LAHETAMINE_04', 'LAHETAMINE_04_MI', 'MI', 'MSI'),
                ('LAHETAMINE_05', 'LAHETAMINE_05_MI', 'MI', 'MSI'),
                ('LAHETAMINE_06', 'LAHETAMINE_06_MI', 'MI', 'SI'),
                ('LAHETAMINE_07', 'LAHETAMINE_07_MI', 'MI', 'SI')
            ) AS t(parent_code, code, name, severity)
        LOOP
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            SELECT
                nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name,
                CURRENT_DATE, NULL, ep.classifier_value_key, v_rec.severity, v_created_by
            FROM tmp_eligible_parents ep
            WHERE ep.code = v_rec.parent_code
              -- kaitse topeltkäivituse vastu: ära lisa, kui see täpne kood juba olemas
              AND NOT EXISTS (
                  SELECT 1 FROM classifier.classifier_value cv2
                  WHERE cv2.classifier_key = v_clf_key
                    AND cv2.parent_key = ep.classifier_value_key
                    AND cv2.code = v_rec.code
              );
        END LOOP;
    END $$;
