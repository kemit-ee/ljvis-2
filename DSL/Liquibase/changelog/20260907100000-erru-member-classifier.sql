-- liquibase formatted sql
-- changeset ljvis:20260907100000 splitStatements:false
--
-- Lisab uue klassifikaatori 'ERRU_MEMBER'.

DO $$
DECLARE
v_key BIGINT;
    v_val RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ERRU_MEMBER') THEN
        RAISE NOTICE 'ERRU_MEMBER already exists, skipping';
        RETURN;
END IF;

INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (nextval('classifier.seq_classifier_key'), 'ERRU_MEMBER',
        'ERRU liikmete klassifikaator',
        'ERRU liikmesriigid - Euroopa Liidu elektrooniline andmevahetussüsteem, mis ühendab liikmesriikide maanteeveoettevõtjate riiklikke registreid.',
        'ljvis2')
    RETURNING classifier_key INTO v_key;

FOR v_val IN
SELECT * FROM (VALUES
                   ('AT', 'Austria'   ),
                   ('BE', 'Belgia'    ),
                   ('BG', 'Bulgaaria' ),
                   ('HR', 'Horvaatia' ),
                   ('CY', 'Küpros'    ),
                   ('CZ', 'Tšehhi'    ),
                   ('DE', 'Saksamaa'  ),
                   ('DK', 'Taani'     ),
                   ('EE', 'Eesti'     ),
                   ('ES', 'Hispaania' ),
                   ('FI', 'Soome'     ),
                   ('FR', 'Prantsusmaa'),
                   ('GR', 'Kreeka'    ),
                   ('HU', 'Ungari'    ),
                   ('IE', 'Iirimaa'   ),
                   ('IT', 'Itaalia'   ),
                   ('LT', 'Leedu'     ),
                   ('LU', 'Luksemburg'),
                   ('LV', 'Läti'      ),
                   ('MT', 'Malta'     ),
                   ('NL', 'Holland'   ),
                   ('PL', 'Poola'     ),
                   ('PT', 'Portugal'  ),
                   ('RO', 'Rumeenia'  ),
                   ('SE', 'Rootsi'    ),
                   ('SI', 'Sloveenia' ),
                   ('SK', 'Slovakkia' )
              ) AS t(code, name)
    LOOP
INSERT INTO classifier.classifier_value
(classifier_value_key, classifier_key, code, name, valid_from, created_by)
VALUES (nextval('classifier.seq_classifier_value_key'), v_key,
    v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
END LOOP;
END $$;