-- liquibase formatted sql
-- changeset ljvis:20260630100002 ignore:true
-- Seed data

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

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for STRUCTURE_UNIT
        v_rec           RECORD;
    BEGIN

        -- ============================================================
        -- 1. Classifier header (ljvis2.classifier)
        -- ============================================================

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'STRUCTURE_UNIT',
                   'Struktuuriüksus',
                   'Organisatsioonide struktuuriüksuste klassifikaator',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('PPA_LOUNA', 'Lõuna prefektuur',    'PPA'),
                               ('PPA_IDA',   'Ida prefektuur',      'PPA'),
                               ('PPA_LAANE', 'Lääne prefektuur',    'PPA'),
                               ('PPA_POHJA', 'Põhja prefektuur',    'PPA'),
                               ('KLIM_HQ',  'Kliimaministeerium',   'KLIM'),
                               ('TRAM_HQ',  'Transpordiamet',       'TRAM')
                          ) AS t(code, name, org_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, description, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           v_rec.org_code,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'EU_INFRINGEMENT',
                   'EL rikkumised (EÜ) nr 1071/2009',
                   'EL määrusest (EÜ) nr 1071/2009 tuleneva kõige raskema rikkumise klassifikaator',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
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

        FOR v_rec IN
            SELECT * FROM (VALUES
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

        FOR v_rec IN
            SELECT * FROM (VALUES
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

        FOR v_rec IN
            SELECT * FROM (VALUES
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
                               ('SI939', 'sõidukijuht või vedaja ei esita kehtivat juhitunnistust või kehtiva juhitunnistuse kinnitatud ärakirja kontrollivale ametnikule', 'SI'),
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

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for EHAK
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'EHAK', 'EHAK', 'Eesti haldus- ja asustusjaotuse klassifikaator (2024v1) — maakonnad, linnad ja vallad', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('0037', 'Harju maakond'),
                               ('0039', 'Hiiu maakond'),
                               ('0045', 'Ida-Viru maakond'),
                               ('0050', 'Jõgeva maakond'),
                               ('0052', 'Järva maakond'),
                               ('0056', 'Lääne maakond'),
                               ('0060', 'Lääne-Viru maakond'),
                               ('0064', 'Põlva maakond'),
                               ('0068', 'Pärnu maakond'),
                               ('0071', 'Rapla maakond'),
                               ('0074', 'Saare maakond'),
                               ('0079', 'Tartu maakond'),
                               ('0081', 'Valga maakond'),
                               ('0084', 'Viljandi maakond'),
                               ('0087', 'Võru maakond')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Harju maakond (0037)
                               ('0141', 'Anija vald',           '0037'),
                               ('0198', 'Harku vald',           '0037'),
                               ('0245', 'Jõelähtme vald',       '0037'),
                               ('0296', 'Keila linn',           '0037'),
                               ('0305', 'Kiili vald',           '0037'),
                               ('0338', 'Kose vald',            '0037'),
                               ('0353', 'Kuusalu vald',         '0037'),
                               ('0424', 'Loksa linn',           '0037'),
                               ('0431', 'Lääne-Harju vald',     '0037'),
                               ('0446', 'Maardu linn',          '0037'),
                               ('0651', 'Raasiku vald',         '0037'),
                               ('0653', 'Rae vald',             '0037'),
                               ('0719', 'Saku vald',            '0037'),
                               ('0725', 'Saue vald',            '0037'),
                               ('0784', 'Tallinn',              '0037'),
                               ('0890', 'Viimsi vald',          '0037'),
                               -- Hiiu maakond (0039)
                               ('0205', 'Hiiumaa vald',         '0039'),
                               -- Ida-Viru maakond (0045)
                               ('0130', 'Alutaguse vald',       '0045'),
                               ('0251', 'Jõhvi vald',           '0045'),
                               ('0321', 'Kohtla-Järve linn',    '0045'),
                               ('0442', 'Lüganuse vald',        '0045'),
                               ('0511', 'Narva linn',           '0045'),
                               ('0515', 'Narva-Jõesuu linn',    '0045'),
                               ('0736', 'Sillamäe linn',        '0045'),
                               ('0803', 'Toila vald',           '0045'),
                               -- Jõgeva maakond (0050)
                               ('0247', 'Jõgeva vald',          '0050'),
                               ('0486', 'Mustvee vald',         '0050'),
                               ('0618', 'Põltsamaa vald',       '0050'),
                               -- Järva maakond (0052)
                               ('0255', 'Järva vald',           '0052'),
                               ('0567', 'Paide linn',           '0052'),
                               ('0834', 'Türi vald',            '0052'),
                               -- Lääne maakond (0056)
                               ('0184', 'Haapsalu linn',        '0056'),
                               ('0441', 'Lääne-Nigula vald',    '0056'),
                               ('0907', 'Vormsi vald',          '0056'),
                               -- Lääne-Viru maakond (0060)
                               ('0191', 'Haljala vald',         '0060'),
                               ('0272', 'Kadrina vald',         '0060'),
                               ('0661', 'Rakvere vald',         '0060'),
                               ('0663', 'Rakvere linn',         '0060'),
                               ('0792', 'Tapa vald',            '0060'),
                               ('0901', 'Vinni vald',           '0060'),
                               ('0903', 'Viru-Nigula vald',     '0060'),
                               ('0928', 'Väike-Maarja vald',    '0060'),
                               -- Põlva maakond (0064)
                               ('0284', 'Kanepi vald',          '0064'),
                               ('0622', 'Põlva vald',           '0064'),
                               ('0708', 'Räpina vald',          '0064'),
                               -- Pärnu maakond (0068)
                               ('0214', 'Häädemeeste vald',     '0068'),
                               ('0303', 'Kihnu vald',           '0068'),
                               ('0430', 'Lääneranna vald',      '0068'),
                               ('0624', 'Pärnu linn',           '0068'),
                               ('0638', 'Põhja-Pärnumaa vald',  '0068'),
                               ('0712', 'Saarde vald',          '0068'),
                               ('0809', 'Tori vald',            '0068'),
                               -- Rapla maakond (0071)
                               ('0293', 'Kehtna vald',          '0071'),
                               ('0317', 'Kohila vald',          '0071'),
                               ('0502', 'Märjamaa vald',        '0071'),
                               ('0668', 'Rapla vald',           '0071'),
                               -- Saare maakond (0074)
                               ('0478', 'Muhu vald',            '0074'),
                               ('0689', 'Ruhnu vald',           '0074'),
                               ('0714', 'Saaremaa vald',        '0074'),
                               -- Tartu maakond (0079)
                               ('0171', 'Elva vald',            '0079'),
                               ('0283', 'Kambja vald',          '0079'),
                               ('0291', 'Kastre vald',          '0079'),
                               ('0432', 'Luunja vald',          '0079'),
                               ('0528', 'Nõo vald',             '0079'),
                               ('0586', 'Peipsiääre vald',      '0079'),
                               ('0793', 'Tartu linn',           '0079'),
                               ('0796', 'Tartu vald',           '0079'),
                               -- Valga maakond (0081)
                               ('0557', 'Otepää vald',          '0081'),
                               ('0824', 'Tõrva vald',           '0081'),
                               ('0857', 'Valga vald',           '0081'),
                               -- Viljandi maakond (0084)
                               ('0480', 'Mulgi vald',           '0084'),
                               ('0615', 'Põhja-Sakala vald',    '0084'),
                               ('0897', 'Viljandi linn',        '0084'),
                               ('0899', 'Viljandi vald',        '0084'),
                               -- Võru maakond (0087)
                               ('0145', 'Antsla vald',          '0087'),
                               ('0698', 'Rõuge vald',           '0087'),
                               ('0732', 'Setomaa vald',         '0087'),
                               ('0917', 'Võru vald',            '0087'),
                               ('0919', 'Võru linn',            '0087')
                          ) AS t(code, name, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                    (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                    v_created_by);
            END LOOP;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for ROAD_NAME
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ROAD_NAME',
                   'Maantee nimi',
                   'Põhimaanteede nimede klassifikaator (KLIM määrus nr 48)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('tallinna_narva',                       'TALLINNA–NARVA TEE (TEE NR 1)'),
                               ('tallinna_tartu_voru_luhamaa',           'TALLINNA–TARTU–VÕRU–LUHAMAA TEE (TEE NR 2)'),
                               ('johvi_tartu_valga',                     'JÕHVI–TARTU–VALGA TEE (TEE NR 3)'),
                               ('tallinna_parnu_ikla',                   'TALLINNA–PÄRNU–IKLA TEE (TEE NR 4)'),
                               ('parnu_paide_rakvere',                   'PÄRNU–PAIDE–RAKVERE TEE (TEE NR 5)'),
                               ('valga_uulu',                            'VALGA–UULU TEE (TEE NR 6)'),
                               ('riia_pihkva',                           'RIIA–PIHKVA TEE (TEE NR 7)'),
                               ('tallinna_paldiski',                     'TALLINNA–PALDISKI TEE (TEE NR 8)'),
                               ('aasmae_haapsalu_rohukula',              'ÄÄSMÄE–HAAPSALU–ROHUKÜLA TEE (TEE NR 9)'),
                               ('risti_virtsu_kuivastu_kuressaare',      'RISTI–VIRTSU–KUIVASTU–KURESSAARE TEE (TEE NR 10)'),
                               ('tallinna_ringtee',                      'TALLINNA RINGTEE (TEE NR 11)'),
                               ('tartu_viljandi_kilingi_nomme',          'TARTU–VILJANDI–KILINGI-NÕMME TEE (TEE NR 92)'),
                               ('muu_tee',                               'MUU TEE')
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
        v_clf_key       BIGINT;       -- classifier_key for TRAILER_CATEGORY
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'TRAILER_CATEGORY',
                   'Haagise kategooria',
                   'Haagise kategooriate klassifikaator (kontrollvormid 2012)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('C_2012',     '(c) O3 (3,5-10t)'),
                               ('D_2012',     '(d) O4 (üle 10t)'),
                               ('OTHER_2012', '(m) Muu')
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
        v_clf_key       BIGINT;       -- classifier_key for VEHICLE_CATEGORY
        v_rec           RECORD;
    BEGIN

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'VEHICLE_CATEGORY',
                   'Mootorsõiduki kategooria',
                   'Mootorsõiduki kategooriate klassifikaator (kontrollvormid 2012)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('A_2012',     '(a) N2 (3,5 – 12 t)'),
                               ('B_2012',     '(b) N3 (üle 12 t)'),
                               ('E_2012',     '(e) M2 (rohkem kui 9 istekohta kuni 5t)'),
                               ('F_2012',     '(f) M3 (rohkem kui 9 istekohta rohkem kui 5t)'),
                               ('G3_2012',    '(g) T1b'),
                               ('H2_2012',    '(h) T2b'),
                               ('I_2012',     '(i) T3b'),
                               ('J_2012',     '(j) T4.1b'),
                               ('K_2012',     '(k) T4.2b'),
                               ('L_2012',     '(l) T4.3b'),
                               ('OTHER_2012', '(m) Muu')
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