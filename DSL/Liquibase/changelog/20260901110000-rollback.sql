-- liquibase formatted sql
-- changeset ljvis:20260901110000-rollback ignore:true splitStatements:false
--
-- Rollback 20260901110000: taastab EU_INFRINGEMENT raskusastmed 20260828275000
-- seemne väärtustele (iga rea vana raskusaste = koodi prefiks).

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_rec     RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'EU_INFRINGEMENT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('VSI817', 'VSI'), ('VSI818', 'VSI'), ('VSI819', 'VSI'), ('VSI820', 'VSI'),
                ('VSI821', 'VSI'), ('VSI822', 'VSI'), ('VSI823', 'VSI'), ('VSI824', 'VSI'),
                ('VSI825', 'VSI'), ('VSI826', 'VSI'), ('VSI827', 'VSI'), ('VSI828', 'VSI'),
                ('SI916',  'SI'),  ('VSI829', 'VSI'), ('VSI832', 'VSI'), ('VSI834', 'VSI'),
                ('VSI833', 'VSI'), ('VSI835', 'VSI'), ('VSI868', 'VSI'),
                ('VSI865', 'VSI'), ('VSI866', 'VSI'), ('SI947',  'SI'),  ('VSI867', 'VSI'),
                ('VSI815', 'VSI'), ('VSI816', 'VSI'),
                ('SI918',  'SI'),  ('VSI837', 'VSI'), ('VSI841', 'VSI'), ('VSI842', 'VSI'),
                ('VSI847', 'VSI'), ('SI926',  'SI'),
                ('VSI848', 'VSI'), ('SI927',  'SI'),
                ('VSI852', 'VSI'), ('VSI853', 'VSI'), ('VSI854', 'VSI'), ('VSI855', 'VSI'),
                ('VSI856', 'VSI'), ('VSI859', 'VSI'),
                ('VSI861', 'VSI'), ('SI939',  'SI'),
                ('VSI863', 'VSI'), ('SI940',  'SI'),  ('SI941',  'SI'),  ('SI942',  'SI'),
                ('VSI864', 'VSI'),
                ('VSI874', 'VSI'),
                ('VSI875', 'VSI'), ('VSI876', 'VSI'), ('VSI877', 'VSI'), ('VSI878', 'VSI'),
                ('VSI879', 'VSI')
            ) AS t(code, old_severity)
        LOOP
            UPDATE classifier.classifier_value
            SET description = v_rec.old_severity
            WHERE classifier_key = v_clf_key
              AND code = v_rec.code
              AND description <> v_rec.old_severity;
        END LOOP;
    END $$;
