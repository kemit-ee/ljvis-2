-- liquibase formatted sql
-- changeset ljvis:20261125100000 ignore:true splitStatements:false
-- Historical fallback identities from the 38 proposals + 4 questions (2026-10-01).
-- These are ORIGINAL EAV KEYS, not newly inferred legal offences or EU codes.
-- Keep separate keys; ETL must retain source IDs, values, type, role and severity.
-- Proven aliases may share an occurrence only with evidence. Do not count this
-- registry as 42 independent offences or export these codes as ERRU codes.
-- Dates are technical availability dates, NOT historical legal applicability.
-- Expired before deployment: visible via classifier lookup, unavailable for new selection.
-- Existing current classifier trees and their severity rules remain unchanged.
-- Rollback tracks exact inserted rows and refuses removal after migration/use or edits.

-- Technical ownership journal for rollback; contains only classifier rows, no form data.
CREATE TABLE IF NOT EXISTS classifier.rollback_20261125100000 (
    kind text NOT NULL CHECK (kind IN ('classifier','value')),
    row_id bigint NOT NULL,
    row_data jsonb NOT NULL,
    PRIMARY KEY(kind,row_id)
);
LOCK TABLE classifier.classifier, classifier.classifier_value IN SHARE ROW EXCLUSIVE MODE;

DO $migration$
DECLARE
    legacy_key bigint;
    key_count integer;
BEGIN
    SELECT count(DISTINCT classifier_key), min(classifier_key)
    INTO key_count, legacy_key
    FROM classifier.classifier WHERE code = 'LJVIS1_OLD_VIOLATION';
    IF key_count > 1 THEN
        RAISE EXCEPTION 'Multiple logical classifiers for LJVIS1_OLD_VIOLATION';
    END IF;
    IF key_count = 0 THEN
        legacy_key := nextval('classifier.seq_classifier_key');
        WITH added AS (INSERT INTO classifier.classifier(classifier_key, code, name, description, created_by)
        VALUES (legacy_key, 'LJVIS1_OLD_VIOLATION', 'LJVIS1 ajaloolised rikkumiskirjed',
                'LJVIS1 algvõtmed kinnitamata standardvastendusega. Ainult ajalooliste vormide jaoks; ei ole uued õiguslikud rikkumiskoodid.',
                'migration-old-classifiers') RETURNING *)
        INSERT INTO classifier.rollback_20261125100000 SELECT 'classifier',id,to_jsonb(added) FROM added;
    END IF;

    WITH added AS (INSERT INTO classifier.classifier_value
        (classifier_value_key, classifier_key, code, name, description,
         valid_from, valid_until, created_by)
    SELECT nextval('classifier.seq_classifier_value_key'), legacy_key,
           seed.code, seed.name, seed.description,
           DATE '2026-09-30', DATE '2026-10-01', 'migration-old-classifiers'
    FROM (VALUES
    ('EOV_V2_TBCP_20_6_2_2', 'LJVIS1 ajalooline kirje: EOV_V2_TBCP_20_6_2_2', 'Algvõti: EOV_V2_TBCP_20_6_2_2. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('MSI201', 'LJVIS1 ajalooline kirje: MSI201', 'Algvõti: MSI201. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('MSI302', 'LJVIS1 ajalooline kirje: MSI302', 'Algvõti: MSI302. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_11_1_2_1', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_11_1_2_1', 'Algvõti: OV_V2_TBCP_11_1_2_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_11_3_2_1', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_11_3_2_1', 'Algvõti: OV_V2_TBCP_11_3_2_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_11_4_2_1', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_11_4_2_1', 'Algvõti: OV_V2_TBCP_11_4_2_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_20_1_1_2_1', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_20_1_1_2_1', 'Algvõti: OV_V2_TBCP_20_1_1_2_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_20_1_2_1_2', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_20_1_2_1_2', 'Algvõti: OV_V2_TBCP_20_1_2_1_2. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('OV_V2_TBCP_20_1_5_1_1', 'LJVIS1 ajalooline kirje: OV_V2_TBCP_20_1_5_1_1', 'Algvõti: OV_V2_TBCP_20_1_5_1_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('SI922', 'LJVIS1 ajalooline kirje: SI922', 'Algvõti: SI922. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('SI925', 'LJVIS1 ajalooline kirje: SI925', 'Algvõti: SI925. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('SI948', 'LJVIS1 ajalooline kirje: SI948', 'Algvõti: SI948. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('SI949', 'LJVIS1 ajalooline kirje: SI949', 'Algvõti: SI949. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VO_V2_TBCP_C', 'LJVIS1 ajalooline kirje: VO_V2_TBCP_C', 'Algvõti: VO_V2_TBCP_C. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI832', 'LJVIS1 ajalooline kirje: VSI832', 'Algvõti: VSI832. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI845', 'LJVIS1 ajalooline kirje: VSI845', 'Algvõti: VSI845. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI865', 'LJVIS1 ajalooline kirje: VSI865', 'Algvõti: VSI865. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI868', 'LJVIS1 ajalooline kirje: VSI868', 'Algvõti: VSI868. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI869', 'LJVIS1 ajalooline kirje: VSI869', 'Algvõti: VSI869. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI871', 'LJVIS1 ajalooline kirje: VSI871', 'Algvõti: VSI871. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('VSI872', 'LJVIS1 ajalooline kirje: VSI872', 'Algvõti: VSI872. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_1', 'LJVIS1 ajalooline kirje: art1_lg11_1', 'Algvõti: art1_lg11_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_1_1', 'LJVIS1 ajalooline kirje: art1_lg11_1_1', 'Algvõti: art1_lg11_1_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_1_2', 'LJVIS1 ajalooline kirje: art1_lg11_1_2', 'Algvõti: art1_lg11_1_2. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_2', 'LJVIS1 ajalooline kirje: art1_lg11_2', 'Algvõti: art1_lg11_2. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_2_3', 'LJVIS1 ajalooline kirje: art1_lg11_2_3', 'Algvõti: art1_lg11_2_3. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg11_3', 'LJVIS1 ajalooline kirje: art1_lg11_3', 'Algvõti: art1_lg11_3. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art1_lg12', 'LJVIS1 ajalooline kirje: art1_lg12', 'Algvõti: art1_lg12. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art34_lg7_1', 'Sõidumeerikusse ei ole sisestatud riigi sümbolit', 'Algvõti: art34_lg7_1. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art36_lg1_art36_lg2_part4_3', 'LJVIS1 ajalooline kirje: art36_lg1_art36_lg2_part4_3', 'Algvõti: art36_lg1_art36_lg2_part4_3. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art3_lg1_art22_lg2_4', 'LJVIS1 ajalooline kirje: art3_lg1_art22_lg2_4', 'Algvõti: art3_lg1_art22_lg2_4. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('art8_lg6b', 'LJVIS1 ajalooline kirje: art8_lg6b', 'Algvõti: art8_lg6b. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('autovs_51_lg3_p3', 'LJVIS1 ajalooline kirje: autovs_51_lg3_p3', 'Algvõti: autovs_51_lg3_p3. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('autovs_51_lg3_p4', 'LJVIS1 ajalooline kirje: autovs_51_lg3_p4', 'Algvõti: autovs_51_lg3_p4. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('length_20_vsi', 'LJVIS1 ajalooline kirje: length_20_vsi', 'Algvõti: length_20_vsi. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('rooma_mI', 'LJVIS1 ajalooline kirje: rooma_mI', 'Algvõti: rooma_mI. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('rw_doc_si_16', 'LJVIS1 ajalooline kirje: rw_doc_si_16', 'Algvõti: rw_doc_si_16. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('valisriigi_vedaja_kabotaaz_vsi869', 'LJVIS1 ajalooline kirje: valisriigi_vedaja_kabotaaz_vsi869', 'Algvõti: valisriigi_vedaja_kabotaaz_vsi869. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('valisriigi_vedaja_kabotaaz_vsi871', 'LJVIS1 ajalooline kirje: valisriigi_vedaja_kabotaaz_vsi871', 'Algvõti: valisriigi_vedaja_kabotaaz_vsi871. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('valisriigi_vedaja_kabotaaz_vsi872', 'LJVIS1 ajalooline kirje: valisriigi_vedaja_kabotaaz_vsi872', 'Algvõti: valisriigi_vedaja_kabotaaz_vsi872. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('weight_n3_510_si', 'LJVIS1 ajalooline kirje: weight_n3_510_si', 'Algvõti: weight_n3_510_si. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.'),
    ('width_265310_si', 'LJVIS1 ajalooline kirje: width_265310_si', 'Algvõti: width_265310_si. Täpne standardvastendus kinnitamata; raskusastet ja alias-seost ei oletata. Kuupäevad piiravad uut valikut, mitte õigusakti kehtivust.')
    ) AS seed(code, name, description)
    WHERE NOT EXISTS (
        SELECT 1 FROM classifier.classifier_value existing
        WHERE existing.classifier_key = legacy_key AND existing.code = seed.code
    ) RETURNING *)
    INSERT INTO classifier.rollback_20261125100000 SELECT 'value',id,to_jsonb(added) FROM added;
END $migration$;
