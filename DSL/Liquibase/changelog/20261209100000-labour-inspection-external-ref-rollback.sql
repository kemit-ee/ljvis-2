-- liquibase formatted sql
-- changeset ljvis:20261209100000-rollback ignore:true
DROP FUNCTION IF EXISTS forms.register_external_labour_inspection(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS forms.lif_external_payload_hash(TEXT, DATE, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS forms.labour_inspection_external_ref;
