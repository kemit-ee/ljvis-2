-- liquibase formatted sql
-- changeset ljvis:20261122110000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: 20261016100000 lisas 16 puuduvale rikkumisliigile
-- level-3 read, aga kolmel neist on level-3 `code` bare 'MI' — täpselt sama
-- viga, mis 20260901130000-ga (PR #210) juba parandati ('MI' korduv 25
-- kirjel, ClassifierProvider.getByCode() dedup kustutab kõik peale esimese).
-- Kuna values-loend ei tule serverist garanteeritud järjekorras, "võitis"
-- dedup-lahingu erinevates keskkondades erinev kirje — kohapeal (kus
-- migratsioonid jooksid ühes järjekorras) võis üks konkreetne 'MI' kirje
-- ellu jääda, testkeskkonnas hoopis teine, mistap rikkumiste valimine
-- näis kohati "juhuslikult" katki.
--
-- Kolm mõjutatud level-2 rida (Sõidu- ja puhkeaja nõuete täitmine modaal):
--   MEESKOND_01              — konduktori vanuse alampiir
--   ANDMETE_ESITAMINE_03     — piiriületusriikide tähised
--   ANDMETE_ESITAMINE_04     — tööpäeva alguse/lõpu riigi tähised
--
-- Nimetab need ümber mustri <parent_code>_MI järgi (sama muster mis
-- ROOMA_I_01_MI, LAHETAMINE_0X_MI, TI_B1_MI jne). Idempotentne.

DO $$
    DECLARE
        v_classifier_key BIGINT;
        v_parent_key     BIGINT;
        v_row            RECORD;
    BEGIN
        SELECT classifier_key INTO v_classifier_key
          FROM classifier.classifier
         WHERE code = 'DRIVING_VIOLATION'
         ORDER BY created_at DESC LIMIT 1;

        IF v_classifier_key IS NULL THEN
            RAISE NOTICE 'DRIVING_VIOLATION classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_row IN SELECT * FROM (VALUES
            ('MEESKOND_01'),
            ('ANDMETE_ESITAMINE_03'),
            ('ANDMETE_ESITAMINE_04')
        ) AS t(parent_code)
        LOOP
            SELECT classifier_value_key INTO v_parent_key
              FROM classifier.classifier_value
             WHERE classifier_key = v_classifier_key AND code = v_row.parent_code
             ORDER BY created_at DESC LIMIT 1;

            IF v_parent_key IS NULL THEN
                RAISE NOTICE 'DRIVING_VIOLATION parent % not found, skipping', v_row.parent_code;
                CONTINUE;
            END IF;

            UPDATE classifier.classifier_value
               SET code = v_row.parent_code || '_MI'
             WHERE classifier_key = v_classifier_key
               AND parent_key = v_parent_key
               AND code = 'MI';
        END LOOP;
    END $$;
