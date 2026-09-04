-- Vormi klassifikaatorite seed dev/test keskkonnale.
-- Käsitsi käivitatav — jooksuta PÄRAST seed_test_data.sql-i.
-- Idempotentne: iga DO-plokk kontrollib IF NOT EXISTS enne insertimist.
--
-- Sisaldab klassifikaatorid:
--   FORM_TYPE, STRUCTURE_UNIT, EU_INFRINGEMENT, EHAK, ROAD_NAME,
--   TRAILER_CATEGORY, VEHICLE_CATEGORY, CARGO_CABOTAGE_VIOLATION,
--   PASSENGER_CABOTAGE_VIOLATION, TRANSPORT_CLASS, DOC_RIGHT_CHECK,
--   DRIVING_VIOLATION, TACHOGRAPH_TYPES, OTHER_DOCUMENTS, MASS_DIMENSION
--
-- Käivitamine (dev):
--   psql -h localhost -p 54321 -U ljvis -d ljvis_db -f tests/bootstrap/seed_classifiers.sql

BEGIN;

-- ============================================================
-- FORM_TYPE — Kontrollvormi tüüp
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'FORM_TYPE') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'FORM_TYPE', 'Kontrollvormi tüüp',
                'Kontrollvormide tüüpide klassifikaator', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('TI_KONTROLLKAART',          'Tööinspektsiooni kontrollkaart',                                       'DASHBOARD_MANUAL_ADD'),
            ('FOREIGN_AUDIT',             'Välisriigis teostatud autoveoalase kontrolli kontrollkaart',             'DASHBOARD_MANUAL_ADD'),
            ('REPUTATION_NONCOMPLIANCE',  'Hea maine nõudele mittevastavaks tunnistatud veokorraldusjuht',         'DASHBOARD_MANUAL_ADD'),
            ('SP_COMPOUND',               'Veondusjärelevalve ja sõiduki tehnoseisundi kontrollkaart',             'DASHBOARD_MANUAL_ADD'),
            ('TRAM_KONTROLLKAART',        'Transpordiameti kontrollkaart',                                        'DASHBOARD_MANUAL_ADD'),
            ('ADMIN_PROCEDURE',           'Haldusmenetlus seoses raskete autoveoalaste rikkumistega',              'DASHBOARD_EXCLUDED')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
        END LOOP;

        FOR v_rec IN SELECT * FROM (VALUES
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
                nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                v_rec.description, v_created_by
            );
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- STRUCTURE_UNIT — Struktuuriüksus
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'STRUCTURE_UNIT') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'STRUCTURE_UNIT', 'Struktuuriüksus',
                'Organisatsioonide struktuuriüksuste klassifikaator', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('PPA_LOUNA', 'Lõuna prefektuur',    'PPA'),
            ('PPA_IDA',   'Ida prefektuur',      'PPA'),
            ('PPA_LAANE', 'Lääne prefektuur',    'PPA'),
            ('PPA_POHJA', 'Põhja prefektuur',    'PPA'),
            ('KLIM_HQ',  'Kliimaministeerium',   'KLIM'),
            ('TRAM_HQ',  'Transpordiamet',       'TRAM')
        ) AS t(code, name, org_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, description, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, v_rec.org_code, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- EU_INFRINGEMENT — EL rikkumised (EÜ) nr 1071/2009
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'EU_INFRINGEMENT') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'EU_INFRINGEMENT',
                'EL rikkumised (EÜ) nr 1071/2009',
                'EL määrusest (EÜ) nr 1071/2009 tuleneva kõige raskema rikkumise klassifikaator',
                v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        -- MSI (Most Serious Infringements)
        FOR v_rec IN SELECT * FROM (VALUES
            ('MSI101', 'ületatakse 2 järjestikuse nädala maksimaalset sõiduaega 25% või rohkem 112h30 ≤ ...', 'MSI'),
            ('MSI102', 'ületatakse ööpäevast 9 tunni pikkust sõiduaega 50 % või rohkem 13h30 ≤ ...', 'MSI'),
            ('MSI103', 'ületatakse ööpäevast 10 tunni pikkust sõiduaega 50 % või rohkem 15h ≤ ...', 'MSI'),
            ('MSI104', 'ületatakse nädalast sõiduaega 25% või rohkem 70h ≤ ...', 'MSI'),
            ('MSI201', 'ei ole paigaldatud ega kasutata tüübikinnituse saanud sõidumeerikut', 'MSI'),
            ('MSI202', 'sellise pettust võimaldava seadme olemasolu sõidukis ja/või kasutamine, millega on võimalik muuta sõidumeeriku andmeid', 'MSI'),
            ('MSI203', 'kiiruspiirikut ei ole paigaldatud', 'MSI'),
            ('MSI204', 'sellise pettust võimaldava seadme olemasolu ja/või kasutamine, millega on võimalik muuta kiiruspiiriku andmeid, või pettust võimaldava kiiruspiiriku olemasolu ja/või kasutamine', 'MSI'),
            ('MSI205', 'salvestuslehtedele kantud andmete või sõidumeerikule ja/või juhikaardile salvestatud ja sealt alla laaditud andmete võltsimine, varjamine, esitamise takistamine või hävitamine', 'MSI'),
            ('MSI301', 'sellise sõiduki juhtimine, millel puudub kehtiv tehnoülevaatuse tõend, nagu on nõutud ELi õigusaktidega', 'MSI'),
            ('MSI302', 'sõidukit ei hoita ohutuna ja tehnonõuetele vastavas korras, mille tulemuseks on väga tõsised puudused pidurisüsteemis, roolihoovastikus, ratastes/rehvides, vedrustuses või raamis või mujal varustuses, mis kujutab sellist vahetut ohtu liiklusohutusele, mis viib otsuseni sõiduk kasutuselt kõrvaldada', 'MSI'),
            ('MSI401', 'selliste ohtlike veoste vedu, mille vedamine on keelatud', 'MSI'),
            ('MSI402', 'ohtlike veoste vedu keelatud või tunnustamata kaitsemahutites, ning seega inimelusid või keskkonda sellisel määral ohustades, et see viib otsuseni sõiduk kasutuselt kõrvaldada', 'MSI'),
            ('MSI403', 'ohtlike veoste vedu ilma neid veoseid sõidukis ohtlike veostena tuvastamata ning seega inimelusid või keskkonda sellisel määral ohustades, et see viib otsuseni sõiduk kasutuselt kõrvaldada', 'MSI'),
            ('MSI501', 'sõitjate või veoste vedu ilma kehtiva juhiloata', 'MSI'),
            ('MSI503', 'sõitjate vedu ilma ühenduse kehtiva tegevusloata', 'MSI'),
            ('MSI504', 'veoste vedu ilma ühenduse kehtiva tegevusloata', 'MSI'),
            ('MSI601', 'juht kasutab sõitmisel võltsitud juhikaarti', 'MSI'),
            ('MSI602', 'juht kasutab sõitmisel juhikaarti, mis ei ole tema oma (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'MSI'),
            ('MSI603', 'juht kasutab sõitmisel juhikaarti, mis on saadud valeandmete ja/või võltsitud dokumentide alusel (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'MSI'),
            ('MSI701', 'ületatakse suurimat lubatud massi N3-kategooria sõidukite puhul 20% ≤ ...', 'MSI'),
            ('MSI702', 'ületatakse suurimat lubatud massi N2-kategooria sõidukite puhul 25% ≤ ...', 'MSI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

        -- VSI batch 1 (Very Serious Infringements)
        FOR v_rec IN SELECT * FROM (VALUES
            ('VSI847', 'kiiruspiirik ei vasta kohaldatavatele tehnilistele nõuetele', 'VSI'),
            ('VSI800', 'ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini 11h ≤ ...', 'VSI'),
            ('VSI801', 'ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada 12h ≤ ...', 'VSI'),
            ('VSI802', 'ületatakse iganädalast sõiduaega 65h ≤ ... < 70h', 'VSI'),
            ('VSI803', 'ületatakse kahe järjestikuse nädala maksimaalset sõiduaega 105h ≤ ... < 112h30', 'VSI'),
            ('VSI804', 'ületatakse katkematut 4,5 tunni pikkust sõiduaega enne vaheaja tegemist 6h ≤ ...', 'VSI'),
            ('VSI805', 'ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud ... < 8h30', 'VSI'),
            ('VSI806', 'ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud ... < 7h', 'VSI'),
            ('VSI807', 'ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni 3h + [... < 7h]', 'VSI'),
            ('VSI808', 'ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul ... < 7h', 'VSI'),
            ('VSI809', 'ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni ... < 20h', 'VSI'),
            ('VSI810', 'ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud ... < 36h', 'VSI'),
            ('VSI811', 'ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeaega 12h ≤ ...', 'VSI'),
            ('VSI812', 'ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi 12h ≤ ...', 'VSI'),
            ('VSI813', 'iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi ... ≤ 65h', 'VSI'),
            ('VSI814', 'sõiduperiood 22:00–6:00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhti 4,5h ≤ ...', 'VSI'),
            ('VSI815', 'palga/tasu sidumine läbisõidetud vahemaaga, kohaletoimetamise kiirusega või edasitoimetatud kauba kogusega', 'VSI'),
            ('VSI816', 'juhi töö puuduv või ebarahuldav korraldus, juhile antud ebapiisavad või puuduvad juhised, mis võimaldaksid tal seadust järgida', 'VSI'),
            ('VSI817', 'sellise sõidumeeriku kasutamine, mida ei ole kontrollitud tunnustatud töökojas', 'VSI'),
            ('VSI818', 'juhil on ja/või juht kasutab rohkem kui üht tema enda juhikaarti', 'VSI'),
            ('VSI819', 'sõidumeerik ei toimi korrektselt', 'VSI'),
            ('VSI820', 'sõidumeerikut ei ole nõuetekohaselt kasutatud (nt tahtlik, sundimata või sunnitud kuritarvitamine, õige kasutamise juhiste puudumine jne)', 'VSI'),
            ('VSI821', 'ettevõtja ei säilita salvestuslehti, väljatrükke ega allalaaditud andmeid', 'VSI'),
            ('VSI822', 'salvestatud ja talletatud andmed ei ole kättesaadavad vähemalt üks aasta', 'VSI'),
            ('VSI823', 'salvestuslehtede/juhikaardi mittenõuetekohane kasutamine', 'VSI'),
            ('VSI824', 'ilma loata eemaldatakse salvestuslehed või juhikaart nii, et see mõjutab asjaomaste andmete salvestamist', 'VSI'),
            ('VSI825', 'salvestuslehte või juhikaarti kasutatakse ettenähtud perioodist kauem ning andmed lähevad kaotsi', 'VSI'),
            ('VSI826', 'kasutatakse määrdunud või kahjustatud salvestuslehti või juhikaarti ning andmed ei ole loetavad', 'VSI'),
            ('VSI827', 'andmeid ei sisestata käsitsi, kui see on nõutav', 'VSI'),
            ('VSI828', 'lülitite mittenõuetekohane kasutamine', 'VSI'),
            ('VSI829', 'keeldutakse kontrollist', 'VSI'),
            ('VSI833', 'juhikaart on olemas, aga seda ei esitata', 'VSI'),
            ('VSI834', 'sõidumeerikut ei parandanud tunnustatud paigaldaja või töökoda', 'VSI'),
            ('VSI835', 'juht ei märgi kogu nõutavat teavet nende perioodide kohta, mida enam ei registreerita, sest sõidumeerik ei ole töökorras või ei tööta korralikult', 'VSI'),
            ('VSI836', 'ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini 60h ≤ ...', 'VSI'),
            ('VSI837', 'ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel 70h ≤ ...', 'VSI'),
            ('VSI838', 'mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele ≤ 10min', 'VSI'),
            ('VSI839', 'mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi ≤ 20min', 'VSI'),
            ('VSI840', 'päevane tööaeg 24h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8 on 13h ≤ ...', 'VSI'),
            ('VSI841', 'tööandjad võltsivad andmeid tööaja kohta või keelduvad kontrolliametnikule andmeid esitamast', 'VSI'),
            ('VSI842', 'juhid kui töötajad/füüsilisest isikust ettevõtjad võltsivad andmeid või keelduvad kontrolliametnikule andmeid esitamast', 'VSI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

        -- VSI batch 2
        FOR v_rec IN SELECT * FROM (VALUES
            ('VSI843', 'ületatakse suurimat lubatud massi N3-kategooria sõidukite puhul 10% ≤ ... < 20%', 'VSI'),
            ('VSI844', 'ületatakse suurimat lubatud massi N2-kategooria sõidukite puhul 15% ≤ ... < 25%', 'VSI'),
            ('VSI845', 'ületatakse suurimat lubatud pikkust 20% ≤ ...', 'VSI'),
            ('VSI846', 'ületatakse suurimat lubatud laiust 3,10 meetrit ≤ ...', 'VSI'),
            ('VSI848', 'sõitjate või kaupade vedu ilma kohustusliku alusõppe ja/või kohustusliku jätkuõppeta', 'VSI'),
            ('VSI849', 'ohtlike veoste lekkimine', 'VSI'),
            ('VSI850', 'lahtiseks veoks kasutatakse mahutit, mille ehitus ei ole sobiv', 'VSI'),
            ('VSI851', 'vedu toimub sõidukiga, millel puudub nõuetekohane vastavustunnistus', 'VSI'),
            ('VSI852', 'sõiduk ei vasta enam vastavusstandarditele ja kujutab otsest ohtu', 'VSI'),
            ('VSI853', 'ei ole kinni peetud veose kinnitus- ja paigutusnormidest', 'VSI'),
            ('VSI854', 'ei ole järgitud pakendite kooslaadimisele seatud norme', 'VSI'),
            ('VSI855', 'ei ole järgitud ühe veoühikuga veetavate koguste piiranguid, sealhulgas mahutite või pakendite lubatavat täitmistaset', 'VSI'),
            ('VSI856', 'veetava aine kohta puudub teave, mis võimaldaks kindlaks teha rikkumise raskusastet', 'VSI'),
            ('VSI857', 'juhil puudub kehtiv kutsealase ettevalmistuse tunnistus', 'VSI'),
            ('VSI858', 'kasutatakse tuld või lahtist leeki', 'VSI'),
            ('VSI859', 'ei peeta kinni suitsetamiskeelust', 'VSI'),
            ('VSI860', 'vedaja või sõidukijuht ei esita veoseveol kehtivat ühenduse tegevusluba või ühenduse tegevusloa kehtivat kinnitatud ärakirja kontrollivale ametnikule', 'VSI'),
            ('VSI861', 'veoste vedu ilma kehtiva juhitunnistuseta', 'VSI'),
            ('VSI862', 'vedaja või sõidukijuht ei esita sõitjateveol kehtivat ühenduse tegevusluba või ühenduse tegevusloa kehtivat tõestatud koopiat kontrollivale ametnikule', 'VSI'),
            ('VSI863', 'liinivedu ilma kehtiva liiniloata', 'VSI'),
            ('VSI864', 'vaheseinad ei ole piisavalt tugevad talumaks loomade kaalu', 'VSI'),
            ('VSI875', 'liikmesriigile, kuhu juht lähetatakse, ei esitata hiljemalt lähetuse alguses lähetusdeklaratsiooni', 'VSI'),
            ('VSI876', 'juhil on võltsitud lähetusdeklaratsioon', 'VSI'),
            ('VSI877', 'juhil ei ole võimalik esitada kehtivat lähetusdeklaratsiooni', 'VSI'),
            ('VSI878', 'juhi käsutusse ei anta kehtivat lähetusdeklaratsiooni', 'VSI'),
            ('VSI879', 'taotletud dokumendid jäetakse lähetuse sihtliikmesriigile esitamata kaheksa nädala jooksul alates taotluse esitamise kuupäevast', 'VSI'),
            ('VSI865', 'kahele järjestikusele vähendatud iganädalasele puhkeperioodile ei järgne kompenseerimiseks võetavat puhkeperioodi', 'VSI'),
            ('VSI866', 'regulaarsed iganädalased puhkeperioodid või üle 45-tunnised iganädalased puhkeperioodid veedetakse sõidukis', 'VSI'),
            ('VSI867', 'autoveo-ettevõtja ei korralda juhtide tööd selliselt, et juht saab naasta tööandja tegevuskeskusesse või juhi elukohta', 'VSI'),
            ('VSI868', 'nõutavaid andmeid ei ole salvestuslehele kantud', 'VSI'),
            ('VSI869', 'kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele', 'VSI'),
            ('VSI870', 'kabotaažvedude tegemine samas liikmesriigis 4 päeva jooksul pärast viimase seadusliku kabotaažveo lõppu selles liikmesriigis', 'VSI'),
            ('VSI871', 'vedaja ei suuda esitada selgeid tõendeid eelnenud rahvusvahelise veo ja/või iga järgneva teostatud kabotaažveo kohta ja/või kõigi tehtud vedude kohta juhul, kui sõiduk on vastuvõtvas liikmesriigis viibinud 4 päeva enne rahvusvahelist vedu, ning esitada need tõendid teel toimuva kontrolli vältel', 'VSI'),
            ('VSI872', 'kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele', 'VSI'),
            ('VSI873', 'sõidukis ei ole või ei ole kontrollima volitatud ametniku nõudmisel võimalik esitada kabotaažvedudeks vajalikke kontrolldokumente (juhuvedude sõiduleht või eriotstarbeliste liinivedude korral vedaja ja veo korraldaja vahel sõlmitud leping või selle tõestatud koopia)', 'VSI'),
            ('VSI874', 'lepinguliste võlasuhete suhtes kohaldatava õiguse rikkumine', 'VSI'),
            ('VSI832', 'ei esitata jooksval päeval ja eelnenud 56 päeval koostatud käsikirjalisi kandeid ja väljatrükke', 'VSI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

        -- SI (Serious Infringements)
        FOR v_rec IN SELECT * FROM (VALUES
            ('SI926', 'kiiruspiirik ei ole paigaldatud tunnustatud töökojas', 'SI'),
            ('SI900', 'konduktori vanuse alampiiri ei järgita', 'SI'),
            ('SI901', 'ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini 10h ≤ ... < 11h', 'SI'),
            ('SI902', 'ületatakse 10 tunni pikkust ööpäevast sõiduaega, kui sõiduaega on lubatud pikendada 11h ≤ ... < 12h', 'SI'),
            ('SI903', 'ületatakse iganädalast sõiduaega 60h ≤ ... < 65h', 'SI'),
            ('SI904', 'ületatakse kahe järjestikuse nädala maksimaalset sõiduaega 100h ≤ ... < 105h', 'SI'),
            ('SI905', 'ületatakse katkematut 4,5 tunni pikkust sõiduaega enne vaheaji tegemist 5h ≤ ... < 6h', 'SI'),
            ('SI906', 'ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud 8h30 ≤ ... < 10h', 'SI'),
            ('SI907', 'ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud 7h ≤ ... < 8h', 'SI'),
            ('SI908', 'ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni 3h + [7h ≤ ... < 8h]', 'SI'),
            ('SI909', 'ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul 7h ≤ ... < 8h', 'SI'),
            ('SI910', 'ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni 20h ≤ ... < 22h', 'SI'),
            ('SI911', 'ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud 36h ≤ ... < 42h', 'SI'),
            ('SI912', 'ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeaega 3h ≤ ... < 12h', 'SI'),
            ('SI913', 'ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi 3h ≤ ... < 12h', 'SI'),
            ('SI914', 'iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi 65h < ... ≤ 67h', 'SI'),
            ('SI915', 'sõiduperiood 22:00–6:00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhti 3h < ... < 4,5h', 'SI'),
            ('SI916', 'ei kasutata õiget salvestuslehte või juhikaarti õiges avas (mitme juhiga veo puhul)', 'SI'),
            ('SI917', 'ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini 56h ≤ ... < 60h', 'SI'),
            ('SI918', 'ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel 65h ≤ ... < 70h', 'SI'),
            ('SI919', 'mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele 10min < ... ≤ 20min', 'SI'),
            ('SI920', 'mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi 20min < ... ≤ 30min', 'SI'),
            ('SI921', 'päevane tööaeg 24h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8 on 11h ≤ ... < 13h', 'SI'),
            ('SI922', 'ületatakse suurimat lubatud massi N3-kategooria sõidukite puhul 5% ≤ ... < 10%', 'SI'),
            ('SI923', 'ületatakse suurimat lubatud massi N2-kategooria sõidukite puhul 5% ≤ ... < 15%', 'SI'),
            ('SI924', 'ületatakse suurimat lubatud pikkust 2% < ... < 20%', 'SI'),
            ('SI925', 'ületatakse suurimat lubatud laiust 2,65 ≤ … < 3,10 meetrit', 'SI'),
            ('SI927', 'juht ei esita kehtivat kutsetunnistust või vastava märkega juhiluba, nagu on nõutud siseriiklikes õigusaktides', 'SI'),
            ('SI928', 'kasutatakse juhiluba, mis on kahjustunud või mitteloetav või ei ole kooskõlas ühtse näidisega', 'SI'),
            ('SI929', 'sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud', 'SI'),
            ('SI930', 'veoühik sisaldab enam kui ühte haagist/poolhaagist', 'SI'),
            ('SI931', 'sõiduk ei vasta enam vastavusstandarditele, kuid ei kujuta otsest ohtu', 'SI'),
            ('SI932', 'sõidukil puuduvad nõuetekohased töökorras tulekustutid', 'SI'),
            ('SI933', 'sõidukil puudub ADRi või kirjaliku juhendiga ettenähtud varustus', 'SI'),
            ('SI934', 'katkise pakendiga, mahtlastikonteineritega (IBC) või suurpakenditega pakkide või kahjustatud, mittepuhaste, tühjade pakendite vedamine', 'SI'),
            ('SI935', 'pakendatud kaupade veoks kasutatakse sobimatu ehitusega mahutit', 'SI'),
            ('SI936', 'mahutid/paakmahutid (sealhulgas tühjad ja puhastamata) on nõuetekohaselt sulgemata', 'SI'),
            ('SI937', 'sõiduki ja/või mahuti etiketid, märgistused või sildid on ebaõiged', 'SI'),
            ('SI938', 'puudub ADRi kohane kirjalik juhend või kirjalik juhend ei vasta veetavatele kaupadele', 'SI'),
            ('SI939', 'sõidukijuht või vedaja ei esita veoseveol kehtivat juhitunnistust või kehtiva juhitunnistuse kinnitatud ärakirja kontrollivale ametnikule', 'SI'),
            ('SI940', 'juht ei esita kontrollivale ametnikule kehtivat liiniluba', 'SI'),
            ('SI941', 'liinivedude puhul ei vasta peatused liikmesriigi antud loale', 'SI'),
            ('SI942', 'veo teostamine ilma nõutava sõiduleheta', 'SI'),
            ('SI943', 'kasutatakse peale- ja mahalaadimise rampe, mille põrand on libe, millel puuduvad külgkaitsed või mille kallak on liiga järsk', 'SI'),
            ('SI944', 'kasutatakse tõstelavasid ja ülemisi korruseid, millel puuduvad kaitsepiirded, mis võimaldavad vältida loomade kukkumist või põgenemist peale- ja mahalaadimise toimingute ajal', 'SI'),
            ('SI945', 'transpordivahendid ei ole heaks kiidetud pikal teekonnal kasutamiseks või transporditavat liiki loomade vedamiseks', 'SI'),
            ('SI946', 'vedu ilma nõutavate dokumentideta, teekonnaleheta või vedaja loata või pädevustunnistuseta', 'SI'),
            ('SI951', 'mittetäielik teave lähetusdeklaratsioonil', 'SI'),
            ('SI952', 'autoveoettevõtja ei ajakohasta lähetusdeklaratsioone siseturu infosüsteemi avalikus liideses', 'SI'),
            ('SI947', 'tööandja ei kata majutuskulusid väljaspool sõidukit', 'SI'),
            ('SI948', 'märgi „parvlaev/rong" ebaõige kasutamine või kasutamata jätmine', 'SI'),
            ('SI949', 'puuduvad nende riikide tähised, mille piirid juht igapäevasel tööajal ületas', 'SI'),
            ('SI950', 'puuduvad nende riikide tähised, kus juht igapäevast tööaega alustas ja kus ta selle lõpetas', 'SI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- EHAK — Eesti haldus- ja asustusjaotuse klassifikaator
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'EHAK') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'EHAK', 'EHAK',
                'Eesti haldus- ja asustusjaotuse klassifikaator (2024v1) — maakonnad, linnad ja vallad',
                v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        -- Maakonnad
        FOR v_rec IN SELECT * FROM (VALUES
            ('0037', 'Harju maakond'), ('0039', 'Hiiu maakond'),
            ('0045', 'Ida-Viru maakond'), ('0050', 'Jõgeva maakond'),
            ('0052', 'Järva maakond'), ('0056', 'Lääne maakond'),
            ('0060', 'Lääne-Viru maakond'), ('0064', 'Põlva maakond'),
            ('0068', 'Pärnu maakond'), ('0071', 'Rapla maakond'),
            ('0074', 'Saare maakond'), ('0079', 'Tartu maakond'),
            ('0081', 'Valga maakond'), ('0084', 'Viljandi maakond'),
            ('0087', 'Võru maakond')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_created_by);
        END LOOP;

        -- Omavalitsused
        FOR v_rec IN SELECT * FROM (VALUES
            ('0141','Anija vald','0037'), ('0198','Harku vald','0037'), ('0245','Jõelähtme vald','0037'),
            ('0296','Keila linn','0037'), ('0305','Kiili vald','0037'), ('0338','Kose vald','0037'),
            ('0353','Kuusalu vald','0037'), ('0424','Loksa linn','0037'), ('0431','Lääne-Harju vald','0037'),
            ('0446','Maardu linn','0037'), ('0651','Raasiku vald','0037'), ('0653','Rae vald','0037'),
            ('0719','Saku vald','0037'), ('0725','Saue vald','0037'), ('0784','Tallinn','0037'),
            ('0890','Viimsi vald','0037'),
            ('0205','Hiiumaa vald','0039'),
            ('0130','Alutaguse vald','0045'), ('0251','Jõhvi vald','0045'), ('0321','Kohtla-Järve linn','0045'),
            ('0442','Lüganuse vald','0045'), ('0511','Narva linn','0045'), ('0515','Narva-Jõesuu linn','0045'),
            ('0736','Sillamäe linn','0045'), ('0803','Toila vald','0045'),
            ('0247','Jõgeva vald','0050'), ('0486','Mustvee vald','0050'), ('0618','Põltsamaa vald','0050'),
            ('0255','Järva vald','0052'), ('0567','Paide linn','0052'), ('0834','Türi vald','0052'),
            ('0184','Haapsalu linn','0056'), ('0441','Lääne-Nigula vald','0056'), ('0907','Vormsi vald','0056'),
            ('0191','Haljala vald','0060'), ('0272','Kadrina vald','0060'), ('0661','Rakvere vald','0060'),
            ('0663','Rakvere linn','0060'), ('0792','Tapa vald','0060'), ('0901','Vinni vald','0060'),
            ('0903','Viru-Nigula vald','0060'), ('0928','Väike-Maarja vald','0060'),
            ('0284','Kanepi vald','0064'), ('0622','Põlva vald','0064'), ('0708','Räpina vald','0064'),
            ('0214','Häädemeeste vald','0068'), ('0303','Kihnu vald','0068'), ('0430','Lääneranna vald','0068'),
            ('0624','Pärnu linn','0068'), ('0638','Põhja-Pärnumaa vald','0068'), ('0712','Saarde vald','0068'),
            ('0809','Tori vald','0068'),
            ('0293','Kehtna vald','0071'), ('0317','Kohila vald','0071'), ('0502','Märjamaa vald','0071'),
            ('0668','Rapla vald','0071'),
            ('0478','Muhu vald','0074'), ('0689','Ruhnu vald','0074'), ('0714','Saaremaa vald','0074'),
            ('0171','Elva vald','0079'), ('0283','Kambja vald','0079'), ('0291','Kastre vald','0079'),
            ('0432','Luunja vald','0079'), ('0528','Nõo vald','0079'), ('0586','Peipsiääre vald','0079'),
            ('0793','Tartu linn','0079'), ('0796','Tartu vald','0079'),
            ('0557','Otepää vald','0081'), ('0824','Tõrva vald','0081'), ('0857','Valga vald','0081'),
            ('0480','Mulgi vald','0084'), ('0615','Põhja-Sakala vald','0084'), ('0897','Viljandi linn','0084'),
            ('0899','Viljandi vald','0084'),
            ('0145','Antsla vald','0087'), ('0698','Rõuge vald','0087'), ('0732','Setomaa vald','0087'),
            ('0917','Võru vald','0087'), ('0919','Võru linn','0087')
        ) AS t(code, name, parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- ROAD_NAME — Maantee nimi
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ROAD_NAME') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'ROAD_NAME', 'Maantee nimi',
                'Põhimaanteede nimede klassifikaator (KLIM määrus nr 48)', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('tallinna_narva',                  'TALLINNA–NARVA TEE (TEE NR 1)'),
            ('tallinna_tartu_voru_luhamaa',      'TALLINNA–TARTU–VÕRU–LUHAMAA TEE (TEE NR 2)'),
            ('johvi_tartu_valga',                'JÕHVI–TARTU–VALGA TEE (TEE NR 3)'),
            ('tallinna_parnu_ikla',              'TALLINNA–PÄRNU–IKLA TEE (TEE NR 4)'),
            ('parnu_paide_rakvere',              'PÄRNU–PAIDE–RAKVERE TEE (TEE NR 5)'),
            ('valga_uulu',                       'VALGA–UULU TEE (TEE NR 6)'),
            ('riia_pihkva',                      'RIIA–PIHKVA TEE (TEE NR 7)'),
            ('tallinna_paldiski',                'TALLINNA–PALDISKI TEE (TEE NR 8)'),
            ('aasmae_haapsalu_rohukula',         'ÄÄSMÄE–HAAPSALU–ROHUKÜLA TEE (TEE NR 9)'),
            ('risti_virtsu_kuivastu_kuressaare', 'RISTI–VIRTSU–KUIVASTU–KURESSAARE TEE (TEE NR 10)'),
            ('tallinna_ringtee',                 'TALLINNA RINGTEE (TEE NR 11)'),
            ('tartu_viljandi_kilingi_nomme',     'TARTU–VILJANDI–KILINGI-NÕMME TEE (TEE NR 92)'),
            ('muu_tee',                          'MUU TEE')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- TRAILER_CATEGORY — Haagise kategooria
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TRAILER_CATEGORY') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'TRAILER_CATEGORY', 'Haagise kategooria',
                'Haagise kategooriate klassifikaator (kontrollvormid 2012)', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('C_2012',     '(c) O3 (3,5-10t)'),
            ('D_2012',     '(d) O4 (üle 10t)'),
            ('OTHER_2012', '(m) Muu')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- VEHICLE_CATEGORY — Mootorsõiduki kategooria
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'VEHICLE_CATEGORY') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'VEHICLE_CATEGORY', 'Mootorsõiduki kategooria',
                'Mootorsõiduki kategooriate klassifikaator (kontrollvormid 2012)', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('A_2012',     '(a) N2 (3,5 – 12 t)'),
            ('B_2012',     '(b) N3 (üle 12 t)'),
            ('E_2012',     '(e) M2 (rohkem kui 9 istekohta kuni 5t)'),
            ('F_2012',     '(f) M3 (rohkem kui 9 istekohta rohkem kui 5t)'),
            ('G3_2012',    '(g) T1b'), ('H2_2012',    '(h) T2b'),
            ('I_2012',     '(i) T3b'), ('J_2012',     '(j) T4.1b'),
            ('K_2012',     '(k) T4.2b'), ('L_2012',   '(l) T4.3b'),
            ('OTHER_2012', '(m) Muu')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- CARGO_CABOTAGE_VIOLATION + PASSENGER_CABOTAGE_VIOLATION
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'CARGO_CABOTAGE_VIOLATION') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'CARGO_CABOTAGE_VIOLATION',
                'Veoseveo kabotaažrikkumised',
                'Veoseveo kabotaažrikkumiste klassifikaator — määrus (EÜ) nr 1072/2009', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('VSI869', 'Kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele (määruse (EÜ) nr 1072/2009 artikli 8 lõige 2)', 'VSI'),
            ('VSI870', 'Kabotaažvedude tegemine samas liikmesriigis 4 päeva jooksul pärast viimase seadusliku kabotaažveo lõppu selles liikmesriigis (määruse (EÜ) nr 1072/2009 artikli 8 lõige 2a)', 'VSI'),
            ('VSI871', 'Vedaja ei suuda esitada selgeid tõendeid eelnenud rahvusvahelise veo ja/või iga järgneva teostatud kabotaažveo kohta ja/või kõigi tehtud vedude kohta juhul, kui sõiduk on vastuvõtvas liikmesriigis viibinud 4 päeva enne rahvusvahelist vedu, ning esitada need tõendid teel toimuva kontrolli vältel (määruse (EÜ) nr 1072/2009 artikli 8 lõiked 3 ja 4)', 'VSI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

    END IF;

    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'PASSENGER_CABOTAGE_VIOLATION') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'PASSENGER_CABOTAGE_VIOLATION',
                'Sõitjateveo kabotaažrikkumised',
                'Sõitjateveo kabotaažrikkumiste klassifikaator — määrus (EÜ) nr 1073/2009', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('VSI872', 'Kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele (määruse (EÜ) nr 1073/2009 artikkel 16)', 'VSI'),
            ('VSI873', 'Sõidukis ei ole või ei ole kontrollima volitatud ametniku nõudmisel võimalik esitada kabotaažvedudeks vajalikke kontrolldokumente (juhuvedude sõiduleht või eriotstarbeliste liinivedude korral vedaja ja veo korraldaja vahel sõlmitud leping või selle tõestatud koopia) (määruse (EÜ) nr 1073/2009 artikkel 17)', 'VSI')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_rec.description, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- TRANSPORT_CLASS — Veoklass
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TRANSPORT_CLASS') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'TRANSPORT_CLASS', 'Veoklass',
                'Veoklass — PPA SP kontrollkaart, sõidu- ja puhkeaja kontrollvormi täitmine', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('DOMESTIC',             'Riigisisene vedu'),
            ('EU_EEA_CH',            'EL või EMP liikmesriikide või Šveitsi vaheline vedu'),
            ('INTERNATIONAL_3RD',    'Rahvusvaheline vedu kolmandasse riiki voi kolmandast riigist'),
            ('CABOTAGE',             'Välisriigi vedaja kabotaažvedu (autojuhi suhtes rakenduvad lähetamise nõuded)'),
            ('PASSENGER_REGULAR',    'Sõitjate liinivedu'),
            ('PASSENGER_OCCASIONAL', 'Sõitjate juhuvedu'),
            ('PASSENGER_SPECIAL',    'Sõitjate eriotstarbeline vedu (õpilased, töölised jne)'),
            ('ATP_PERISHABLE',       'ATP kokkuleppe kohane kiirestiriknevate toiduainete vedu')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- DOC_RIGHT_CHECK — Dokumendi või õiguse kontroll
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DOC_RIGHT_CHECK') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'DOC_RIGHT_CHECK',
                'Dokumendi või õiguse kontroll',
                'Dokumendi või õiguse kontroll — rikkumiste klassifikaator (EL 2016/403)', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        -- Kategooriad (parent nodes)
        FOR v_rec IN SELECT * FROM (VALUES
            ('JUHTIMIS_OIGUS',     'Juhtimisõigus/juhiluba'),
            ('MOOTORSOIDUKI_TU',   'Mootorsõiduki tehnoülevaatus'),
            ('HAAGISE_TU',         'Haagise tehnoülevaatus'),
            ('TEGEVUSLUBA',        'Ühenduse tegevusluba'),
            ('TEGEVUSLOA_ARAKIRI', 'Ühenduse tegevusloa kinnitatud ärakiri või tõestatud koopia'),
            ('VEOLUBA',            'Välisriigi vedaja veoluba'),
            ('JUHITUNNISTUS',      'Juhitunnistus (EL määruse 1072/2009 art 5)'),
            ('AMETIKOOLITUS',      'Mootorsõidukijuhi ameti- ja täienduskoolituse läbimine'),
            ('LIINILUBA',          'Liiniluba sõitjateveol'),
            ('JUHUVEO_SOIDULEHT',  'Juhuveo kontrolldokumendi sõiduleht')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, NULL, v_created_by);
        END LOOP;

        -- Alaliigid (child nodes)
        FOR v_rec IN SELECT * FROM (VALUES
            ('JUHTIMIS_OIGUS_01',     'Sõitjate- või veosevedu ilma kehtiva juhtimisõiguse või juhiloata',                                              'JUHTIMIS_OIGUS'),
            ('JUHTIMIS_OIGUS_02',     'Kasutatakse juhiluba, mis on kahjustunud või mitteloetav või ei ole kooskõlas EL-i ühtse näidisega',               'JUHTIMIS_OIGUS'),
            ('MOOTORSOIDUKI_TU_01',   'Sellise sõiduki juhtimine, millel puudub kehtiv tehnoülevaatus või kehtiv tehnoülevaatuse tõend',                 'MOOTORSOIDUKI_TU'),
            ('HAAGISE_TU_01',         'Sellise sõiduki juhtimine, millel puudub kehtiv tehnoülevaatus või kehtiv tehnoülevaatuse tõend',                 'HAAGISE_TU'),
            ('TEGEVUSLUBA_01',        'Tasuline sõitjatevedu ilma ühenduse kehtiva tegevusloata',                                                        'TEGEVUSLUBA'),
            ('TEGEVUSLUBA_02',        'Tasuline veosevedu ilma ühenduse kehtiva tegevusloata',                                                            'TEGEVUSLUBA'),
            ('TEGEVUSLOA_ARAKIRI_01', 'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (sõitjatevedu)', 'TEGEVUSLOA_ARAKIRI'),
            ('TEGEVUSLOA_ARAKIRI_02', 'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (veosevedu)',    'TEGEVUSLOA_ARAKIRI'),
            ('TEGEVUSLOA_ARAKIRI_03', 'Ühenduse tegevusloa kinnitatud ärakiri või tõestatud koopia on üle antud mitteõigustatud isikule',                 'TEGEVUSLOA_ARAKIRI'),
            ('VEOLUBA_01',            'Mootorsõidukijuhi ei esita välislepingust tulenevat nõuetekohast veoluba',                                        'VEOLUBA'),
            ('JUHITUNNISTUS_01',      'Veosevedu ilma kehtiva juhitunnistuseta',                                                                          'JUHITUNNISTUS'),
            ('JUHITUNNISTUS_02',      'Mootorsõidukijuht ei esita kehtivat juhitunnistust',                                                               'JUHITUNNISTUS'),
            ('AMETIKOOLITUS_01',      'Mootorsõidukijuht teostab veose- või sõitjatevedu ilma kohustusliku ameti- või täienduskoolitust läbimata',        'AMETIKOOLITUS'),
            ('AMETIKOOLITUS_02',      'Mootorsõidukijuht ei esita kehtivat pädevustunnistust või vastava märkega juhiluba',                               'AMETIKOOLITUS'),
            ('LIINILUBA_01',          'Liinivedu ilma kehtiva liiniloata',                                                                                'LIINILUBA'),
            ('LIINILUBA_02',          'Bussijuht ei esita kehtivat liiniluba',                                                                            'LIINILUBA'),
            ('LIINILUBA_03',          'Liiniveol tehtav peatus ei vasta liiniloale',                                                                      'LIINILUBA'),
            ('JUHUVEO_SOIDULEHT_01',  'Sõitjate juhuveo teostamine ilma nõutava sõiduleheta',                                                             'JUHUVEO_SOIDULEHT')
        ) AS t(code, name, parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                NULL, v_created_by);
        END LOOP;

        -- EL rikkumiste viited (severity codes linked to child nodes)
        FOR v_rec IN SELECT * FROM (VALUES
            ('MSI501', 'MSI', 'JUHTIMIS_OIGUS_01'), ('SI928',   'SI',  'JUHTIMIS_OIGUS_02'),
            ('MSI301', 'MSI', 'MOOTORSOIDUKI_TU_01'), ('MSI301', 'MSI', 'HAAGISE_TU_01'),
            ('MSI503', 'MSI', 'TEGEVUSLUBA_01'), ('MSI504', 'MSI', 'TEGEVUSLUBA_02'),
            ('VSI862', 'VSI', 'TEGEVUSLOA_ARAKIRI_01'), ('VSI860', 'VSI', 'TEGEVUSLOA_ARAKIRI_02'),
            ('SI_TL01','SI',  'TEGEVUSLOA_ARAKIRI_03'),
            ('VSI_VL01','VSI','VEOLUBA_01'),
            ('VSI861', 'VSI', 'JUHITUNNISTUS_01'), ('SI939',  'SI',  'JUHITUNNISTUS_02'),
            ('VSI848', 'VSI', 'AMETIKOOLITUS_01'), ('SI927',  'SI',  'AMETIKOOLITUS_02'),
            ('VSI863', 'VSI', 'LIINILUBA_01'), ('SI940',  'SI',  'LIINILUBA_02'), ('SI941',  'SI',  'LIINILUBA_03'),
            ('SI942',  'SI',  'JUHUVEO_SOIDULEHT_01')
        ) AS t(code, name, parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- DRIVING_VIOLATION — Sõidu- ja puhkeaja rikkumised
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DRIVING_VIOLATION') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'DRIVING_VIOLATION',
                'Sõidu- ja puhkeaja rikkumised',
                'Sõidu- ja puhkeaja rikkumiste klassifikaator (EL 2016/403)', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        -- Kategooriad (parent nodes)
        FOR v_rec IN SELECT * FROM (VALUES
            ('SOIDUAJAD',                'Sõiduajad',                                                       'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('VAHEAJAD_561',             'Vaheajad',                                                        'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('PUHKEPERIOODID',           'Puhkeperioodid',                                                  'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('PAEVA_12_ERAND',           '12 päeva reeglist lubatav erand',                                 'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('TOOKORRALDUS',             'Töökorraldus',                                                    'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('MEESKOND',                 'Meeskond',                                                        'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 561/2006'),
            ('SOIDUMEERIKU_PAIGALDAMINE','Sõidumeeriku paigaldamine',                                       'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
            ('SOIDUMEERIKUD',            'Sõidumeerikute, juhikaartide või salvestuslehtede kasutamine',    'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
            ('ANDMETE_ESITAMINE',        'Andmete esitamine',                                              'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
            ('RIKKED',                   'Rikked',                                                          'Euroopa Parlamendi ja nõukogu määrus (EL) nr 165/2014'),
            ('MAKS_TOOAEG',              'Maksimaalne iganädalane tööaeg',                                  'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
            ('VAHEAJAD_TOOAEG',          'Vaheajad',                                                        'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
            ('OOTOO',                    'Öötöö',                                                            'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
            ('SALVESTUSED',              'Salvestused',                                                     'Euroopa Parlamendi ja nõukogu direktiiv 2002/15/EÜ'),
            ('ROOMA_I',                  'Lepinguliste võlasuhete suhtes kohaldatav õigus',                  'Euroopa Parlamendi ja nõukogu määrus (EÜ) nr 593/2008'),
            ('LAHETAMINE',               'Autojuhi lähetamise nõuded',                                      'Direktiiv (EL) 2020/1057')
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
        END LOOP;

        -- Alaliigid (child nodes with severity codes)
        FOR v_rec IN SELECT * FROM (VALUES
            ('MEESKOND_01',                'Konduktori vanuse alampiiri ei järgita',                                                                                                   'Artikli 5 lõige 1',                        'MEESKOND'),
            ('SOIDUAJAD_01',               'Ületatakse ööpäevast 9 tunni pikkust sõiduaega, kui sõiduaega ei ole lubatud pikendada 10 tunnini',                                      'Artikli 6 lõige 1',                        'SOIDUAJAD'),
            ('SOIDUAJAD_02',               'Ületatakse ööpäevast 9 tunni pikkust sõiduaega 50 % või rohkem',                                                                        'Artikli 6 lõige 1',                        'SOIDUAJAD'),
            ('SOIDUAJAD_03',               'Ületatakse ööpäevast 10 tunni pikkust sõiduaega, kui sõiduaega on lubatud pikendada',                                                    'Artikli 6 lõige 1',                        'SOIDUAJAD'),
            ('SOIDUAJAD_04',               'Ületatakse ööpäevast 10 tunni pikkust sõiduaega 50 % või rohkem',                                                                       'Artikli 6 lõige 1',                        'SOIDUAJAD'),
            ('SOIDUAJAD_05',               'Ületatakse iganädalast sõiduaega',                                                                                                       'Artikli 6 lõige 2',                        'SOIDUAJAD'),
            ('SOIDUAJAD_06',               'Ületatakse nädalast sõiduaega 25% või rohkem',                                                                                           'Artikli 6 lõige 2',                        'SOIDUAJAD'),
            ('SOIDUAJAD_07',               'Ületatakse kahe järjestikuse nädala maksimaalset sõiduaega',                                                                             'Artikli 6 lõige 3',                        'SOIDUAJAD'),
            ('SOIDUAJAD_08',               'Ületatakse kahe järjestikuse nädala maksimaalset sõiduaega 25 % või rohkem',                                                             'Artikli 6 lõige 3',                        'SOIDUAJAD'),
            ('VAHEAJAD_561_01',            'Ületatakse katkematut 4,5 tunni pikkust sõiduaega enne vaheaja tegemist',                                                               'Artikkel 7',                               'VAHEAJAD_561'),
            ('PUHKEPERIOODID_01',          'Ebapiisav ööpäevane puhkeperiood alla 11 tunni, kui vähendatud ööpäevane puhkeperiood ei ole lubatud',                                   'Artikli 8 lõige 2',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_02',          'Ebapiisav vähendatud ööpäevane puhkeperiood alla 9 tunni, kui vähendamine on lubatud',                                                  'Artikli 8 lõige 2',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_03',          'Ebapiisav kahte ossa jaotatud ööpäevane puhkeperiood alla 3 + 9 tunni',                                                                'Artikli 8 lõige 2',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_04',          'Ebapiisav ööpäevane puhkeperiood alla 9 tunni mitme juhiga veo puhul',                                                                 'Artikli 8 lõige 5',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_05',          'Ebapiisav vähendatud iganädalane puhkeperiood alla 24 tunni',                                                                           'Artikli 8 lõige 6',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_06',          'Ebapiisav iganädalane puhkeperiood alla 45 tunni, kui vähendatud iganädalane puhkeperiood ei ole lubatud',                              'Artikli 8 lõige 6',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_07',          'Ületatakse 6 järjestikust 24-tunnist perioodi pärast eelmist iganädalast puhkeaega',                                                    'Artikli 8 lõige 6',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_08',          'Kahele järjestikusele vähendatud iganädalasele puhkeperioodile ei järgne kompenseerimiseks võetavat puhkeperioodi',                      'Artikli 8 lõige 6b',                       'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_09',          'Regulaarsed iganädalased puhkeperioodid või üle 45-tunnised iganädalased puhkeperioodid veedetakse sõidukis',                            'Artikli 8 lõige 8',                        'PUHKEPERIOODID'),
            ('PUHKEPERIOODID_10',          'Tööandja ei kata majutuskulusid väljaspool sõidukit',                                                                                   'Artikli 8 lõige 8',                        'PUHKEPERIOODID'),
            ('PAEVA_12_ERAND_01',          'Ületatakse 12 järjestikust 24-tunnist perioodi pärast eelmist regulaarset iganädalast puhkeperioodi',                                    'Artikli 8 lõike 6 punkt a',                'PAEVA_12_ERAND'),
            ('PAEVA_12_ERAND_02',          'Iganädalane puhkeperiood pärast 12 järjestikust 24-tunnist perioodi',                                                                   'Artikli 8 lõike 6 punkt a b) ii)',         'PAEVA_12_ERAND'),
            ('PAEVA_12_ERAND_03',          'Sõiduperiood 22:00-06:00 rohkem kui 3 tundi enne vaheaega, kui sõidukis ei ole mitut juhit',                                            'Artikli 8 lõike 6 punkt a d)',             'PAEVA_12_ERAND'),
            ('TOOKORRALDUS_01',            'Autoveo-ettevõtja ei korralda juhtide tööd selliselt, et juht saab naasta tööandja tegevuskeskusesse või juhi elukohta',               'Artikli 8 lõige 8a',                       'TOOKORRALDUS'),
            ('TOOKORRALDUS_02',            'Palga/tasu sidumine läbisõidetud vahemaaga, kohaletoimetamise kiirusega või edasitoimetatud kauba kogusega',                             'Artikli 10 lõige 1',                       'TOOKORRALDUS'),
            ('TOOKORRALDUS_03',            'Juhi töö puuduv või ebarahuldav korraldus, juhile antud ebapiisavad või puuduvad juhised, mis võimaldaksid tal seadust järgida',         'Artikli 10 lõige 2',                       'TOOKORRALDUS'),
            ('SOIDUMEERIKU_PAIGALDAMINE_01','Ei ole paigaldatud ega kasutata tüübikinnituse saanud sõidumeerikut',                                                                  'Artikli 3 lõiked 1, 4, 4a ja artikkel 22', 'SOIDUMEERIKU_PAIGALDAMINE'),
            ('SOIDUMEERIKUD_01',           'Sellise sõidumeeriku kasutamine, mida ei ole kontrollitud tunnustatud töökojas',                                                          'Artikli 23 lõige 1',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_02',           'Juhil on ja/või juht kasutab rohkem kui üht tema enda juhikaarti',                                                                      'Artikkel 27',                              'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_03',           'Juht kasutab sõitmisel võltsitud juhikaarti (loetakse samaväärseks sellega, et juhil puudub juhikaart)',                                 'Artikkel 27',                              'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_04',           'Juht kasutab sõitmisel juhikaarti, mis ei ole tema oma (loetakse samaväärseks sellega, et juhil puudub juhikaart)',                      'Artikkel 27',                              'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_05',           'Juht kasutab sõitmisel juhikaarti, mis on saadud valeandmete ja/või võltsitud dokumentide alusel (loetakse samaväärseks sellega, et juhil puudub juhikaart)', 'Artikkel 27', 'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_06',           'Sõidumeerik ei toimi korrektselt',                                                                                                      'Artikli 32 lõige 1',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_07',           'Sõidumeerikut ei ole nõuetekohaselt kasutatud',                                                                                         'Artikli 32 lõige 1 ja artikli 33 lõige 1', 'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_08',           'Sellise pettust võimaldava seadme olemasolu sõidukis ja/või kasutamine, millega on võimalik muuta sõidumeeriku andmeid',                'Artikli 32 lõige 3',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_09',           'Salvestuslehtedele kantud andmete või sõidumeerikule ja/või juhikaardile salvestatud ja sealt alla laaditud andmete võltsimine, varjamine, esitamise takistamine või hävitamine', 'Artikli 32 lõige 3', 'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_10',           'Ettevõtja ei säilita salvestuslehti, väljatrükke ega allalaaditud andmeid',                                                              'Artikli 33 lõige 2',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_11',           'Salvestatud ja talletatud andmed ei ole kättesaadavad vähemalt üks aasta',                                                              'Artikli 33 lõige 2',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_12',           'Salvestuslehtede/juhikaardi mittenõuetekohane kasutamine',                                                                              'Artikli 34 lõige 1',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_13',           'Ilma loata eemaldatakse salvestuslehed või juhikaart nii, et see mõjutab asjaomaste andmete salvestamist',                               'Artikli 34 lõige 1',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_14',           'Salvestuslehte või juhikaarti kasutatakse ettenähtud perioodist kauem ning andmed lähevad kaotsi',                                       'Artikli 34 lõige 1a',                      'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_15',           'Kasutatakse määrdunud või kahjustatud salvestuslehti või juhikaarti ning andmed ei ole loetavad',                                        'Artikli 34 lõige 2',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_16',           'Andmeid ei sisestata käsitsi, kui see on nõutav',                                                                                       'Artikli 34 lõige 3',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_17',           'Ei kasutata õiget salvestuslehte või juhikaarti õiges avas (mitme juhiga veo puhul)',                                                   'Artikli 34 lõige 4',                       'SOIDUMEERIKUD'),
            ('SOIDUMEERIKUD_18',           'Lülitite mittenõuetekohane kasutamine',                                                                                                 'Artikli 34 lõige 5',                       'SOIDUMEERIKUD'),
            ('ANDMETE_ESITAMINE_01',       'Märgi „parvlaev/rong" ebaõige kasutamine või kasutamata jätmine',                                                                       'Artikli 34 lõike 5 punkti b alapunkt v',   'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_02',       'Nõutavaid andmeid ei ole salvestuslehele kantud',                                                                                       'Artikli 34 lõige 6',                       'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_03',       'Puuduvad nende riikide tähised, mille piirid juht igapäevasel tööajal ületas',                                                         'Artikli 34 lõige 7',                       'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_04',       'Puuduvad nende riikide tähised, kus juht igapäevast tööaega alustas ja kus ta selle lõpetas',                                           'Artikli 34 lõige 7',                       'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_05',       'Keeldutakse kontrollist',                                                                                                               'Artikkel 36',                              'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_06',       'Ei esitata jooksval päeval ja eelnenud 56 päeval koostatud käsikirjalisi kandeid ja väljatrükke',                                        'Artikkel 36',                              'ANDMETE_ESITAMINE'),
            ('ANDMETE_ESITAMINE_07',       'Juhikaart on olemas, aga seda ei esitata',                                                                                             'Artikkel 36',                              'ANDMETE_ESITAMINE'),
            ('RIKKED_01',                  'Sõidumeerikut ei ole parandanud tunnustatud paigaldaja või töökoda',                                                                    'Artikli 37 lõige 1 ja artikli 22 lõige 1', 'RIKKED'),
            ('RIKKED_02',                  'Juht ei märgi kogu nõutavat teavet nende perioodide kohta, mida enam ei registreerita, sest sõidumeerik ei ole töökorras',              'Artikli 37 lõige 2',                       'RIKKED'),
            ('MAKS_TOOAEG_01',             'Ületatakse maksimaalset iganädalast 48 tunni pikkust tööaega, kui on kasutatud ära võimalused pikendada tööaega 60 tunnini',            'Artikkel 4',                               'MAKS_TOOAEG'),
            ('MAKS_TOOAEG_02',             'Ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ole tehtud erandit artikli 8 alusel',                                'Artikkel 4',                               'MAKS_TOOAEG'),
            ('VAHEAJAD_TOOAEG_01',         'Mittepiisav kohustuslik vaheaeg, kui tööaeg jääb 6 ja 9 tunni vahele',                                                                 'Artikli 5 lõige 1',                        'VAHEAJAD_TOOAEG'),
            ('VAHEAJAD_TOOAEG_02',         'Mittepiisav kohustuslik vaheaeg, kui tööaeg ületab 9 tundi',                                                                            'Artikli 5 lõige 1',                        'VAHEAJAD_TOOAEG'),
            ('OOTOO_01',                   'Päevane tööaeg 24h vahemikus, kui tehakse öötööd, kui puuduvad erandid vastavalt artiklile 8',                                          'Artikli 7 lõige 1',                        'OOTOO'),
            ('SALVESTUSED_01',             'Tööandjad võltsivad andmeid tööaja kohta või keelduvad kontrolliametnikule andmeid esitamast',                                          'KARS § 279 või § 280',                     'SALVESTUSED'),
            ('SALVESTUSED_02',             'Juhid kui töötajad/füüsilisest isikust ettevõtjad võltsivad andmeid või keelduvad kontrolliametnikule andmeid esitamast',               'KARS § 279 või § 280',                     'SALVESTUSED'),
            ('ROOMA_I_01',                 'Lepinguliste võlasuhete suhtes kohaldatava õiguse rikkumine',                                                                            'Rooma I määrus',                           'ROOMA_I'),
            ('LAHETAMINE_01',              'Mittetäielik teave lähetusdeklaratsioonil',                                                                                              'Artikli 1 lõike 11 punkt a',               'LAHETAMINE'),
            ('LAHETAMINE_02',              'Liikmesriigile, kuhu juht lähetatakse, ei esitata hiljemalt lähetuse alguses lähetusdeklaratsiooni',                                    'Artikli 1 lõike 11 punkt a',               'LAHETAMINE'),
            ('LAHETAMINE_03',              'Juhil on võltsitud lähetusdeklaratsioon',                                                                                               'Artikli 1 lõike 11 punkt b',               'LAHETAMINE'),
            ('LAHETAMINE_04',              'Juhil ei ole võimalik esitada kehtivat lähetusdeklaratsiooni',                                                                          'Artikli 1 lõike 11 punkt b',               'LAHETAMINE'),
            ('LAHETAMINE_05',              'Juhi käsutusse ei anta kehtivat lähetusdeklaratsiooni',                                                                                 'Artikli 1 lõike 11 punkt b',               'LAHETAMINE'),
            ('LAHETAMINE_06',              'Taotletud dokumendid jäetakse lähetuse sihtliikmesriigile esitamata kaheksa nädala jooksul alates taotluse esitamise kuupäevast',        'Artikli 1 lõike 11 punkt c',               'LAHETAMINE'),
            ('LAHETAMINE_07',              'Autoveoettevõtja ei ajakohasta lähetusdeklaratsioone siseturu infosüsteemi avalikus liideses',                                           'Artikli 1 lõige 12',                       'LAHETAMINE')
        ) AS t(code, name, description, parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                v_rec.description, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- TACHOGRAPH_TYPES — Sõidumeeriku liik
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TACHOGRAPH_TYPES') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'TACHOGRAPH_TYPES', 'Sõidumeeriku liik',
                'Sõidumeeriku liigid — PPA SP kontrollkaart, sõidu- ja puhkeaja nõuete täitmine', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('ANALOGUE', 'Analoogsõidumeerik (1986, teenuse korral ka varem)'),
            ('DIGITAL',  'Digitaalne sõidumeerik (01.05.2006)'),
            ('SMART_1',  'Arukas sõidumeerik SMART 1 (15.06.2019)'),
            ('SMART_2',  'Arukas sõidumeerik SMART 2 (21.08.2023)'),
            ('MISSING',  'Sõidumeerik puudub (on nõutav)')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- OTHER_DOCUMENTS — Muud dokumendid
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'OTHER_DOCUMENTS') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'OTHER_DOCUMENTS', 'Muud dokumendid',
                'Muud dokumendid — PPA Autojuht SP kontrollkaart §5', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN SELECT * FROM (VALUES
            ('MOOTORSOIDUKI_LEPING',           'Mootorsõiduki kasutusleping (kui andmed ei ole kantud MTR-i)'),
            ('SOIDUKIJUHI_TOO_LEPING',         'Mootorsõidukijuhi töö- või võlaõiguslik leping (riigisisesel veoseveol kontroll TÖR-st)'),
            ('VEOSE_DOKUMENDID',               'Veose saatedokument'),
            ('SUUREMOOTMELISE_VEOSE_ERILUBA',  'Raske- või suurveose eriluba'),
            ('LIINIVEO_SOIDUPLAAN',            'Liiniveo sõiduplaan'),
            ('OMAKULUL_VEOSEVEO_VASTAVUS',     'Oma kulul veoseveol nõuetele vastavuse tõendavad dokumendid'),
            ('OMAKULUL_SOITJATEVEO_VASTAVUS',  'Oma kulul sõitjateveol nõuetele vastavuse tõendavad dokumendid (nt sertifikaat)')
        ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, v_created_by);
        END LOOP;

    END IF;
END $$;

-- ============================================================
-- MASS_DIMENSION — Sõiduki massi ja mõõtmete kontroll
-- ============================================================
DO $$
DECLARE
    v_created_by VARCHAR(100) := 'bootstrap-classifiers';
    v_clf_key    BIGINT;
    v_rec        RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'MASS_DIMENSION') THEN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'MASS_DIMENSION',
                'Sõiduki massi ja mõõtmete kontroll',
                'Sõiduki massi ja mõõtmete rikkumiste klassifikaator', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        -- Kategooriad
        FOR v_rec IN SELECT * FROM (VALUES
            ('MASS_N3',      'Ületatakse suurimat lubatud massi N3-kategooria sõidukiga', 'Mass'),
            ('MASS_N2',      'Ületatakse suurimat lubatud massi N2-kategooria sõidukiga', 'Mass'),
            ('PIKKUS',       'Ületatakse suurimat lubatud pikkust',                       'Pikkus'),
            ('LAIUS',        'Ületatakse suurimat lubatud laiust',                        'Laius'),
            ('KORGUS',       'Kõrgus',                                                    NULL),
            ('TELJEKOORMUS', 'Teljekoormus',                                              NULL)
        ) AS t(code, name, description)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
        END LOOP;

        -- Alaliigid
        FOR v_rec IN SELECT * FROM (VALUES
            ('SI922',           '5% ≤ ... < 10%',      'SI',   'MASS_N3'),
            ('VSI843',          '10% ≤ ... < 20%',     'VSI',  'MASS_N3'),
            ('MSI701',          '20% ≤ ...',            'MSI',  'MASS_N3'),
            ('SI923',           '5% ≤ ... < 15%',      'SI',   'MASS_N2'),
            ('VSI844',          '15% ≤ ... < 25%',     'VSI',  'MASS_N2'),
            ('MSI702',          '25% ≤ ...',            'MSI',  'MASS_N2'),
            ('SI924',           '2% < ... < 20%',      'SI',   'PIKKUS'),
            ('VSI845',          '20% ≤ ...',            'VSI',  'PIKKUS'),
            ('SI925',           '2,65 ≤ ... < 3,10 m', 'SI',   'LAIUS'),
            ('VSI846',          '3,10 m ≤ ...',         'VSI',  'LAIUS'),
            ('KORGUS_01',       'Ei vasta nõuetele',   NULL,   'KORGUS'),
            ('TELJEKOORMUS_01', 'Ei vasta nõuetele',   NULL,   'TELJEKOORMUS')
        ) AS t(code, name, severity, parent_code)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                v_rec.severity, v_created_by);
        END LOOP;

    END IF;
END $$;

COMMIT;
