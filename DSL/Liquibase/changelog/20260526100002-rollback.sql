-- liquibase formatted sql
-- changeset ljvis:20260526100002 ignore:true

DELETE FROM ljvis2.permission WHERE code = 'classifier.list';
DELETE FROM ljvis2.permission WHERE code = 'classifier.read';
DELETE FROM ljvis2.permission WHERE code = 'classifier.edit';
DELETE FROM ljvis2.permission WHERE code = 'classifier_value.edit';