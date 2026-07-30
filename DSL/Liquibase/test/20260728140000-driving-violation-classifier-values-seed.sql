-- liquibase formatted sql
-- changeset ljvis:20260728140000 ignore:true splitStatements:false
--
-- Test/dev-only seed for the Labour Inspectorate control act (LJVIS-75).
--
-- NOTE: DRIVING_VIOLATION classifier (3-level hierarchy used by the "Rikkumised" block)
-- is seeded by 20260630100002-form-classifier-data.sql which was introduced in LJVIS-71
-- and is already present in dev/CI. This file must NOT re-insert it — doing so would
-- create a duplicate classifier entry. The curated subset of DRIVING_VIOLATION values
-- shown in the TI form UI is filtered client-side (see ViolationPickerModal) using the
-- Level-1 codes and Level-2 article-reference names defined in the LJVIS-75 spec §4.
--
-- This changeset adds only the classifier that is new to LJVIS-75:
--   TRANSPORT_TYPE — flat 4-value classifier for the "Kontrollimised" matrix rows.

DO $$
DECLARE
    v_transport_type_classifier_key BIGINT;
BEGIN
    -- ── TRANSPORT_TYPE (Transpordiliigid) classifier — flat, 4 values ──────
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TRANSPORT_TYPE') THEN
        RAISE NOTICE 'TRANSPORT_TYPE already exists, skipping';
    ELSE
        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
            nextval('classifier.seq_classifier_key'),
            'TRANSPORT_TYPE',
            'Transpordiliigid',
            'Veoliikide klassifikaator Tööinspektsiooni kontrollakti "Kontrollimised" maatriksi ridade jaoks (LJVIS-75).',
            'ljvis2'
        )
        RETURNING classifier_key INTO v_transport_type_classifier_key;

        INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
        VALUES
            (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'PASSENGER_TRANSPORT',   'Sõitjate vedu',      CURRENT_DATE, 'ljvis2'),
            (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'CARGO_TRANSPORT',       'Veose vedu',         CURRENT_DATE, 'ljvis2'),
            (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'OWN_ACCOUNT_TRANSPORT', 'Oma kulul autovedu', CURRENT_DATE, 'ljvis2'),
            (nextval('classifier.seq_classifier_value_key'), v_transport_type_classifier_key, 'COMMERCIAL_TRANSPORT',  'Tasuline autovedu',  CURRENT_DATE, 'ljvis2');
    END IF;
END $$;
