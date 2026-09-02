-- liquibase formatted sql
-- changeset ljvis:20260901120000 ignore:true splitStatements:false
--
-- DANGEROUS_GOODS_INFRINGEMENTS_NEW — uus 2-tasemeline klassifikaator ohtliku
-- veose (ADR) kontrollvormi rikkumiste loendi jaoks. Frontend juba viitab
-- sellele (AdrInfringementsSection / getByCode('DANGEROUS_GOODS_INFRINGEMENTS_NEW')),
-- kuid klassifikaatorit ei ole varem baasi kirjutatud, mistõttu ADR-vormi
-- rikkumiste loend on tühi.
--
-- Allikas: komisjoni määruse (EL) 2016/403 I lisa jaotis 9 (direktiiv
-- 2008/68/EÜ), konsolideeritud redaktsioon 02016R0403-20220523. 24 rida,
-- 3 rühma raskusastme järgi (tase 1). Tase-2 kirje `description` = raskusaste.
--
-- Idempotentne: kui klassifikaator on juba olemas, jäetakse vahele.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW') THEN
            RAISE NOTICE 'DANGEROUS_GOODS_INFRINGEMENTS_NEW already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'DANGEROUS_GOODS_INFRINGEMENTS_NEW',
                   'ADR rikkumised',
                   'Ohtliku veose (ADR) kontrollvormi rikkumiste loend — komisjoni määruse (EL) 2016/403 I lisa jaotis 9 (direktiiv 2008/68/EÜ)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        -- Tase 1: rühmad raskusastme järgi
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('ADR_1_MSI', 'Kõige raskem rikkumine (MSI)'),
                ('ADR_2_VSI', 'Väga tõsine rikkumine (VSI)'),
                ('ADR_3_SI',  'Tõsine rikkumine (SI)')
            ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, NULL, v_created_by);
        END LOOP;

        -- Tase 2: rikkumised (parent_code = rühm; description = raskusaste)
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('ADR_01', 'Selliste ohtlike kaupade vedu, mille vedamine on keelatud',                                        'MSI', 'ADR_1_MSI'),
                ('ADR_02', 'Ohtlike kaupade vedu keelatud või tunnustamata kaitsemahutites',                                    'MSI', 'ADR_1_MSI'),
                ('ADR_03', 'Ohtlike kaupade vedu ilma neid kaupu sõidukis ohtlike kaupadena tuvastamata',                       'MSI', 'ADR_1_MSI'),
                ('ADR_07', 'Sõiduk ei vasta enam vastavusstandarditele ja kujutab otsest ohtu',                                 'MSI', 'ADR_1_MSI'),
                ('ADR_04', 'Ohtlike ainete lekkimine',                                                                         'VSI', 'ADR_2_VSI'),
                ('ADR_05', 'Lahtiseks veoks kasutatakse mahutit, mille ehitus ei ole sobiv',                                    'VSI', 'ADR_2_VSI'),
                ('ADR_06', 'Vedu toimub sõidukiga, millel puudub nõuetekohane vastavustunnistus',                               'VSI', 'ADR_2_VSI'),
                ('ADR_12', 'Juhil puudub kehtiv kutsealase ettevalmistuse tunnistus',                                           'VSI', 'ADR_2_VSI'),
                ('ADR_13', 'Kasutatakse tuld või lahtist leeki',                                                                'VSI', 'ADR_2_VSI'),
                ('ADR_08', 'Ei ole kinni peetud veose kinnitus- ja paigutusnormidest',                                          'SI',  'ADR_3_SI'),
                ('ADR_09', 'Ei ole järgitud pakendite kooslaadimisele seatud norme',                                            'SI',  'ADR_3_SI'),
                ('ADR_10', 'Ei ole järgitud ühe veoühikuga veetavate koguste piiranguid',                                       'SI',  'ADR_3_SI'),
                ('ADR_11', 'Veetava aine kohta puudub teave, mis võimaldaks kindlaks teha rikkumise raskusastet',               'SI',  'ADR_3_SI'),
                ('ADR_14', 'Ei peeta kinni suitsetamiskeelust',                                                                 'SI',  'ADR_3_SI'),
                ('ADR_15', 'Sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud',                                'SI',  'ADR_3_SI'),
                ('ADR_16', 'Veoühik sisaldab enam kui ühte haagist/poolhaagist',                                                'SI',  'ADR_3_SI'),
                ('ADR_17', 'Sõiduk ei vasta enam vastavusstandarditele, kuid ei kujuta otsest ohtu',                            'SI',  'ADR_3_SI'),
                ('ADR_18', 'Sõidukil puuduvad nõuetekohased töökorras tulekustutid',                                            'SI',  'ADR_3_SI'),
                ('ADR_19', 'Sõidukil puudub ADRi või kirjaliku juhendiga ettenähtud varustus',                                  'SI',  'ADR_3_SI'),
                ('ADR_20', 'Katkise pakendiga, mahtlastikonteineritega või suurpakenditega pakkide vedamine',                   'SI',  'ADR_3_SI'),
                ('ADR_21', 'Pakendatud kaupade veoks kasutatakse sobimatu ehitusega mahutit',                                   'SI',  'ADR_3_SI'),
                ('ADR_22', 'Mahutid/paakmahutid on nõuetekohaselt sulgemata',                                                   'SI',  'ADR_3_SI'),
                ('ADR_23', 'Sõiduki ja/või mahuti etiketid, märgistused või sildid on ebaõiged',                                'SI',  'ADR_3_SI'),
                ('ADR_24', 'Puudub ADRi kohane kirjalik juhend või juhend ei vasta veetavatele kaupadele',                      'SI',  'ADR_3_SI')
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
