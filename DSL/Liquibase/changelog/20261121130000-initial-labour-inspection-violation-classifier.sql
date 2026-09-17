-- liquibase formatted sql
-- changeset ljvis:20261121130000 splitStatements:false
--
-- LABOUR_INSPECTION_VIOLATION: Tööinspektsiooni kontrollvormi rikkumiste klassifikaator.
--
-- Eraldiseisev klassifikaator (mitte DRIVING_VIOLATION taaskasutus), kuna Tööinspektsiooni
-- rikkumiste kirjeldused erinevad PPA autojuhi sõidu- ja puhkeaja kontrollvormi omadest
-- (tööandja-põhine kontroll ettevõtte territooriumil, mitte teel toimuv sõidukikontroll).
-- Struktuur (3-tasemeline hierarhia, level3 = raskusaste + ERRU kood) on siiski identne
-- DRIVING_VIOLATION klassifikaatoriga, et ViolationPickerModal jm üldine UI kood sobiks
-- muutmata kujul.
--
-- Level 1: kaks pealkirja (Sõidu- ja puhkeaja rikkumised / Ühenduse tegevusloa ja
--          juhitunnistuse rikkumised).
-- Level 2: konkreetne rikkumise liik + õiguslik alus.
-- Level 3: tunnivahemik (või raskusaste, kui vahemikku pole) + ERRU kood. Kui rühma
--          esimesel (madalaimal) tunnivahemikul ametlikku ERRU koodi ei ole, kasutatakse
--          koodi '<level2_kood>_MI' (raskusaste MI) — sama muster mis DRIVING_VIOLATION
--          klassifikaatoril (vt 20260901130000-sp-driving-violation-unique-l3-codes.sql).
--          Iga level3 `code` on klassifikaatori piires unikaalne, et vältida
--          ClassifierProvider.getByCode() dedup-viga.
--
-- Idempotentne: kui LABOUR_INSPECTION_VIOLATION juba olemas, jäetakse vahele.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'LABOUR_INSPECTION_VIOLATION') THEN
            RAISE NOTICE 'LABOUR_INSPECTION_VIOLATION already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'LABOUR_INSPECTION_VIOLATION',
                   'Tööinspektsiooni kontrolli rikkumised',
                   'Tööinspektsiooni kontrollvormi rikkumiste klassifikaator (EL 2016/403, Määrus 1072/2009, Määrus 1073/2009)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        -- Level 1: kaks pealkirja
        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('TI_SP',  'Sõidu- ja puhkeaja rikkumised'),
                               ('TI_LIC', 'Ühenduse tegevusloa ja juhitunnistuse rikkumised')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_created_by);
            END LOOP;

        -- Level 2: rikkumise liik (name) + õiguslik alus (description), parent = level 1
        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Määrus (EÜ) 561/2006 — sõiduajad
                               ('TI_B1',  'Ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini', 'Artikli 6 lõige 1', 'TI_SP'),
                               ('TI_B4',  'Ületatakse ööpäevast 9 tunni pikkust sõiduaega 50% või rohkem', 'Artikli 6 lõige 1', 'TI_SP'),
                               ('TI_B5',  'Ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada', 'Artikli 6 lõige 1', 'TI_SP'),
                               ('TI_B8',  'Ületatakse ööpäevast 10 tunni pikkust sõiduaega 50% või rohkem', 'Artikli 6 lõige 1', 'TI_SP'),
                               ('TI_B9',  'Ületatakse iganädalast sõiduaega', 'Artikli 6 lõige 2', 'TI_SP'),
                               ('TI_B12', 'Ületatakse iganädalast sõiduaega 25% või rohkem', 'Artikli 6 lõige 2', 'TI_SP'),
                               ('TI_B13', 'Ületatakse 2 järjestikuse nädala maksimaalset sõiduaega', 'Artikli 6 lõige 3', 'TI_SP'),
                               ('TI_B16', 'Ületatakse 2 järjestikuse nädala maksimaalset sõiduaega 25% või rohkem', 'Artikli 6 lõige 3', 'TI_SP'),
                               -- vaheajad
                               ('TI_C1',  'Ületatakse katkematut 4,5-tunni pikkust sõiduaega enne vaheaja tegemist', 'Artikkel 7', 'TI_SP'),
                               -- puhkeperioodid
                               ('TI_D1',  'Ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 2', 'TI_SP'),
                               ('TI_D4',  'Ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud', 'Artikli 8 lõige 2', 'TI_SP'),
                               ('TI_D7',  'Ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni', 'Artikli 8 lõige 2', 'TI_SP'),
                               ('TI_D10', 'Ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul', 'Artikli 8 lõige 5', 'TI_SP'),
                               ('TI_D13', 'Ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni', 'Artikli 8 lõige 6', 'TI_SP'),
                               ('TI_D16', 'Ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud', 'Artikli 8 lõige 6', 'TI_SP'),
                               ('TI_D19', 'Ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeperioodi', 'Artikli 8 lõige 6', 'TI_SP'),
                               ('TI_D22', 'Kahele järjestikusele vähendatud iganädalasele puhkeperioodile ei järgne kompenseerimiseks võetavat puhkeperioodi', 'Artikli 8 lõige 6b', 'TI_SP'),
                               ('TI_D23', 'Regulaarsed iganädalased puhkeperioodid või üle 45-tunnised iganädalased puhkeperioodid veedetakse sõidukis', 'Artikli 8 lõige 8', 'TI_SP'),
                               ('TI_D24', 'Tööandja ei kata majutuskulusid väljaspool sõidukit', 'Artikli 8 lõige 8', 'TI_SP'),
                               -- 12 päeva erand
                               ('TI_E1',  'Ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi', 'Artikli 8 lõike 6a', 'TI_SP'),
                               ('TI_E4',  'Iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi', 'Artikli 8 lõike 6a punkt b alapunkt ii', 'TI_SP'),
                               ('TI_E7',  'Sõiduperiood 22.00–6.00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhti', 'Artikli 8 lõike 6a punkt d', 'TI_SP'),
                               -- töökorraldus
                               ('TI_F1',  'Autoveo-ettevõtja ei korralda juhtide tööd selliselt, et juht saab naasta tööandja tegevuskeskusesse või juhi elukohta', 'Artikli 8 lõige 8a', 'TI_SP'),
                               ('TI_F2',  'Palga/tasu sidumine läbisõidetud vahemaaga, kohaletoimetamise kiirusega või edasitoimetatud kauba kogusega', 'Artikli 10 lõige 1', 'TI_SP'),
                               ('TI_F3',  'Juhi töö puuduv või ebarahuldav korraldus, juhile antud ebapiisavad või puuduvad juhised, mis võimaldaksid tal seadust järgida', 'Artikli 10 lõige 2', 'TI_SP'),
                               -- Määrus (EL) 165/2014 — sõidumeerik
                               ('TI_G1',  'Ei ole paigaldatud ega kasutata tüübikinnituse saanud sõidumeerikut', 'Artikli 3 lõiked 1, 4, 4a ja artikkel 22 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H2',  'Juhil on ja/või juht kasutab rohkem kui üht tema enda juhikaarti', 'Artikkel 27 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H3',  'Juht kasutab sõitmisel võltsitud juhikaarti (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'Artikkel 27 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H4',  'Juht kasutab sõitmisel juhikaarti, mis ei ole tema oma (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'Artikkel 27 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H5',  'Juht kasutab sõitmisel juhikaarti, mis on saadud valeandmete ja/või võltsitud dokumentide alusel (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'Artikkel 27 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H6',  'Sõidumeerik ei toimi korrektselt (nt sõidumeerikut ei ole nõuetekohaselt kontrollitud, kalibreeritud ega plommitud)', 'Artikli 32 lõige 1 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H7',  'Sõidumeerikut ei ole nõuetekohaselt kasutatud (nt tahtlik, sundimata või sunnitud kuritarvitamine, õige kasutamise juhiste puudumine jne)', 'Artikli 32 lõige 1 ja artikli 33 lõige 1 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H9',  'Salvestuslehtedele kantud andmete või sõidumeerikule ja/või juhikaardile salvestatud ja sealt alla laaditud andmete võltsimine, varjamine, esitamise takistamine või hävitamine', 'Artikli 32 lõige 3 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H10', 'Ettevõtja ei säilita salvestuslehti, väljatrükke ega allalaaditud andmeid', 'Artikli 33 lõige 2 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H11', 'Salvestatud ja talletatud andmed ei ole kättesaadavad vähemalt üks aasta', 'Artikli 33 lõige 2 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H12', 'Salvestuslehtede/juhikaardi mittenõuetekohane kasutamine', 'Artikli 34 lõige 1 ja 1a (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H13', 'Ilma loata eemaldatakse salvestuslehed või juhikaart nii, et see mõjutab asjaomaste andmete salvestamist', 'Artikli 34 lõige 1 ja 1a (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H14', 'Salvestuslehte või juhikaarti kasutatakse ettenähtud perioodist kauem ning andmed lähevad kaotsi', 'Artikli 34 lõige 1 ja 1a (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H15', 'Kasutatakse määrdunud või kahjustatud salvestuslehti või juhikaarti ning andmed ei ole loetavad', 'Artikli 34 lõige 2 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H16', 'Andmeid ei sisestata käsitsi, kui see on nõutav', 'Artikli 34 lõige 3 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H17', 'Ei kasutata õiget salvestuslehte või juhikaarti õiges avas (mitme juhiga veo puhul)', 'Artikli 34 lõige 4 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_H18', 'Lülitite mittenõuetekohane kasutamine', 'Artikli 34 lõige 5 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_I1',  'Märgi „parvlaev/rong" ebaõige kasutamine või kasutamata jätmine', 'Artikli 34 lõike 5 punkti b alapunkt v (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_I2',  'Nõutavaid andmeid ei ole salvestuslehele kantud', 'Artikli 34 lõige 6 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_I3',  'Puuduvad nende riikide tähised, mille piirid juht igapäevasel tööajal ületas', 'Artikli 34 lõige 7 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_I4',  'Puuduvad nende riikide tähised, kus juht igapäevast tööaega alustas ja kus ta selle lõpetas', 'Artikli 34 lõige 7 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_J1',  'Sõidumeerikut ei ole parandanud tunnustatud paigaldaja või töökoda', 'Artikli 37 lõige 1 ja artikli 22 lõige 1 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               ('TI_J2',  'Juht ei märgi kogu nõutavat teavet nende perioodide kohta, mida enam ei registreerita, sest sõidumeerik ei ole töökorras või ei tööta korralikult', 'Artikli 37 lõige 2 (Määrus (EL) nr 165/2014)', 'TI_SP'),
                               -- Direktiiv 2002/15/EÜ — tööaeg
                               ('TI_T1',  'Ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini', 'Artikkel 4 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T3',  'Ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel', 'Artikkel 4 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T5',  'Mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele', 'Artikli 5 lõige 1 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T7',  'Mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi', 'Artikli 5 lõige 1 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T9',  'Päevane tööaeg 24 h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8', 'Artikli 7 lõige 1 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T11', 'Tööandjad võltsivad andmeid tööaja kohta või keelduvad kontrolliametnikule andmeid esitamast', 'Artikkel 9 (Direktiiv 2002/15/EÜ)', 'TI_SP'),
                               ('TI_T12', 'Juhid kui töötajad/füüsilisest isikust ettevõtjad võltsivad andmeid või keelduvad kontrolliametnikule andmeid esitamast', 'Artikkel 9 (Direktiiv 2002/15/EÜ)', 'TI_SP'),

                               -- Ühenduse tegevusluba ja juhitunnistus
                               ('TI_K1', 'Kaupade vedu ilma kehtiva ühenduse tegevusloata (st tegevusluba puudub, on võltsitud, kehtetuks tunnistatud, aegunud jne)', 'Määruse 1072/2009 artikkel 3 ja artikli 8 lõige 1', 'TI_LIC'),
                               ('TI_K2', 'Vedaja või juht ei esita kehtivat ühenduse tegevusluba või kehtiva ühenduse tegevusloa kehtivat kinnitatud ärakirja kontrollivale ametnikule (st ühenduse tegevusluba või selle kinnitatud ärakiri on kadunud, maha unustatud, kahjustatud jne)', 'Määruse 1072/2009 artikkel 4', 'TI_LIC'),
                               ('TI_K3', 'Kaupade vedu ilma kehtiva juhitunnistuseta (st juhitunnistus puudub, on võltsitud, kehtetuks tunnistatud, aegunud jne)', 'Määruse 1072/2009 artikkel 3 ja artikli 8 lg 1', 'TI_LIC'),
                               ('TI_K4', 'Juht või vedaja ei esita kehtivat juhitunnistust või kehtiva juhitunnistuse kehtivat kinnitatud ärakirja kontrollivale ametnikule (st juhitunnistus või selle kinnitatud ärakiri on kadunud, maha unustatud, kahjustatud jne)', 'Määruse 1072/2009 artikkel 5', 'TI_LIC'),
                               ('TI_K5', 'Sõitjate vedu ilma kehtiva ühenduse tegevusloata (st tegevusluba puudub, on võltsitud, kehtetuks tunnistatud, aegunud jne)', 'Määruse 1073/2009 artikkel 4', 'TI_LIC'),
                               ('TI_K6', 'Vedaja või juht ei esita kehtivat ühenduse tegevusluba või kehtiva ühenduse tegevusloa kehtivat tõestatud koopiat kontrollivale ametnikule (st tegevusluba või selle tõestatud koopia on kadunud, maha unustatud, kahjustatud jne.)', 'Määruse 1073/2009 artikli 4 lõige 3', 'TI_LIC')
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

        -- Level 3: tunnivahemik/raskusaste (name) + ERRU kood (code) + raskusaste (description), parent = level 2
        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('TI_B1_MI',  '9h < ... < 10h',       'MI',  'TI_B1'),
                               ('SI901',     '10h ≤ ... < 11h',      'SI',  'TI_B1'),
                               ('VSI800',    '11h ≤ ...',            'VSI', 'TI_B1'),
                               ('MSI102',    '13h30 ≤ ...',          'MSI', 'TI_B4'),
                               ('TI_B5_MI',  '10h < ... < 11h',      'MI',  'TI_B5'),
                               ('SI902',     '11h ≤ ... < 12h',      'SI',  'TI_B5'),
                               ('VSI801',    '12h ≤ ...',            'VSI', 'TI_B5'),
                               ('MSI103',    '15h ≤ ...',            'MSI', 'TI_B8'),
                               ('TI_B9_MI',  '56h < ... < 60h',      'MI',  'TI_B9'),
                               ('SI903',     '60h ≤ ... < 65h',      'SI',  'TI_B9'),
                               ('VSI802',    '65h ≤ ... < 70h',      'VSI', 'TI_B9'),
                               ('MSI104',    '70h ≤ ...',            'MSI', 'TI_B12'),
                               ('TI_B13_MI', '90h < ... < 100h',     'MI',  'TI_B13'),
                               ('SI904',     '100h ≤ ... < 105h',    'SI',  'TI_B13'),
                               ('VSI803',    '105h ≤ ... < 112h30',  'VSI', 'TI_B13'),
                               ('MSI101',    '112h30 ≤ ...',         'MSI', 'TI_B16'),

                               ('TI_C1_MI',  '4h30 < ... < 5h',      'MI',  'TI_C1'),
                               ('SI905',     '5h ≤ ... < 6h',        'SI',  'TI_C1'),
                               ('VSI804',    '6h ≤ ...',             'VSI', 'TI_C1'),

                               ('TI_D1_MI',  '10h ≤ ... < 11h',      'MI',  'TI_D1'),
                               ('SI906',     '8h30 ≤ ... < 10h',     'SI',  'TI_D1'),
                               ('VSI805',    '... < 8h30',           'VSI', 'TI_D1'),
                               ('TI_D4_MI',  '8h ≤ ... < 9h',        'MI',  'TI_D4'),
                               ('SI907',     '7h ≤ ... < 8h',        'SI',  'TI_D4'),
                               ('VSI806',    '... < 7h',             'VSI', 'TI_D4'),
                               ('TI_D7_MI',  '3h + [8h ≤ ... < 9h]', 'MI',  'TI_D7'),
                               ('SI908',     '3h + [7h ≤ ... < 8h]', 'SI',  'TI_D7'),
                               ('VSI807',    '3h + [... < 7h]',      'VSI', 'TI_D7'),
                               ('TI_D10_MI', '8h ≤ ... < 9h',        'MI',  'TI_D10'),
                               ('SI909',     '7h ≤ ... < 8h',        'SI',  'TI_D10'),
                               ('VSI808',    '... < 7h',             'VSI', 'TI_D10'),
                               ('TI_D13_MI', '22h ≤ ... < 24h',      'MI',  'TI_D13'),
                               ('SI910',     '20h ≤ ... < 22h',      'SI',  'TI_D13'),
                               ('VSI809',    '... < 20h',            'VSI', 'TI_D13'),
                               ('TI_D16_MI', '42h ≤ ... < 45h',      'MI',  'TI_D16'),
                               ('SI911',     '36h ≤ ... < 42h',      'SI',  'TI_D16'),
                               ('VSI810',    '... < 36h',            'VSI', 'TI_D16'),
                               ('TI_D19_MI', '... < 3h',             'MI',  'TI_D19'),
                               ('SI912',     '3h ≤ ... < 12h',       'SI',  'TI_D19'),
                               ('VSI811',    '12h ≤ ...',            'VSI', 'TI_D19'),
                               ('VSI865',    'VSI',                  'VSI', 'TI_D22'),
                               ('VSI866',    'VSI',                  'VSI', 'TI_D23'),
                               ('SI947',     'SI',                   'SI',  'TI_D24'),

                               ('TI_E1_MI',  '... < 3h',             'MI',  'TI_E1'),
                               ('SI913',     '3h ≤ ... < 12h',       'SI',  'TI_E1'),
                               ('VSI812',    '12h ≤ ...',            'VSI', 'TI_E1'),
                               ('TI_E4_MI',  '67h < ... ≤ 69h',      'MI',  'TI_E4'),
                               ('SI914',     '65h < ... ≤ 67h',      'SI',  'TI_E4'),
                               ('VSI813',    '... ≤ 65h',            'VSI', 'TI_E4'),
                               ('SI915',     '3h < ... < 4,5h',      'SI',  'TI_E7'),
                               ('VSI814',    '4,5h ≤ ...',           'VSI', 'TI_E7'),

                               ('VSI867',    'VSI',                  'VSI', 'TI_F1'),
                               ('VSI815',    'VSI',                  'VSI', 'TI_F2'),
                               ('VSI816',    'VSI',                  'VSI', 'TI_F3'),

                               ('MSI201',    'MSI',                  'MSI', 'TI_G1'),
                               ('VSI818',    'VSI',                  'VSI', 'TI_H2'),
                               ('MSI601',    'MSI',                  'MSI', 'TI_H3'),
                               ('MSI602',    'MSI',                  'MSI', 'TI_H4'),
                               ('MSI603',    'MSI',                  'MSI', 'TI_H5'),
                               ('VSI819',    'VSI',                  'VSI', 'TI_H6'),
                               ('VSI820',    'VSI',                  'VSI', 'TI_H7'),
                               ('MSI205',    'MSI',                  'MSI', 'TI_H9'),
                               ('VSI821',    'VSI',                  'VSI', 'TI_H10'),
                               ('VSI822',    'VSI',                  'VSI', 'TI_H11'),
                               ('VSI823',    'VSI',                  'VSI', 'TI_H12'),
                               ('VSI824',    'VSI',                  'VSI', 'TI_H13'),
                               ('VSI825',    'VSI',                  'VSI', 'TI_H14'),
                               ('VSI826',    'VSI',                  'VSI', 'TI_H15'),
                               ('VSI827',    'VSI',                  'VSI', 'TI_H16'),
                               ('SI916',     'SI',                   'SI',  'TI_H17'),
                               ('VSI828',    'VSI',                  'VSI', 'TI_H18'),
                               ('SI948',     'SI',                   'SI',  'TI_I1'),
                               ('VSI868',    'VSI',                  'VSI', 'TI_I2'),
                               ('SI949',     'SI',                   'SI',  'TI_I3'),
                               ('SI950',     'SI',                   'SI',  'TI_I4'),
                               ('VSI834',    'VSI',                  'VSI', 'TI_J1'),
                               ('VSI835',    'VSI',                  'VSI', 'TI_J2'),

                               ('SI917',     '56h ≤ ... < 60h',      'SI',  'TI_T1'),
                               ('VSI836',    '60h ≤ ...',            'VSI', 'TI_T1'),
                               ('SI918',     '65h ≤ ... < 70h',      'SI',  'TI_T3'),
                               ('VSI837',    '70h ≤ ...',            'VSI', 'TI_T3'),
                               ('SI919',     '10min < ... ≤ 20min',  'SI',  'TI_T5'),
                               ('VSI838',    '... ≤ 10min',          'VSI', 'TI_T5'),
                               ('SI920',     '20min < ... ≤ 30min',  'SI',  'TI_T7'),
                               ('VSI839',    '... ≤ 20min',          'VSI', 'TI_T7'),
                               ('SI921',     '11h ≤ ... < 13h',      'SI',  'TI_T9'),
                               ('VSI840',    '13h ≤ ...',            'VSI', 'TI_T9'),
                               ('VSI841',    'VSI',                  'VSI', 'TI_T11'),
                               ('VSI842',    'VSI',                  'VSI', 'TI_T12'),

                               ('MSI504',    'MSI',                  'MSI', 'TI_K1'),
                               ('VSI860',    'VSI',                  'VSI', 'TI_K2'),
                               ('VSI861',    'VSI',                  'VSI', 'TI_K3'),
                               ('SI939',     'SI',                   'SI',  'TI_K4'),
                               ('MSI503',    'MSI',                  'MSI', 'TI_K5'),
                               ('VSI862',    'VSI',                  'VSI', 'TI_K6')
                          ) AS t(code, name, severity, parent_code)
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
                           v_rec.severity,
                           v_created_by
                       );
            END LOOP;

    END $$;
