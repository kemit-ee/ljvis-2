-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true

DELETE FROM ljvis2.classifier;
DELETE FROM ljvis2.classifier_name_state;
DELETE FROM ljvis2.classifier_value;
DELETE FROM ljvis2.classifier_value_validity_state;
DELETE FROM ljvis2.classifier_latest;
DELETE FROM ljvis2.classifier_value_latest;

ALTER SEQUENCE ljvis2.classifier RESTART WITH 1;
ALTER SEQUENCE ljvis2.classifier_name_state RESTART WITH 1;
ALTER SEQUENCE ljvis2.classifier_value RESTART WITH 1;
ALTER SEQUENCE ljvis2.classifier_value_validity_state RESTART WITH 1;
ALTER SEQUENCE ljvis2.classifier_latest RESTART WITH 1;
ALTER SEQUENCE ljvis2.classifier_value_latest RESTART WITH 1;
