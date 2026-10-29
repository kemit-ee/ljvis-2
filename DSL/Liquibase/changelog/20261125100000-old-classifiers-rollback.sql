-- liquibase formatted sql
-- changeset ljvis:20261125100000-rollback ignore:true splitStatements:false
-- Refuse unsafe rollback, never delete another writer's rows or use CASCADE.
LOCK TABLE classifier.classifier, classifier.classifier_value IN SHARE ROW EXCLUSIVE MODE;
DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1 FROM classifier.rollback_20261125100000 j
        LEFT JOIN classifier.classifier_value v ON j.kind='value' AND v.id=j.row_id
        LEFT JOIN classifier.classifier c ON j.kind='classifier' AND c.id=j.row_id
        WHERE CASE j.kind WHEN 'value' THEN to_jsonb(v) ELSE to_jsonb(c) END IS DISTINCT FROM j.row_data
    ) THEN RAISE EXCEPTION 'Rollback 20261125100000: inserted rows changed or missing; review required'; END IF;
    -- Logical references have no FK. Once any forms have been migrated, do not
    -- infer that these historical identities are unused merely from current ETL fields.
    IF to_regclass('migration.form_link') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM migration.form_link) THEN
            RAISE EXCEPTION 'Rollback old classifiers: migrated form links exist; explicit dependency review required';
        END IF;
    END IF;
    IF to_regclass('forms.legacy_record') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM forms.legacy_record) THEN
            RAISE EXCEPTION 'Rollback old classifiers: rehearsal archive exists; explicit dependency review required';
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 FROM classifier.classifier_value v JOIN classifier.rollback_20261125100000 j
          ON j.kind='value' AND v.classifier_value_key=(j.row_data->>'classifier_value_key')::bigint
        WHERE v.id<>j.row_id
    ) OR EXISTS (
        SELECT 1 FROM classifier.classifier c JOIN classifier.rollback_20261125100000 j
          ON j.kind='classifier' AND c.classifier_key=(j.row_data->>'classifier_key')::bigint
        WHERE c.id<>j.row_id
    ) OR EXISTS (
        SELECT 1 FROM classifier.classifier_value v JOIN classifier.rollback_20261125100000 j
          ON j.kind='value' AND v.parent_key=(j.row_data->>'classifier_value_key')::bigint
        WHERE NOT EXISTS (SELECT 1 FROM classifier.rollback_20261125100000 owned WHERE owned.kind='value' AND owned.row_id=v.id)
    ) OR EXISTS (
        SELECT 1 FROM classifier.classifier_value v JOIN classifier.rollback_20261125100000 j
          ON j.kind='classifier' AND v.classifier_key=(j.row_data->>'classifier_key')::bigint
        WHERE NOT EXISTS (SELECT 1 FROM classifier.rollback_20261125100000 owned WHERE owned.kind='value' AND owned.row_id=v.id)
    ) THEN RAISE EXCEPTION 'Rollback old classifiers: later snapshots or dependent values exist; rollback dependent changes first'; END IF;
END $rollback$;
DELETE FROM classifier.classifier_value v USING classifier.rollback_20261125100000 j WHERE j.kind='value' AND v.id=j.row_id;
DELETE FROM classifier.classifier c USING classifier.rollback_20261125100000 j WHERE j.kind='classifier' AND c.id=j.row_id;
DROP TABLE classifier.rollback_20261125100000;
