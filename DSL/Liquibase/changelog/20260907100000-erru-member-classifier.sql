-- liquibase formatted sql
-- changeset ljvis:20260907100000 splitStatements:false
--
-- Seab COUNTRY klassifikaatori 27 EL liikmesriigi väärtustele description = 'ERRU_MEMBER'.

DO $$
DECLARE
    v_country_key BIGINT;
BEGIN
    SELECT c.classifier_key INTO v_country_key
    FROM classifier.classifier c
    WHERE c.code = 'COUNTRY';

    IF NOT FOUND THEN
        RAISE NOTICE 'COUNTRY classifier not found, skipping';
        RETURN;
    END IF;

    UPDATE classifier.classifier_value
    SET description = 'ERRU_MEMBER'
    WHERE classifier_key = v_country_key
      AND code IN ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
                   'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
                   'PL','PT','RO','SK','SI','ES','SE');
END $$;


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