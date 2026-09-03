-- liquibase formatted sql
-- changeset ljvis:20260903120000 ignore:true splitStatements:false
--
-- ADR_CONTROL_CHECKPOINT — ohtliku veose (ADR) kontrollvormi rikkumiste ploki
-- klassifikaator (LJVIS2 #229, epic #228). Kliimaministri määruse (RT I,
-- 16.06.2026, 11) lisa 1 kohaselt on rikkumiste plokk struktureeritud
-- kontrollkaardi punktide 12-27 kaupa.
--
--   Tase 1 = kontrollkaardi punkt (code P12..P27, name = kontrollitav valdkond,
--            description = ADR-viide sulgudes kuvamiseks).
--   Tase 2 = selle punktiga seotud komisjoni määruse (EL) 2016/403 I lisa
--            jaotise 9 rikkumisliik. Sama rikkumisliik võib olla seotud mitme
--            punktiga (nt 10 -> P17 ja P19; 23 -> P21/P22/P23), seega ei ole
--            tase-2 kood kordumatu 2016/403 numbrina -> code = 'RL<nr>_<Pnn>'.
--            name algab 2016/403 numbriga; description = raskusaste (MSI/VSI/SI).
--            Vormil salvestatakse rikkumiskirje JSONB-s reg2016403Code = numbriline
--            osa koodist ja reg2016403Severity = description (tuletatud).
--
-- Allikas: "Kontrollkaardi ridade 12-27 seosed määruse 2016-403 rikkumisliikidega"
-- (Priit Tuuna, koos määruse lisa 1 sõnastusega).
--
-- Idempotentne: kui klassifikaator on juba olemas, jäetakse vahele.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ADR_CONTROL_CHECKPOINT') THEN
            RAISE NOTICE 'ADR_CONTROL_CHECKPOINT already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ADR_CONTROL_CHECKPOINT',
                   'ADR kontrollkaardi punktid',
                   'Ohtliku veose (ADR) kontrollvormi rikkumiste plokk — kontrollkaardi punktid 12-27 (tase 1) ja nendega seotud komisjoni määruse (EL) 2016/403 I lisa jaotise 9 rikkumisliigid (tase 2).',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        -- ── Tase 1: kontrollkaardi punktid P12..P27 ──────────────────────────
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('P12', 'Veodokumendid',                                                              NULL),
                ('P13', 'Kirjalikud juhised',                                                         NULL),
                ('P14', 'Sõiduki heakskiitmise nõuetele vastavus',                                    NULL),
                ('P15', 'Juhi koolitustunnistus ja isikut tõendav dokument',                          NULL),
                ('P16', 'Kauba vedamiseks lubatavus',                                                 NULL),
                ('P17', 'Mahuteid käsitlevad sätted',                                                 'ADR 4.1–4.7'),
                ('P18', 'Veole esitatavad nõuded',                                                    'ADR 7.1–7.4'),
                ('P19', 'Kooslaadimise keeld ja kogusepiirangud',                                     NULL),
                ('P20', 'Käitlemine ja veose paigutamine/kinnitamine',                                NULL),
                ('P21', 'Pakendi, paagi või puistlasti tehniline märgistus',                          'ADR osa 6'),
                ('P22', 'Pakendite märgistamine ja ohumärgised',                                      'ADR osa 5'),
                ('P23', 'Ohusildid, oranžid tahvlid ja muud tähised sõidukil/paagil',                 NULL),
                ('P24', 'Sõidukile esitatavad nõuded',                                                'ADR osa 9'),
                ('P25', 'Üld- ja erivarustus',                                                        'ADR 8.1.4, 8.1.5'),
                ('P26', 'Kahe-/mitmepoolsed kokkulepped, riigisisesed sätted, pädeva asutuse load',   NULL),
                ('P27', 'Muud rikkumised',                                                            NULL)
            ) AS t(code, name, adr_ref)
        LOOP
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key,
                    v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.adr_ref, v_created_by);
        END LOOP;

        -- ── Tase 2: 2016/403 rikkumisliigid punkti kaupa ────────────────────
        -- parent_code = kontrollkaardi punkt; nr = 2016/403 rikkumisliigi number;
        -- name = "<nr> – <kirjeldus> (<raskusaste>)"; description = raskusaste.
        FOR v_rec IN
            SELECT parent_code, nr, severity,
                   'RL' || LPAD(nr::text, 2, '0') || '_' || parent_code AS code,
                   nr || ' – ' || descr || ' (' || severity || ')'      AS name
            FROM (VALUES
                ('P12', 11, 'VSI', 'Veetava aine kohta puudub rikkumise raskusastme määramiseks vajalik teave'),
                ('P13', 24, 'SI',  'ADR nõuetele vastavad kirjalikud juhised puuduvad või ei vasta veetavatele kaupadele'),
                ('P14',  6, 'VSI', 'Vedu toimub sõidukiga, millel puudub nõutav heakskiidutunnistus'),
                ('P15', 12, 'VSI', 'Juhil puudub kehtiv ADR koolitustunnistus'),
                ('P16',  1, 'MSI', 'Veetakse ohtlikku kaupa, mille vedu on keelatud'),
                ('P17',  2, 'MSI', 'Keelatud või heakskiitmata mahuti/veovahend ja oht tingib sõiduki immobiliseerimise'),
                ('P17',  4, 'VSI', 'Ohtliku aine leke'),
                ('P17', 10, 'VSI', 'Veoühikus lubatud koguse piirangut või lubatud täiteastet on ületatud'),
                ('P17', 20, 'SI',  'Kahjustatud pakendi, IBC, suurpakendi või kahjustatud puhastamata tühja pakendi vedu'),
                ('P17', 22, 'SI',  'Paak või paakkonteiner (sh tühi puhastamata) ei ole nõuetekohaselt suletud'),
                ('P18',  5, 'VSI', 'Puistlasti vedu konstruktsiooniliselt mittekorras konteineris'),
                ('P18', 21, 'SI',  'Pakendatud kaupade vedu konstruktsiooniliselt mittekorras konteineris'),
                ('P19',  9, 'VSI', 'Pakendite kooslaadimise nõudeid ei ole järgitud'),
                ('P19', 10, 'VSI', 'Veoühikus lubatud koguse piirangut või lubatud täiteastet on ületatud'),
                ('P20',  8, 'VSI', 'Veose kinnitamise ja paigutamise nõudeid ei ole järgitud'),
                ('P21', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('P22', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('P23',  3, 'MSI', 'Ohtlik kaup ei ole sõidukil ohtliku kaubana identifitseeritud ning oht tingib immobiliseerimise'),
                ('P23', 23, 'SI',  'Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil'),
                ('P24',  7, 'VSI', 'Sõiduk ei vasta enam heakskiitmise nõuetele ja kujutab endast vahetut ohtu'),
                ('P24', 17, 'SI',  'Sõiduk ei vasta enam heakskiitmise nõuetele, kuid ei kujuta endast vahetut ohtu'),
                ('P25', 18, 'SI',  'Sõidukis puuduvad nõutavad töökorras tulekustutid'),
                ('P25', 19, 'SI',  'Sõidukis puudub ADRi või kirjalike juhiste kohaselt nõutav muu varustus'),
                ('P27', 13, 'VSI', 'Kasutatakse tuld või kaitsmata leeki'),
                ('P27', 14, 'VSI', 'Suitsetamiskeelust ei peeta kinni'),
                ('P27', 15, 'SI',  'Sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud'),
                ('P27', 16, 'SI',  'Veoühik sisaldab rohkem kui ühte haagist/poolhaagist')
            ) AS t(parent_code, nr, severity, descr)
        LOOP
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (
                       nextval('classifier.seq_classifier_value_key'),
                       v_clf_key,
                       v_rec.code,
                       v_rec.name,
                       CURRENT_DATE,
                       NULL,
                       (SELECT classifier_value_key
                          FROM classifier.classifier_value
                         WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
                         ORDER BY created_at DESC LIMIT 1),
                       v_rec.severity,
                       v_created_by
                   );
        END LOOP;
    END $$;
