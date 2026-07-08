-- liquibase formatted sql
-- changeset ljvis:20260526100001 ignore:true
-- Seed data (v2 denormalized snapshot model)

-- classifier — single full snapshot (v2: code + name + description in one row)
-- classifier_key = 1: RTK
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (nextval('classifier.seq_classifier_key'), 'RTK', 'Riikide ja territooriumide klassifikaator', NULL, 'ljvis2');

-- classifier_values — single full snapshot per value (v3: classifier_key only; classifier_code resolved via JOIN; is_valid computed at read time)
INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT nextval('classifier.seq_classifier_value_key'),
       (SELECT classifier_key FROM classifier.classifier WHERE code = 'RTK' ORDER BY created_at DESC LIMIT 1),
       'EE', 'Eesti', '2026-05-26', NULL, 'ljvis2';

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT nextval('classifier.seq_classifier_value_key'),
       (SELECT classifier_key FROM classifier.classifier WHERE code = 'RTK' ORDER BY created_at DESC LIMIT 1),
       'LV', 'Läti', '2026-05-26', NULL, 'ljvis2';

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT nextval('classifier.seq_classifier_value_key'),
       (SELECT classifier_key FROM classifier.classifier WHERE code = 'RTK' ORDER BY created_at DESC LIMIT 1),
       'LT', 'Leedu', '2026-05-26', NULL, 'ljvis2';