-- liquibase formatted sql
-- changeset ljvis:20260907120000-rollback ignore:true splitStatements:false
--
-- Rollback 20260907120000: taastab ADR_CONTROL_CHECKPOINT tase-1 pealkirjad
-- ja ADR-viited migratsiooni 20260903120000 algsele kujule.

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
            SELECT * FROM (VALUES
                ('P12', 'Veodokumendid',                                                            NULL),
                ('P13', 'Kirjalikud juhised',                                                       NULL),
                ('P14', 'Sõiduki heakskiitmise nõuetele vastavus',                                  NULL),
                ('P15', 'Juhi koolitustunnistus ja isikut tõendav dokument',                        NULL),
                ('P16', 'Kauba vedamiseks lubatavus',                                               NULL),
                ('P17', 'Mahuteid käsitlevad sätted',                                               'ADR 4.1–4.7'),
                ('P18', 'Veole esitatavad nõuded',                                                  'ADR 7.1–7.4'),
                ('P19', 'Kooslaadimise keeld ja kogusepiirangud',                                   NULL),
                ('P20', 'Käitlemine ja veose paigutamine/kinnitamine',                              NULL),
                ('P21', 'Pakendi, paagi või puistlasti tehniline märgistus',                        'ADR osa 6'),
                ('P22', 'Pakendite märgistamine ja ohumärgised',                                    'ADR osa 5'),
                ('P23', 'Ohusildid, oranžid tahvlid ja muud tähised sõidukil/paagil',               NULL),
                ('P24', 'Sõidukile esitatavad nõuded',                                              'ADR osa 9'),
                ('P25', 'Üld- ja erivarustus',                                                      'ADR 8.1.4, 8.1.5'),
                ('P26', 'Kahe-/mitmepoolsed kokkulepped, riigisisesed sätted, pädeva asutuse load', NULL),
                ('P27', 'Muud rikkumised',                                                          NULL)
            ) AS t(code, name, adr_ref)
        LOOP
            UPDATE classifier.classifier_value
               SET name        = v_rec.name,
                   description  = v_rec.adr_ref
             WHERE classifier_key = v_clf_key
               AND code           = v_rec.code
               AND parent_key IS NULL;
        END LOOP;
    END $$;
