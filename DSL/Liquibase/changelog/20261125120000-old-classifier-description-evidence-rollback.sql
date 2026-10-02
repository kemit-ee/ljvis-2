-- liquibase formatted sql
-- changeset ljvis:20261125120000-rollback ignore:true splitStatements:false
-- Refuse unsafe rollback, never delete another writer's rows or use CASCADE.
LOCK TABLE classifier.classifier, classifier.classifier_value IN SHARE ROW EXCLUSIVE MODE;
DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1 FROM classifier.rollback_20261125120000 j
        LEFT JOIN classifier.classifier_value v ON j.kind='value' AND v.id=j.row_id
        LEFT JOIN classifier.classifier c ON j.kind='classifier' AND c.id=j.row_id
        WHERE CASE j.kind WHEN 'value' THEN to_jsonb(v) ELSE to_jsonb(c) END IS DISTINCT FROM j.row_data
    ) THEN RAISE EXCEPTION 'Rollback 20261125120000: inserted rows changed or missing; review required'; END IF;
    IF EXISTS (
        SELECT 1 FROM classifier.rollback_20261125120000 j JOIN classifier.classifier_value v
          ON v.classifier_value_key=(j.row_data->>'classifier_value_key')::bigint
        WHERE (v.created_at,v.id) > ((j.row_data->>'created_at')::timestamptz,j.row_id)
          AND NOT EXISTS (SELECT 1 FROM classifier.rollback_20261125120000 owned WHERE owned.row_id=v.id AND owned.kind='value')
    ) THEN RAISE EXCEPTION 'Rollback description evidence: later edits exist; preserve user changes and review manually'; END IF;
END $rollback$;
DELETE FROM classifier.classifier_value v USING classifier.rollback_20261125120000 j WHERE j.kind='value' AND v.id=j.row_id;
DELETE FROM classifier.classifier c USING classifier.rollback_20261125120000 j WHERE j.kind='classifier' AND c.id=j.row_id;
DROP TABLE classifier.rollback_20261125120000;
