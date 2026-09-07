-- liquibase formatted sql
-- changeset ljvis:20260907140000-rollback ignore:true splitStatements:false
--
-- Rollback 20260907140000: taastab ADR_CONTROL_CHECKPOINT tase-2 nimed
-- migratsiooni 20260903120000 algsele kujule ('<nr> – <kirjeldus> (<raskusaste>)').

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_rec     RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'ADR_CONTROL_CHECKPOINT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT code,
                   nr || ' – ' || descr || ' (' || severity || ')' AS name
            FROM (VALUES
                ('RL11_P12', 11, 'VSI', 'Veetava aine kohta puudub rikkumise raskusastme määramiseks vajalik teave'),
                ('RL24_P13', 24, 'SI',  'ADR nõuetele vastavad kirjalikud juhised puuduvad või ei vasta veetavatele kaupadele'),
                ('RL06_P14',  6, 'VSI', 'Vedu toimub sõidukiga, millel puudub nõutav heakskiidutunnistus'),
                ('RL12_P15', 12, 'VSI', 'Juhil puudub kehtiv ADR koolitustunnistus'),
                ('RL01_P16',  1, 'MSI', 'Veetakse ohtlikku kaupa, mille vedu on keelatud'),
                ('RL02_P17',  2, 'MSI', 'Keelatud või heakskiitmata mahuti/veovahend ja oht tingib sõiduki immobiliseerimise'),
                ('RL04_P17',  4, 'VSI', 'Ohtliku aine leke'),
                ('RL10_P17', 10, 'VSI', 'Veoühikus lubatud koguse piirangut või lubatud täiteastet on ületatud'),
                ('RL20_P17', 20, 'SI',  'Kahjustatud pakendi, IBC, suurpakendi või kahjustatud puhastamata tühja pakendi vedu'),
                ('RL22_P17', 22, 'SI',  'Paak või paakkonteiner (sh tühi puhastamata) ei ole nõuetekohaselt suletud'),
                ('RL05_P18',  5, 'VSI', 'Puistlasti vedu konstruktsiooniliselt mittekorras konteineris'),
                ('RL21_P18', 21, 'SI',  'Pakendatud kaupade vedu konstruktsiooniliselt mittekorras konteineris'),
                ('RL09_P19',  9, 'VSI', 'Pakendite kooslaadimise nõudeid ei ole järgitud'),
                ('RL10_P19', 10, 'VSI', 'Veoühikus lubatud koguse piirangut või lubatud täiteastet on ületatud'),
                ('RL08_P20',  8, 'VSI', 'Veose kinnitamise ja paigutamise nõudeid ei ole järgitud'),
                ('RL23_P21', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('RL23_P22', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('RL03_P23',  3, 'MSI', 'Ohtlik kaup ei ole sõidukil ohtliku kaubana identifitseeritud ning oht tingib immobiliseerimise'),
                ('RL23_P23', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('RL07_P24',  7, 'VSI', 'Sõiduk ei vasta enam heakskiitmise nõuetele ja kujutab endast vahetut ohtu'),
                ('RL17_P24', 17, 'SI',  'Sõiduk ei vasta enam heakskiitmise nõuetele, kuid ei kujuta endast vahetut ohtu'),
                ('RL18_P25', 18, 'SI',  'Sõidukis puuduvad nõutavad töökorras tulekustutid'),
                ('RL19_P25', 19, 'SI',  'Sõidukis puudub ADRi või kirjalike juhiste kohaselt nõutav muu varustus'),
                ('RL13_P27', 13, 'VSI', 'Kasutatakse tuld või kaitsmata leeki'),
                ('RL14_P27', 14, 'VSI', 'Suitsetamiskeelust ei peeta kinni'),
                ('RL15_P27', 15, 'SI',  'Sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud'),
                ('RL16_P27', 16, 'SI',  'Veoühik sisaldab rohkem kui ühte haagist/poolhaagist')
            ) AS t(code, nr, severity, descr)
        LOOP
            UPDATE classifier.classifier_value
               SET name = v_rec.name
             WHERE classifier_key = v_clf_key
               AND code           = v_rec.code
               AND parent_key IS NOT NULL;
        END LOOP;
    END $$;
