-- liquibase formatted sql
-- changeset ljvis:20260804140000 ignore:true
-- Removes the dead `files` JSONB column left over from copy-pasting the initial
-- table DDL of several sub-forms. File attachments are handled exclusively via
-- the universal forms.form_attachment table (see 20260708100000-form-attachments.sql
-- and the shared files/upload|list|delete|download Ruuter templates, keyed by
-- form_number) — these columns were never read anywhere and always stayed '[]'.
-- Same fix already applied to forms.foreign_violation_form in
-- 20260708110000-remove-files-column.sql; this extends it to the sub-forms that
-- were created afterwards and still carried the column forward.

DROP INDEX IF EXISTS forms.idx_cf_files_gin;

ALTER TABLE forms.compound_form DROP COLUMN IF EXISTS files;
ALTER TABLE forms.vehicle_technical_form DROP COLUMN IF EXISTS files;
ALTER TABLE forms.trailer_technical_form DROP COLUMN IF EXISTS files;
ALTER TABLE forms.sp_driver_form DROP COLUMN IF EXISTS files;
ALTER TABLE forms.sp_teammate_form DROP COLUMN IF EXISTS files;
