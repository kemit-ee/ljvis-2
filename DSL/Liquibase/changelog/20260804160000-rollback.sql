-- liquibase formatted sql
-- changeset ljvis:20260804160000-rollback ignore:true

DROP TABLE IF EXISTS forms.adr_form;
DROP SEQUENCE IF EXISTS forms.seq_adr_form_key;
