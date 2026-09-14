-- liquibase formatted sql
-- changeset ljvis:20260912120000-rollback ignore:true splitStatements:false
DROP FUNCTION IF EXISTS forms.derive_sp_erru_points(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);

DO $$
DECLARE
    v_classifier_key BIGINT;
    v_parent_key BIGINT;
    v_row RECORD;
BEGIN
    SELECT classifier_key INTO v_classifier_key
      FROM classifier.classifier
     WHERE code = 'DRIVING_VIOLATION'
     ORDER BY created_at DESC LIMIT 1;

    UPDATE classifier.classifier_value
       SET name = 'Lepinguliste võlasuhete suhtes kohaldatav õigus'
     WHERE classifier_key = v_classifier_key AND code = 'ROOMA_I';
    UPDATE classifier.classifier_value
       SET name = 'Autojuhi lähetamise nõuded'
     WHERE classifier_key = v_classifier_key AND code = 'LAHETAMINE';

    FOR v_row IN SELECT * FROM (VALUES
        ('ROOMA_I_01',    'ROOMA_I_01_MI',    'MSI'),
        ('LAHETAMINE_01', 'LAHETAMINE_01_MI', 'SI'),
        ('LAHETAMINE_02', 'LAHETAMINE_02_MI', 'SI'),
        ('LAHETAMINE_03', 'LAHETAMINE_03_MI', 'MSI'),
        ('LAHETAMINE_04', 'LAHETAMINE_04_MI', 'MSI'),
        ('LAHETAMINE_05', 'LAHETAMINE_05_MI', 'MSI'),
        ('LAHETAMINE_06', 'LAHETAMINE_06_MI', 'SI'),
        ('LAHETAMINE_07', 'LAHETAMINE_07_MI', 'SI')
    ) AS t(parent_code, old_code, old_severity)
    LOOP
        SELECT classifier_value_key INTO v_parent_key
          FROM classifier.classifier_value
         WHERE classifier_key = v_classifier_key AND code = v_row.parent_code
         ORDER BY created_at DESC LIMIT 1;
        UPDATE classifier.classifier_value
           SET code = v_row.old_code,
               name = 'MI',
               description = v_row.old_severity
         WHERE classifier_key = v_classifier_key AND parent_key = v_parent_key;
    END LOOP;
END $$;
