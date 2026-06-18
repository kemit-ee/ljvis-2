-- liquibase formatted sql
-- changeset ljvis:20260526100000 ignore:true
DROP TABLE IF EXISTS classifier.classifier_value CASCADE;
DROP TABLE IF EXISTS classifier.classifier CASCADE;
DROP SEQUENCE IF EXISTS classifier.seq_classifier_value_key;
DROP SEQUENCE IF EXISTS classifier.seq_classifier_key;
DROP SCHEMA IF EXISTS classifier CASCADE;

