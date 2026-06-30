-- liquibase formatted sql
-- changeset ljvis:20260630100002 ignore:true
-- Seed data

INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.write', 'Välisriigi rikkumise andmevormi vormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.read', 'Välisriigi rikkumise andmevormi vormi andmete lugemine ja failide allalaadimine', 'ljvis2');

ALTER TABLE classifier.classifier_value ADD COLUMN IF NOT EXISTS description VARCHAR(250);
ALTER TABLE classifier.classifier_value ADD COLUMN IF NOT EXISTS parent_key BIGINT;

COMMENT ON COLUMN classifier.classifier_value.description IS 'Classifier value description';
COMMENT ON COLUMN classifier.classifier_value.parent_key IS 'Parent key for classifier value';

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'FORM_TYPE',
                   'Kontrollvormi tüüp',
                   'Kontrollvormide tüüpide klassifikaator',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('TI_KONTROLLKAART',          'Tööinspektsiooni kontrollkaart',                                       'DASHBOARD_MANUAL_ADD'),
                               ('FOREIGN_AUDIT',             'Välisriigis teostatud autoveoalase kontrolli kontrollkaart',             'DASHBOARD_MANUAL_ADD'),
                               ('REPUTATION_NONCOMPLIANCE',  'Hea maine nõudele mittevastavaks tunnistatud veokorraldusjuht',         'DASHBOARD_MANUAL_ADD'),
                               ('SP_COMPOUND',               'Veondusjärelevalve ja sõiduki tehnoseisundi kontrollkaart',             'DASHBOARD_MANUAL_ADD'),
                               ('ADMIN_PROCEDURE',           'Haldusmenetlus seoses raskete autoveoalaste rikkumistega',              'DASHBOARD_EXCLUDED')
                          ) AS t(code, name, description)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('SP_DRIVER_FORM',          'Autojuhi sõidu- ja puhkeaja kontrollvorm',              'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND'),
                               ('SP_TEAMMATE_FORM',        'Meeskonna liikme sõidu- ja puhkeaja kontrollvorm',      'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND'),
                               ('SP_VEHICLE_TECH',         'Mootorsõiduki tehnonõuetele vastavuse kontrollvorm',     'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND'),
                               ('SP_TRAILER_TECH',         'Haagise tehnonõuetele vastavuse kontrollvorm',           'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND'),
                               ('SP_DANGEROUS_GOODS',      'Ohtliku veose veo kontrollvorm',                        'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND'),
                               ('SP_TRANSPORT_SUSPENDED',  'Autovedu on katkestatud kontrollvorm',                   'DASHBOARD_MANUAL_ADD', 'SP_COMPOUND')
                          ) AS t(code, name, description, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                           v_rec.description,
                           v_created_by
                       );
            END LOOP;

    END $$;