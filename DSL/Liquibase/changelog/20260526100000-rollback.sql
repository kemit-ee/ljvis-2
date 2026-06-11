-- liquibase formatted sql
-- changeset ljvis:20260526100000 ignore:true

DROP TABLE IF EXISTS ljvis2.classifier_value CASCADE;
DROP TABLE IF EXISTS ljvis2.classifier CASCADE;
DROP SEQUENCE IF EXISTS ljvis2.seq_classifier_value_key;
DROP SEQUENCE IF EXISTS ljvis2.seq_classifier_key;

