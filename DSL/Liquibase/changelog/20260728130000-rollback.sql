-- liquibase formatted sql
-- changeset ljvis:20260728130000 ignore:true

DROP TABLE IF EXISTS forms.labour_inspection_form CASCADE;
DROP SEQUENCE IF EXISTS forms.seq_labour_inspection_form_key;
