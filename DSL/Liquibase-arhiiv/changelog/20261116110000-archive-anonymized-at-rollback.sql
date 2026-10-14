-- liquibase formatted sql
-- changeset ljvis:20261116110000 ignore:true
-- Rollback: eemalda anonymized_at veerg ja selle indeks.

DROP INDEX IF EXISTS archive.idx_form_snapshot_unanonymized;
ALTER TABLE archive.form_snapshot DROP COLUMN IF EXISTS anonymized_at;
