-- liquibase formatted sql
-- changeset ljvis:20260804170000-rollback ignore:true

DROP TABLE IF EXISTS forms.good_repute_form;
DROP SEQUENCE IF EXISTS forms.seq_good_repute_form_key;
