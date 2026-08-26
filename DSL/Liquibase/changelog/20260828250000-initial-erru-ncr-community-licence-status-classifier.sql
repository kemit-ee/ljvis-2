-- liquibase formatted sql
-- changeset ljvis:20260828250000 splitStatements:false
--
-- NCR_COMMUNITY_LICENCE_STATUS — veoettevõtja ühenduse tegevusloa staatus NCR vastuses.
-- Idempotentne: kui klassifikaator juba eksisteerib, jäetakse INSERT vahele.

DO $$
DECLARE
    v_key BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'NCR_COMMUNITY_LICENCE_STATUS') THEN
        RAISE NOTICE 'NCR_COMMUNITY_LICENCE_STATUS already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    VALUES (nextval('classifier.seq_classifier_key'), 'NCR_COMMUNITY_LICENCE_STATUS', 'NCR tegevusloa staatus',
            'Veoettevõtja ühenduse tegevusloa staatus registreerimisriigi registri andmetel (globalCommunityLicenceStatusType). Osa NCR vastuse sisust.', 'ljvis2')
    RETURNING classifier_key INTO v_key;

    INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
    VALUES
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Active',       'Kehtiv',              CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Suspended',    'Peatatud',            CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Withdrawn',    'Kehtetuks tunnistatud', CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Expired',      'Aegunud',             CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'LostOrStolen', 'Kadunud või varastatud', CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Annulled',     'Tühistatud',          CURRENT_DATE, 'ljvis2'),
        (nextval('classifier.seq_classifier_value_key'), v_key, 'Returned',     'Tagastatud',          CURRENT_DATE, 'ljvis2');
END $$;
