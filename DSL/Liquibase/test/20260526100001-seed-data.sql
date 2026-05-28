-- liquibase formatted sql
-- changeset ljvis:20260526100001 ignore:true
-- Seed data

INSERT INTO ljvis2.classifier (code, created_by) VALUES ('RTK', 1);

INSERT INTO ljvis2.classifier_name_state (classifier_id, name, created_by) VALUES (1,  'Riikide ja territooriumide klassifikaator', 1);

INSERT INTO ljvis2.classifier_value (classifier_id, code, name, created_by) VALUES (1, 'EE', 'Eesti', 1);
INSERT INTO ljvis2.classifier_value (classifier_id, code, name, created_by) VALUES (1, 'LV', 'Läti', 1);
INSERT INTO ljvis2.classifier_value (classifier_id, code, name, created_by) VALUES (1, 'LT', 'Leedu', 1);

INSERT INTO ljvis2.classifier_value_validity_state (classifier_value_id, valid_from, created_by) VALUES (1, '2026-05-26', 1);
INSERT INTO ljvis2.classifier_value_validity_state (classifier_value_id, valid_from, created_by) VALUES (2, '2026-05-26', 1);
INSERT INTO ljvis2.classifier_value_validity_state (classifier_value_id, valid_from, created_by) VALUES (3, '2026-05-26', 1);

INSERT INTO ljvis2.classifier_latest (classifier_id, code, name, created_by) VALUES (1, 'RTK', 'Riikide ja territooriumide klassifikaator', 1);

INSERT INTO ljvis2.classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, created_by) VALUES (1, 1, 'RTK', 'EE', 'Eesti', '2026-05-26', 1);
INSERT INTO ljvis2.classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, created_by) VALUES (2, 1, 'RTK', 'LV', 'Läti', '2026-05-26', 1);
INSERT INTO ljvis2.classifier_value_latest (classifier_value_id, classifier_id, classifier_code, code, name, valid_from, created_by) VALUES (3, 1, 'RTK', 'LT', 'Leedu', '2026-05-26', 1);