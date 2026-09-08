-- liquibase formatted sql
-- changeset ljvis:20261110100000 ignore:true splitStatements:false
--
-- Lisab OTHER_DOCUMENTS klassifikaatorisse sõitjateveo-spetsiifilised kirjed,
-- mis esinesid PPA pabervormil ridadena 17-23 aga puudusid digisüsteemist.
--
-- Kirjed on veoliigi järgi nähtavad ainult sõitjateveo korral; klientkood
-- seadistatakse DocRightOtherSection.tsx CODE_TO_VISIBILITY kaardis.
--
-- Read:
--   SOIDUKI_VEDAJA_NIMI   — vedaja nimi / kaubamärk sõiduki välisküljel (PASSENGER)
--   LIINI_NUMBER          — liini number ühissõidukil                    (PASSENGER)
--   LIINI_NIMETUS         — liini nimetus ühissõidukil                   (PASSENGER)
--   ATL_SOIDUPLAAN_ENNETAB — vedaja ennetab kinnitatud sõiduplaani       (PASSENGER)
--   ATL_PEATUS_PUUDUMINE  — vedaja ei peatu märgitud peatuses             (PASSENGER)
--   ATL_VALE_PEATUS       — vedaja teenindab märkimata peatust            (PASSENGER)
--   ATL_VALE_SOIDUK       — vedaja kasutab mittevastavat sõidukit         (PASSENGER)
--

DO $$
DECLARE
    v_clf_key   BIGINT;
    v_created   VARCHAR(255) := 'system';
    v_rec       RECORD;
BEGIN
    SELECT classifier_key INTO v_clf_key
    FROM classifier.classifier
    WHERE code = 'OTHER_DOCUMENTS';

    IF v_clf_key IS NULL THEN
        RAISE EXCEPTION 'Klassifikaator OTHER_DOCUMENTS puudub — kontrolli migratsiooni järjekorda';
    END IF;

    FOR v_rec IN
        SELECT *
        FROM (VALUES
            ('SOIDUKI_VEDAJA_NIMI',
             'Sõiduki parempoolsel välisküljel peab olema nähtav vedaja nimi või kaubamärgiseaduse § 5 tähenduses õiguskaitset omav vedajale kuuluv või talle lepingu alusel kasutada antud kaubamärk'),
            ('LIINI_NUMBER',
             'Liiniveo kasutataval ühissõidukil peab nähtaval kohal olema ka liini number'),
            ('LIINI_NIMETUS',
             'Liiniveo kasutataval ühissõidukil peab nähtaval kohal olema liini nimetus'),
            ('ATL_SOIDUPLAAN_ENNETAB',
             'Vedaja ennetab liiniloa (ATL) andja kinnitatud sõiduplaani'),
            ('ATL_PEATUS_PUUDUMINE',
             'Vedaja ei peatu liiniloa (ATL) andja kinnitatud sõiduplaanis märgitud peatuses'),
            ('ATL_VALE_PEATUS',
             'Vedaja teenindab peatust, mis ei ole märgitud liiniloa (ATL) andja kinnitatud sõiduplaanis'),
            ('ATL_VALE_SOIDUK',
             'Vedaja ei kasuta veotingimustes ettenähtud omadustele vastavat sõidukit')
        ) AS t(code, name)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.code
        ) THEN
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (
                nextval('classifier.seq_classifier_value_key'),
                v_clf_key,
                v_rec.code,
                v_rec.name,
                CURRENT_DATE,
                NULL,
                v_created
            );
        END IF;
    END LOOP;
END $$;
