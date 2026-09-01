-- liquibase formatted sql
-- changeset ljvis:20260901130000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: teeb korduvad tase-3 (raskusastme) koodid unikaalseks.
--
-- Probleem: 20260828277000 / 20261016100000 seemnes on 25 tase-3 real
-- code = 'MI'. Frontendi ClassifierProvider.getByCode() deduplib
-- klassifikaatori väärtused `code` järgi (seen.has(v.code) -> vahele), mistõttu
-- ainult ESIMENE 'MI' rida (SOIDUAJAD_01 all) jääb alles ja ülejäänud 24 kaovad.
-- Tagajärg: rikkumisliigid, mille AINUS raskusaste on 'MI' — Rooma I
-- (ROOMA_I_01), autojuhi lähetamine (LAHETAMINE_01..07), konduktori vanus
-- (MEESKOND_01), piiriületusriikide tähised (ANDMETE_ESITAMINE_03/04) — jäävad
-- sõidu- ja puhkeaja rikkumiste modaalis ilma valitava raskusastmeta ega ole
-- salvestatavad.
--
-- Lahendus: nimeta iga korduva 'MI'-koodiga tase-3 rida ümber kujule
-- <parent_code>_MI. SOIDUAJAD_01 all olev 'MI' JÄETAKSE muutmata — see on ainus,
-- mida frontend seni kuvas, seega ainus, mille kohta saab olla varasemaid
-- salvestatud `violation_code = 'MI'` kirjeid.
--
-- Frontendi muudatust ei vaja: ModalResultSection / DrivingViolationModal
-- kasutavad tase-3 `code`-i üldiselt, õige vormivälja valik käib tase-1
-- õigusakti nime järgi (directiveToFieldMap), mitte tase-3 koodi järgi.
--
-- Idempotentne: rida nimetatakse ümber ainult siis, kui tema kood on veel 'MI'.

DO $$
    DECLARE
        v_clf_key    BIGINT;
        v_parent_key BIGINT;
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

        FOR v_rec IN
            SELECT unnest(ARRAY[
                'SOIDUAJAD_03', 'SOIDUAJAD_05', 'SOIDUAJAD_07',
                'VAHEAJAD_561_01',
                'PUHKEPERIOODID_01', 'PUHKEPERIOODID_02', 'PUHKEPERIOODID_03',
                'PUHKEPERIOODID_04', 'PUHKEPERIOODID_05', 'PUHKEPERIOODID_06',
                'PUHKEPERIOODID_07',
                'PAEVA_12_ERAND_01', 'PAEVA_12_ERAND_02',
                'MEESKOND_01',
                'ANDMETE_ESITAMINE_03', 'ANDMETE_ESITAMINE_04',
                'ROOMA_I_01',
                'LAHETAMINE_01', 'LAHETAMINE_02', 'LAHETAMINE_03', 'LAHETAMINE_04',
                'LAHETAMINE_05', 'LAHETAMINE_06', 'LAHETAMINE_07'
            ]) AS parent_code
        LOOP
            SELECT classifier_value_key INTO v_parent_key
            FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_parent_key IS NULL THEN
                RAISE NOTICE 'DRIVING_VIOLATION parent % not found, skipping', v_rec.parent_code;
                CONTINUE;
            END IF;

            UPDATE classifier.classifier_value
            SET code = v_rec.parent_code || '_MI'
            WHERE classifier_key = v_clf_key
              AND parent_key = v_parent_key
              AND code = 'MI';
        END LOOP;
    END $$;
