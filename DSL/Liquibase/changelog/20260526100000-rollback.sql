-- liquibase formatted sql
-- changeset ljvis:20260526100000 ignore:true

DROP TABLE IF EXISTS ljvis2.classifier CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier_name_state CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier_value CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier_value_validity_state CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier_latest CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier_value_latest CASCADE;

