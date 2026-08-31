-- liquibase formatted sql
-- changeset ljvis:20260828277000 splitStatements:false
--
-- Sõidu- ja puhkeaeg: DRIVING_VIOLATION, TACHOGRAPH_TYPES, OTHER_DOCUMENTS.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for DRIVING_VIOLATION
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DRIVING_VIOLATION') THEN
            RAISE NOTICE 'DRIVING_VIOLATION already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'DRIVING_VIOLATION',
                   'Sõidu- ja puhkeaja rikkumised',
                   'Sõidu- ja puhkeaja rikkumiste klassifikaator (EL 2016/403)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('SOIDUAJAD',       'Sõiduajad',                                                       'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('VAHEAJAD_561',    'Vaheajad',                                                        'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('PUHKEPERIOODID',  'Puhkeperioodid',                                                  'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('PAEVA_12_ERAND',  '12 päeva reeglist lubatav erand',                                 'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('TOOKORRALDUS',    'Töökorraldus',                                                    'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('MEESKOND',        'Meeskond',                                                        'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
                               ('SOIDUMEERIKU_PAIGALDAMINE', 'Sõidumeeriku paigaldamine',                              'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
                               ('SOIDUMEERIKUD',   'Sõidumeerikute, juhikaartide või salvestuslehtede kasutamine',     'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
                               ('ANDMETE_ESITAMINE', 'Andmete esitamine',                                             'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
                               ('RIKKED',          'Rikked',                                                          'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
                               ('MAKS_TOOAEG',     'Maksimaalne iganädalane tööaeg',                                  'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
                               ('VAHEAJAD_TOOAEG', 'Vaheajad',                                                        'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
                               ('OOTOO',           'Öötöö',                                                           'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
                               ('SALVESTUSED',     'Salvestused',                                                     'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
                               ('ROOMA_I',         'Lepinguliste võlasuhete suhtes kohaldatav õigus',                  'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 593/2008'),
                               ('LAHETAMINE',      'Autojuhi lähetamise nõuded',                                      'Direktiiv (EL) 2020/1057')
                          ) AS t(code, name, description)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- A. Meeskond (1 type)
                               ('MEESKOND_01', 'Konduktori vanuse alampiiri ei järgita',                                                                                                   'Artikli 5 lõige 1',                      'MEESKOND'),
                               -- B. Sõiduajad (8 types)
                               ('SOIDUAJAD_01', 'Ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini',                                      'Artikli 6 lõige 1',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_02', 'Ületatakse ööpäevast 9 tunni pikkust sõiduaega 50 % või rohkem',                                                                        'Artikli 6 lõige 1',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_03', 'Ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada',                                                    'Artikli 6 lõige 1',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_04', 'Ületatakse ööpäevast 10 tunni pikkust sõiduaega 50 % või rohkem',                                                                       'Artikli 6 lõige 1',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_05', 'Ületatakse iganädalast sõiduaega',                                                                                                       'Artikli 6 lõige 2',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_06', 'Ületatakse nädalast sõiduaega 25% või rohkem',                                                                                           'Artikli 6 lõige 2',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_07', 'Ületatakse kahe järjestikuse nädala maksimaalset sõiduaega',                                                                             'Artikli 6 lõige 3',                      'SOIDUAJAD'),
                               ('SOIDUAJAD_08', 'Ületatakse kahe järjestikuse nädala maksimaalset sõiduaega 25 % või rohkem',                                                             'Artikli 6 lõige 3',                      'SOIDUAJAD'),
                               -- C. Vaheajad (1 type)
                               ('VAHEAJAD_561_01', 'Ületatakse katkematut 4,5 tunni pikkust sõiduaega enne vaheaja tegemist',                                                             'Artikkel 7',                             'VAHEAJAD_561'),
                               -- D. Puhkeperioodid (10 types)
                               ('PUHKEPERIOODID_01', 'Ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud',                               'Artikli 8 lõige 2',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_02', 'Ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud',                                              'Artikli 8 lõige 2',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_03', 'Ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni',                                                            'Artikli 8 lõige 2',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_04', 'Ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul',                                                             'Artikli 8 lõige 5',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_05', 'Ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni',                                                                       'Artikli 8 lõige 6',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_06', 'Ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud',                          'Artikli 8 lõige 6',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_07', 'Ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeaega',                                                'Artikli 8 lõige 6',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_08', 'Kahele järjestikusele vähendatud iganädalasele puhkeperioodile ei järgne kompenseerimiseks võetavat puhkeperioodi',                  'Artikli 8 lõige 6b',                     'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_09', 'Regulaarsed iganädalased puhkeperioodid või üle 45-tunnised iganädalased puhkeperioodid veedetakse sõidukis',                        'Artikli 8 lõige 8',                      'PUHKEPERIOODID'),
                               ('PUHKEPERIOODID_10', 'Tööandja ei kata majutuskulusid väljaspool sõidukit',                                                                               'Artikli 8 lõige 8',                      'PUHKEPERIOODID'),
                               -- E. 12 päeva reeglist lubatav erand (3 types)
                               ('PAEVA_12_ERAND_01', 'Ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi',                                'Artikli 8 lõike 6 punkt a',              'PAEVA_12_ERAND'),
                               ('PAEVA_12_ERAND_02', 'Iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi',                                                               'Artikli 8 lõike 6 punkt a b) ii)',       'PAEVA_12_ERAND'),
                               ('PAEVA_12_ERAND_03', 'Sõiduperiood 22:00-06:00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhit',                                        'Artikli 8 lõike 6 punkt a d)',           'PAEVA_12_ERAND'),
                               -- F. Töökorraldus (3 types)
                               ('TOOKORRALDUS_01', 'Autoveo-ettevõtja ei korralda juhtide tööd selliselt, et juht saab naasta tööandja tegevuskeskusesse või juhi elukohta',               'Artikli 8 lõige 8a',                     'TOOKORRALDUS'),
                               ('TOOKORRALDUS_02', 'Palga/tasu sidumine läbisõidetud vahemaaga, kohaletoimetamise kiirusega või edasitoimetatud kauba kogusega',                           'Artikli 10 lõige 1',                     'TOOKORRALDUS'),
                               ('TOOKORRALDUS_03', 'Juhi töö puuduv või ebarahuldav korraldus, juhile antud ebapiisavad või puuduvad juhised, mis võimaldaksid tal seadust järgida',       'Artikli 10 lõige 2',                     'TOOKORRALDUS'),
                               -- G. Sõidumeeriku paigaldamine (1 type)
                               ('SOIDUMEERIKU_PAIGALDAMINE_01', 'Ei ole paigaldatud ega kasutata tüübikinnituse saanud sõidumeerikut',                                                    'Artikli 3 lõiked 1, 4, 4a ja artikkel 22', 'SOIDUMEERIKU_PAIGALDAMINE'),
                               -- H. Sõidumeerikute kasutamine (18 types)
                               ('SOIDUMEERIKUD_01', 'Sellise sõidumeeriku kasutamine, mida ei ole kontrollitud tunnustatud töökojas',                                                      'Artikli 23 lõige 1',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_02', 'Juhil on ja/või juht kasutab rohkem kui üht tema enda juhikaarti',                                                                   'Artikkel 27',                            'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_03', 'Juht kasutab sõitmisel võltsitud juhikaarti (loetakse samaväärseks sellega, et juhil puudub juhikaart)',                              'Artikkel 27',                            'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_04', 'Juht kasutab sõitmisel juhikaarti, mis ei ole tema oma (loetakse samaväärseks sellega, et juhil puudub juhikaart)',                   'Artikkel 27',                            'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_05', 'Juht kasutab sõitmisel juhikaarti, mis on saadud valeandmete ja/või võltsitud dokumentide alusel (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'Artikkel 27',    'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_06', 'Sõidumeerik ei toimi korrektselt (nt sõidumeerikut ei ole nõuetekohaselt kontrollitud, kalibreeritud ega plommitud)',                 'Artikli 32 lõige 1',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_07', 'Sõidumeerikut ei ole nõuetekohaselt kasutatud (nt tahtlik, sundimata või sunnitud kuritarvitamine, õige kasutamise juhiste puudumine jne)', 'Artikli 32 lõige 1 ja artikli 33 lõige 1', 'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_08', 'Sellise pettust võimaldava seadme olemasolu sõidukis ja/või kasutamine, millega on võimalik muuta sõidumeeriku andmeid',              'Artikli 32 lõige 3',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_09', 'Salvestuslehtedele kantud andmete või sõidumeerikule ja/või juhikaardile salvestatud ja sealt alla laaditud andmete võltsimine, varjamine, esitamise takistamine või hävitamine', 'Artikli 32 lõige 3', 'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_10', 'Ettevõtja ei säilita salvestuslehti, väljatrükke ega allalaaditud andmeid',                                                          'Artikli 33 lõige 2',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_11', 'Salvestatud ja talletatud andmed ei ole kättesaadavad vähemalt üks aasta',                                                           'Artikli 33 lõige 2',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_12', 'Salvestuslehtede/juhikaardi mittenõuetekohane kasutamine',                                                                           'Artikli 34 lõige 1',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_13', 'Ilma loata eemaldatakse salvestuslehed või juhikaart nii, et see mõjutab asjaomaste andmete salvestamist',                            'Artikli 34 lõige 1',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_14', 'Salvestuslehte või juhikaarti kasutatakse ettenähtud perioodist kauem ning andmed lähevad kaotsi',                                    'Artikli 34 lõige 1a',                    'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_15', 'Kasutatakse määrdunud või kahjustatud salvestuslehti või juhikaarti ning andmed ei ole loetavad',                                     'Artikli 34 lõige 2',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_16', 'Andmeid ei sisestata käsitsi, kui see on nõutav',                                                                                    'Artikli 34 lõige 3',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_17', 'Ei kasutata õiget salvestuslehte või juhikaarti õiges avas (mitme juhiga veo puhul)',                                                'Artikli 34 lõige 4',                     'SOIDUMEERIKUD'),
                               ('SOIDUMEERIKUD_18', 'Lülitite mittenõuetekohane kasutamine',                                                                                              'Artikli 34 lõige 5',                     'SOIDUMEERIKUD'),
                               -- I. Andmete esitamine (7 types)
                               ('ANDMETE_ESITAMINE_01', 'Märgi „parvlaev/rong" ebaõige kasutamine või kasutamata jätmine',                                                                'Artikli 34 lõike 5 punkti b alapunkt v', 'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_02', 'Nõutavaid andmeid ei ole salvestuslehele kantud',                                                                                'Artikli 34 lõige 6',                     'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_03', 'Puuduvad nende riikide tähised, mille piirid juht igapäevasel tööajal ületas',                                                  'Artikli 34 lõige 7',                     'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_04', 'Puuduvad nende riikide tähised, kus juht igapäevast tööaega alustas ja kus ta selle lõpetas',                                    'Artikli 34 lõige 7',                     'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_05', 'Keeldutakse kontrollist',                                                                                                        'Artikkel 36',                            'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_06', 'Ei esitata jooksval päeval ja eelnenud 56 päeval koostatud käsikirjalisi kandeid ja väljatrükke',                                 'Artikkel 36',                            'ANDMETE_ESITAMINE'),
                               ('ANDMETE_ESITAMINE_07', 'Juhikaart on olemas, aga seda ei esitata',                                                                                      'Artikkel 36',                            'ANDMETE_ESITAMINE'),
                               -- J. Rikked (2 types)
                               ('RIKKED_01', 'Sõidumeerikut ei ole parandanud tunnustatud paigaldaja või töökoda',                                                                         'Artikli 37 lõige 1 ja artikli 22 lõige 1', 'RIKKED'),
                               ('RIKKED_02', 'Juht ei märgi kogu nõutavat teavet nende perioodide kohta, mida enam ei registreerita, sest sõidumeerik ei ole töökorras või ei tööta korralikult', 'Artikli 37 lõige 2',             'RIKKED'),
                               -- 7.3 Maksimaalne iganädalane tööaeg (2 types)
                               ('MAKS_TOOAEG_01', 'Ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini',            'Artikkel 4',                             'MAKS_TOOAEG'),
                               ('MAKS_TOOAEG_02', 'Ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel',                                'Artikkel 4',                             'MAKS_TOOAEG'),
                               -- 7.3 Vaheajad (2 types)
                               ('VAHEAJAD_TOOAEG_01', 'Mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele',                                                             'Artikli 5 lõige 1',                      'VAHEAJAD_TOOAEG'),
                               ('VAHEAJAD_TOOAEG_02', 'Mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi',                                                                       'Artikli 5 lõige 1',                      'VAHEAJAD_TOOAEG'),
                               -- 7.3 Öötöö (1 type)
                               ('OOTOO_01', 'Päevane tööaeg 24h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8',                                               'Artikli 7 lõige 1',                      'OOTOO'),
                               -- 7.3 Salvestused (2 types)
                               ('SALVESTUSED_01', 'Tööandjad võltsivad andmeid tööaja kohta või keelduvad kontrolliametnikule andmeid esitamast',                                         'KARS § 279 või § 280',                   'SALVESTUSED'),
                               ('SALVESTUSED_02', 'Juhid kui töötajad/füüsilisest isikust ettevõtjad võltsivad andmeid või keelduvad kontrolliametnikule andmeid esitamast',              'KARS § 279 või § 280',                   'SALVESTUSED'),
                               -- 7.4 Rooma I (1 type)
                               ('ROOMA_I_01', 'Lepinguliste võlasuhete suhtes kohaldatava õiguse rikkumine',                                                                              'Rooma I määrus',                          'ROOMA_I'),
                               -- 7.5 Lähetamine (7 types)
                               ('LAHETAMINE_01', 'Mittetäielik teave lähetusdeklaratsioonil',                                                                                              'Artikli 1 lõike 11 punkt a',             'LAHETAMINE'),
                               ('LAHETAMINE_02', 'Liikmesriigile, kuhu juht lähetatakse, ei esitata hiljemalt lähetuse alguses lähetusdeklaratsiooni',                                    'Artikli 1 lõike 11 punkt a',             'LAHETAMINE'),
                               ('LAHETAMINE_03', 'Juhil on võltsitud lähetusdeklaratsioon',                                                                                               'Artikli 1 lõike 11 punkt b',             'LAHETAMINE'),
                               ('LAHETAMINE_04', 'Juhil ei ole võimalik esitada kehtivat lähetusdeklaratsiooni',                                                                          'Artikli 1 lõike 11 punkt b',             'LAHETAMINE'),
                               ('LAHETAMINE_05', 'Juhi käsutusse ei anta kehtivat lähetusdeklaratsiooni',                                                                                 'Artikli 1 lõike 11 punkt b',             'LAHETAMINE'),
                               ('LAHETAMINE_06', 'Taotletud dokumendid jäetakse lähetuse sihtliikmesriigile esitamata kaheksa nädala jooksul alates taotluse esitamise kuupäevast',        'Artikli 1 lõike 11 punkt c',             'LAHETAMINE'),
                               ('LAHETAMINE_07', 'Autoveoettevõtja ei ajakohasta lähetusdeklaratsioone siseturu infosüsteemi avalikus liideses',                                           'Artikli 1 lõige 12',                     'LAHETAMINE')
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

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- B. Sõiduajad — B1–B3: Ületatakse ööpäevast 9h sõiduaega (parent: SOIDUAJAD_01)
                               ('MI',     '9h < ... < 10h',                        'MI',  'SOIDUAJAD_01'),
                               ('SI901',  '10h ≤ ... < 11h',                       'SI',  'SOIDUAJAD_01'),
                               ('VSI800', '11h ≤ ...',                             'VSI', 'SOIDUAJAD_01'),
                               -- B4: Ületatakse ööpäevast 9h 50%+ (parent: SOIDUAJAD_02)
                               ('MSI102', '13h30 ≤ ...',                           'MSI', 'SOIDUAJAD_02'),
                               -- B5–B7: Ületatakse ööpäevast 10h sõiduaega (parent: SOIDUAJAD_03)
                               ('MI',     '10h < ... < 11h',                       'MI',  'SOIDUAJAD_03'),
                               ('SI902',  '11h ≤ ... < 12h',                       'SI',  'SOIDUAJAD_03'),
                               ('VSI801', '12h ≤ ...',                             'VSI', 'SOIDUAJAD_03'),
                               -- B8: Ületatakse ööpäevast 10h 50%+ (parent: SOIDUAJAD_04)
                               ('MSI103', '15h ≤ ...',                             'MSI', 'SOIDUAJAD_04'),
                               -- B9–B11: Ületatakse iganädalast sõiduaega (parent: SOIDUAJAD_05)
                               ('MI',     '56h < ... < 60h',                       'MI',  'SOIDUAJAD_05'),
                               ('SI903',  '60h ≤ ... < 65h',                       'SI',  'SOIDUAJAD_05'),
                               ('VSI802', '65h ≤ ... < 70h',                       'VSI', 'SOIDUAJAD_05'),
                               -- B12: Ületatakse nädalast sõiduaega 25%+ (parent: SOIDUAJAD_06)
                               ('MSI104', '70h ≤ ...',                             'MSI', 'SOIDUAJAD_06'),
                               -- B13–B15: Ületatakse kahe nädala maks. sõiduaega (parent: SOIDUAJAD_07)
                               ('MI',     '90h < ... < 100h',                      'MI',  'SOIDUAJAD_07'),
                               ('SI904',  '100h ≤ ... < 105h',                     'SI',  'SOIDUAJAD_07'),
                               ('VSI803', '105h ≤ ... < 112h30',                   'VSI', 'SOIDUAJAD_07'),
                               -- B16: Ületatakse kahe nädala maks. sõiduaega 25%+ (parent: SOIDUAJAD_08)
                               ('MSI101', '112h30 ≤ ...',                          'MSI', 'SOIDUAJAD_08'),

                               -- C. Vaheajad — C1–C3 (parent: VAHEAJAD_561_01)
                               ('MI',     '4h30 < ... < 5h',                       'MI',  'VAHEAJAD_561_01'),
                               ('SI905',  '5h ≤ ... < 6h',                         'SI',  'VAHEAJAD_561_01'),
                               ('VSI804', '6h ≤ ...',                              'VSI', 'VAHEAJAD_561_01'),

                               -- D. Puhkeperioodid — D1–D3 (parent: PUHKEPERIOODID_01)
                               ('MI',     '10h ≤ ... < 11h',                       'MI',  'PUHKEPERIOODID_01'),
                               ('SI906',  '8h30 ≤ ... < 10h',                      'SI',  'PUHKEPERIOODID_01'),
                               ('VSI805', '... < 8h30',                            'VSI', 'PUHKEPERIOODID_01'),
                               -- D4–D6 (parent: PUHKEPERIOODID_02)
                               ('MI',     '8h ≤ ... < 9h',                         'MI',  'PUHKEPERIOODID_02'),
                               ('SI907',  '7h ≤ ... < 8h',                         'SI',  'PUHKEPERIOODID_02'),
                               ('VSI806', '... < 7h',                              'VSI', 'PUHKEPERIOODID_02'),
                               -- D7–D9 (parent: PUHKEPERIOODID_03)
                               ('MI',     '3h + [8h ≤ ... < 9h]',                  'MI',  'PUHKEPERIOODID_03'),
                               ('SI908',  '3h + [7h ≤ ... < 8h]',                  'SI',  'PUHKEPERIOODID_03'),
                               ('VSI807', '3h + [... < 7h]',                       'VSI', 'PUHKEPERIOODID_03'),
                               -- D10–D12 (parent: PUHKEPERIOODID_04)
                               ('MI',     '8h ≤ ... < 9h',                         'MI',  'PUHKEPERIOODID_04'),
                               ('SI909',  '7h ≤ ... < 8h',                         'SI',  'PUHKEPERIOODID_04'),
                               ('VSI808', '... < 7h',                              'VSI', 'PUHKEPERIOODID_04'),
                               -- D13–D15 (parent: PUHKEPERIOODID_05)
                               ('MI',     '22h ≤ ... < 24h',                       'MI',  'PUHKEPERIOODID_05'),
                               ('SI910',  '20h ≤ ... < 22h',                       'SI',  'PUHKEPERIOODID_05'),
                               ('VSI809', '... < 20h',                             'VSI', 'PUHKEPERIOODID_05'),
                               -- D16–D18 (parent: PUHKEPERIOODID_06)
                               ('MI',     '42h ≤ ... < 45h',                       'MI',  'PUHKEPERIOODID_06'),
                               ('SI911',  '36h ≤ ... < 42h',                       'SI',  'PUHKEPERIOODID_06'),
                               ('VSI810', '... < 36h',                             'VSI', 'PUHKEPERIOODID_06'),
                               -- D19–D21 (parent: PUHKEPERIOODID_07)
                               ('MI',     '... < 3h',                              'MI',  'PUHKEPERIOODID_07'),
                               ('SI912',  '3h ≤ ... < 12h',                        'SI',  'PUHKEPERIOODID_07'),
                               ('VSI811', '12h ≤ ...',                             'VSI', 'PUHKEPERIOODID_07'),

                               -- E. 12 päeva erand — E1–E3 (parent: PAEVA_12_ERAND_01)
                               ('MI',     '... < 3h',                              'MI',  'PAEVA_12_ERAND_01'),
                               ('SI913',  '3h ≤ ... < 12h',                        'SI',  'PAEVA_12_ERAND_01'),
                               ('VSI812', '12h ≤ ...',                             'VSI', 'PAEVA_12_ERAND_01'),
                               -- E4–E6 (parent: PAEVA_12_ERAND_02) — Nr 48 added
                               ('MI',     '67h < ... < 69h',                       'MI',  'PAEVA_12_ERAND_02'),
                               ('SI914',  '65h < ... ≤ 67h',                       'SI',  'PAEVA_12_ERAND_02'),
                               ('VSI813', '... ≤ 65h',                             'VSI', 'PAEVA_12_ERAND_02'),
                               -- E7–E8 (parent: PAEVA_12_ERAND_03)
                               ('SI915',  '3h < ... < 4,5h',                       'SI',  'PAEVA_12_ERAND_03'),
                               ('VSI814', '4,5h ≤ ...',                            'VSI', 'PAEVA_12_ERAND_03'),

                               -- F. Töökorraldus — F2 (parent: TOOKORRALDUS_02)
                               ('VSI815', 'VSI',                                   'VSI', 'TOOKORRALDUS_02'),
                               -- F3 (parent: TOOKORRALDUS_03)
                               ('VSI816', 'VSI',                                   'VSI', 'TOOKORRALDUS_03'),

                               -- H. Sõidumeerikud — Nr 58 (parent: SOIDUMEERIKUD_02)
                               ('VSI818', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_02'),
                               -- Nr 59 (parent: SOIDUMEERIKUD_03)
                               ('MSI601', 'MSI',                                   'MSI', 'SOIDUMEERIKUD_03'),
                               -- Nr 60 (parent: SOIDUMEERIKUD_04)
                               ('MSI602', 'MSI',                                   'MSI', 'SOIDUMEERIKUD_04'),
                               -- Nr 61 (parent: SOIDUMEERIKUD_05)
                               ('MSI603', 'MSI',                                   'MSI', 'SOIDUMEERIKUD_05'),
                               -- Nr 62 (parent: SOIDUMEERIKUD_06)
                               ('VSI819', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_06'),
                               -- Nr 63 (parent: SOIDUMEERIKUD_07)
                               ('VSI820', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_07'),
                               -- Nr 65 (parent: SOIDUMEERIKUD_09)
                               ('MSI205', 'MSI',                                   'MSI', 'SOIDUMEERIKUD_09'),
                               -- Nr 66 (parent: SOIDUMEERIKUD_10)
                               ('VSI821', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_10'),
                               -- Nr 67 (parent: SOIDUMEERIKUD_11)
                               ('VSI822', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_11'),
                               -- Nr 68 (parent: SOIDUMEERIKUD_12)
                               ('VSI823', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_12'),
                               -- Nr 69 (parent: SOIDUMEERIKUD_13)
                               ('VSI824', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_13'),
                               -- Nr 70 (parent: SOIDUMEERIKUD_14)
                               ('VSI825', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_14'),
                               -- Nr 71 (parent: SOIDUMEERIKUD_15)
                               ('VSI826', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_15'),
                               -- Nr 72 (parent: SOIDUMEERIKUD_16)
                               ('VSI827', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_16'),
                               -- Nr 73 (parent: SOIDUMEERIKUD_17)
                               ('SI916',  'SI',                                    'SI',  'SOIDUMEERIKUD_17'),
                               -- Nr 74 (parent: SOIDUMEERIKUD_18)
                               ('VSI828', 'VSI',                                   'VSI', 'SOIDUMEERIKUD_18'),

                               -- J. Rikked — Nr 83 (parent: RIKKED_02)
                               ('VSI835', 'VSI',                                   'VSI', 'RIKKED_02'),

                               -- 7.3 Maksimaalne iganädalane tööaeg (parent: MAKS_TOOAEG_01)
                               ('SI917',  '56h ≤ ... < 60h',                       'SI',  'MAKS_TOOAEG_01'),
                               ('VSI836', '60h ≤ ...',                             'VSI', 'MAKS_TOOAEG_01'),
                               -- (parent: MAKS_TOOAEG_02)
                               ('SI918',  '65h ≤ ... < 70h',                       'SI',  'MAKS_TOOAEG_02'),
                               ('VSI837', '70h ≤ ...',                             'VSI', 'MAKS_TOOAEG_02'),

                               -- 7.3 Vaheajad (parent: VAHEAJAD_TOOAEG_01)
                               ('SI919',  '10min < ... ≤ 20min',                   'SI',  'VAHEAJAD_TOOAEG_01'),
                               ('VSI838', '≤ 10min',                               'VSI', 'VAHEAJAD_TOOAEG_01'),
                               -- (parent: VAHEAJAD_TOOAEG_02)
                               ('SI920',  '20min < ... ≤ 30min',                   'SI',  'VAHEAJAD_TOOAEG_02'),
                               ('VSI839', '≤ 20min',                               'VSI', 'VAHEAJAD_TOOAEG_02'),

                               -- 7.3 Öötöö (parent: OOTOO_01)
                               ('SI921',  '11h ≤ ... < 13h',                       'SI',  'OOTOO_01'),
                               ('VSI840', '13h ≤ ...',                             'VSI', 'OOTOO_01'),

                               -- 7.3 Salvestused (parent: SALVESTUSED_01)
                               ('VSI841', 'VSI',                                   'VSI', 'SALVESTUSED_01'),
                               -- (parent: SALVESTUSED_02)
                               ('VSI842', 'VSI',                                   'VSI', 'SALVESTUSED_02'),

                               -- 7.4 Rooma I (parent: ROOMA_I_01)
                               ('MI',     'MI',                                    'MI',  'ROOMA_I_01'),

                               -- 7.5 Lähetamine (parent: LAHETAMINE_01 through _07)
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_01'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_02'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_03'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_04'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_05'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_06'),
                               ('MI',     'MI',                                    'MI',  'LAHETAMINE_07')
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

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for TACHOGRAPH_TYPES
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TACHOGRAPH_TYPES') THEN
            RAISE NOTICE 'TACHOGRAPH_TYPES already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'TACHOGRAPH_TYPES',
                   'Sõidumeeriku liik',
                   'Sõidumeeriku liigid — PPA SP kontrollkaart, sõidu- ja puhkeaja nõuete täitmine',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('ANALOGUE', 'Analoogsõidumeerik (1986, teenuse korral ka varem)'),
                               ('DIGITAL',  'Digitaalne sõidumeerik (01.05.2006)'),
                               ('SMART_1',  'Arukas sõidumeerik SMART 1 (15.06.2019)'),
                               ('SMART_2',  'Arukas sõidumeerik SMART 2 (21.08.2023)'),
                               ('MISSING',  'Sõidumeerik puudub (on nõutav)')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for OTHER_DOCUMENTS
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'OTHER_DOCUMENTS') THEN
            RAISE NOTICE 'OTHER_DOCUMENTS already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'OTHER_DOCUMENTS',
                   'Muud dokumendid',
                   'Muud dokumendid — PPA Autojuht SP kontrollkaart §5',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('MOOTORSOIDUKI_LEPING',            'Mootorsõiduki kasutusleping (kui andmed ei ole kantud MTR-i)'),
                               ('SOIDUKIJUHI_TOO_LEPING',          'Mootorsõidukijuhi töö- või võlaõiguslik leping (riigisisesel veoseveol kontroll TÖR-st)'),
                               ('VEOSE_DOKUMENDID',                'Veose saatedokument'),
                               ('SUUREMOOTMELISE_VEOSE_ERILUBA',   'Raske- või suurveose eriluba'),
                               ('LIINIVEO_SOIDUPLAAN',             'Liiniveo sõiduplaan'),
                               ('OMAKULUL_VEOSEVEO_VASTAVUS',      'Oma kulul veoseveol nõuetele vastavuse tõendavad dokumendid'),
                               ('OMAKULUL_SOITJATEVEO_VASTAVUS',   'Oma kulul sõitjateveol nõuetele vastavuse tõendavad dokumendid (nt sertifikaat)')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

    END $$;

