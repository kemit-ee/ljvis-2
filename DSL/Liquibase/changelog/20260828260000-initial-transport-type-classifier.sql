-- liquibase formatted sql
-- changeset ljvis:20260828260000 splitStatements:false
--
-- TRANSPORT_TYPE — transpordiliikide klassifikaator Tööinspektsiooni kontrollakti
-- "Kontrollimised" maatriksi ridade jaoks (LJVIS-75).
-- Idempotentne: kui klassifikaator juba eksisteerib, jäetakse INSERT vahele.

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
