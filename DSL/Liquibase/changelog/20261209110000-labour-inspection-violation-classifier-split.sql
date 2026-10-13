-- liquibase formatted sql
-- changeset ljvis:20261209110000 splitStatements:false
--
-- LABOUR_INSPECTION_VIOLATION struktuuriparandus: iga raskusaste saab oma TI_ koodi.
--
-- Probleem: mitmed level2 kirjed (loodud 20261121130000, PR #382) koondasid mitu raskusastet
-- (MI pseudokood + SI + VSI, või SI + VSI) ühise level2 koodi alla lastena (nt TI_E4 alla olid
-- peidetud kolm last: MI pseudokood, SI914, VSI813). Tööinspektsiooni/X-tee saadab aga IGA
-- raskusastme kohta oma eraldi täht+number koodi (nt "E4", "E5", "E6" on kolm erinevat koodi,
-- mitte ühe rikkumise kolm raskusastet) — kinnitatud vana .NET rakenduse
-- (Ljvis.Domain/Generators/JobInspectionV2ViolationClassifierGenerator.cs) numeratsiooni ja
-- kasutaja kinnituse põhjal. Praegu eksisteerivad SI/VSI tasandid ainult ERRU-koodiga
-- classifier_value kirjena ilma oma TI_ identiteedita, mistõttu X-tee koodile (nt "E5") ei leia
-- süsteem vastet.
--
-- Lahendus: grupi "lisaraskusastmetele" (teine/kolmas laps) luuakse uus level2 kirje oma TI_
-- koodiga, ja lapse olemasolev classifier_value_key saab uue snapshot-rea uue parent_key'ga
-- (vana rida jääb ajaloolisse snapshot'i — classifier_value on INSERT-only). Grupi esimene
-- (madalaim — MI-pseudokood kui olemas, muidu esimene real kood) jääb muutumatuks oma
-- olemasoleva level2 koodi all.
--
-- 20 gruppi, 34 uut level2 kirjet, 34 relokeeritud rida. Kõik mõjutatud grupid on TI_SP (Sõidu-
-- ja puhkeaja rikkumised) haru all — TI_LIC (K-grupp, tegevusluba/juhitunnistus) ei muutu.
--
-- Idempotentne: kui TI_B2 juba eksisteerib, jäetakse vahele.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system:lif-violation-split-20261209110000';
        v_clf_key    BIGINT;
        v_sp_key     BIGINT;
        v_rec        RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'LABOUR_INSPECTION_VIOLATION';

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'LABOUR_INSPECTION_VIOLATION classifier missing, skipping';
            RETURN;
        END IF;

        IF EXISTS (
            SELECT 1 FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = 'TI_B2'
        ) THEN
            RAISE NOTICE 'TI_B2 already exists, split already applied, skipping';
            RETURN;
        END IF;

        SELECT classifier_value_key INTO v_sp_key
        FROM classifier.classifier_value
        WHERE classifier_key = v_clf_key AND code = 'TI_SP'
        ORDER BY created_at DESC
        LIMIT 1;

        -- Samm 1: uued level2 kirjed grupi teise/kolmanda raskusastme jaoks.
        -- name/description on koopia vana (lõhutava) level2 parendi tekstist.
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('TI_B2',  'Ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini', 'Artikli 6 lõige 1'),
                ('TI_B3',  'Ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini', 'Artikli 6 lõige 1'),
                ('TI_B6',  'Ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada', 'Artikli 6 lõige 1'),
                ('TI_B7',  'Ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada', 'Artikli 6 lõige 1'),
                ('TI_B10', 'Ületatakse iganädalast sõiduaega', 'Artikli 6 lõige 2'),
                ('TI_B11', 'Ületatakse iganädalast sõiduaega', 'Artikli 6 lõige 2'),
                ('TI_B14', 'Ületatakse 2 järjestikuse nädala maksimaalset sõiduaega', 'Artikli 6 lõige 3'),
                ('TI_B15', 'Ületatakse 2 järjestikuse nädala maksimaalset sõiduaega', 'Artikli 6 lõige 3'),
                ('TI_C2',  'Ületatakse katkematut 4,5-tunni pikkust sõiduaega enne vaheaja tegemist', 'Artikkel 7'),
                ('TI_C3',  'Ületatakse katkematut 4,5-tunni pikkust sõiduaega enne vaheaja tegemist', 'Artikkel 7'),
                ('TI_D2',  'Ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 2'),
                ('TI_D3',  'Ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 2'),
                ('TI_D5',  'Ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud', 'Artikli 8 lõige 2'),
                ('TI_D6',  'Ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud', 'Artikli 8 lõige 2'),
                ('TI_D8',  'Ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni', 'Artikli 8 lõige 2'),
                ('TI_D9',  'Ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni', 'Artikli 8 lõige 2'),
                ('TI_D11', 'Ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul', 'Artikli 8 lõige 5'),
                ('TI_D12', 'Ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul', 'Artikli 8 lõige 5'),
                ('TI_D14', 'Ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni', 'Artikli 8 lõige 6'),
                ('TI_D15', 'Ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni', 'Artikli 8 lõige 6'),
                ('TI_D17', 'Ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 6'),
                ('TI_D18', 'Ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 6'),
                ('TI_D20', 'Ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeperioodi', 'Artikli 8 lõige 6'),
                ('TI_D21', 'Ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeperioodi', 'Artikli 8 lõige 6'),
                ('TI_E2',  'Ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi', 'Artikli 8 lõike 6a'),
                ('TI_E3',  'Ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi', 'Artikli 8 lõike 6a'),
                ('TI_E5',  'Iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi', 'Artikli 8 lõike 6a punkt b alapunkt ii'),
                ('TI_E6',  'Iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi', 'Artikli 8 lõike 6a punkt b alapunkt ii'),
                ('TI_E8',  'Sõiduperiood 22.00–6.00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhti', 'Artikli 8 lõike 6a punkt d'),
                ('TI_T2',  'Ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini', 'Artikkel 4 (Direktiiv 2002/15/EÜ)'),
                ('TI_T4',  'Ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel', 'Artikkel 4 (Direktiiv 2002/15/EÜ)'),
                ('TI_T6',  'Mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele', 'Artikli 5 lõige 1 (Direktiiv 2002/15/EÜ)'),
                ('TI_T8',  'Mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi', 'Artikli 5 lõige 1 (Direktiiv 2002/15/EÜ)'),
                ('TI_T10', 'Päevane tööaeg 24 h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8', 'Artikli 7 lõige 1 (Direktiiv 2002/15/EÜ)')
            ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (
                nextval('classifier.seq_classifier_value_key'),
                v_clf_key,
                v_rec.code,
                v_rec.name,
                CURRENT_DATE,
                NULL,
                v_sp_key,
                v_rec.description,
                v_created_by
            );
        END LOOP;

        -- Samm 2: relokeeri olemasolevad SI/VSI lapsed uutele level2-dele. Sama classifier_value_key
        -- (viited säilivad), uus snapshot-rida uue parent_key'ga — vana rida (vana parent_key'ga)
        -- jääb ajaloolisse snapshot'i muutumatuna.
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('SI901', 'TI_B2'),  ('VSI800', 'TI_B3'),
                ('SI902', 'TI_B6'),  ('VSI801', 'TI_B7'),
                ('SI903', 'TI_B10'), ('VSI802', 'TI_B11'),
                ('SI904', 'TI_B14'), ('VSI803', 'TI_B15'),
                ('SI905', 'TI_C2'),  ('VSI804', 'TI_C3'),
                ('SI906', 'TI_D2'),  ('VSI805', 'TI_D3'),
                ('SI907', 'TI_D5'),  ('VSI806', 'TI_D6'),
                ('SI908', 'TI_D8'),  ('VSI807', 'TI_D9'),
                ('SI909', 'TI_D11'), ('VSI808', 'TI_D12'),
                ('SI910', 'TI_D14'), ('VSI809', 'TI_D15'),
                ('SI911', 'TI_D17'), ('VSI810', 'TI_D18'),
                ('SI912', 'TI_D20'), ('VSI811', 'TI_D21'),
                ('SI913', 'TI_E2'),  ('VSI812', 'TI_E3'),
                ('SI914', 'TI_E5'),  ('VSI813', 'TI_E6'),
                ('VSI814', 'TI_E8'),
                ('VSI836', 'TI_T2'),
                ('VSI837', 'TI_T4'),
                ('VSI838', 'TI_T6'),
                ('VSI839', 'TI_T8'),
                ('VSI840', 'TI_T10')
            ) AS t(old_code, new_parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            SELECT
                cv.classifier_value_key,
                v_clf_key,
                cv.code,
                cv.name,
                cv.valid_from,
                cv.valid_until,
                (SELECT classifier_value_key FROM classifier.classifier_value
                 WHERE classifier_key = v_clf_key AND code = v_rec.new_parent_code
                 ORDER BY created_at DESC LIMIT 1),
                cv.description,
                v_created_by
            FROM (
                SELECT DISTINCT ON (classifier_value_key) *
                FROM classifier.classifier_value
                WHERE classifier_key = v_clf_key AND code = v_rec.old_code
                ORDER BY classifier_value_key, created_at DESC
            ) cv;
        END LOOP;

    END $$;
