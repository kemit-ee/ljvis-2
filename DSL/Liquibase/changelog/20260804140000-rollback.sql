-- liquibase formatted sql
-- changeset ljvis:20260804140000-rollback ignore:true

ALTER TABLE forms.compound_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.compound_form.files IS 'JSONB array of file metadata: [{"file_name":...,"content_type":...,"file_size_bytes":...,"storage_key":...,"uploaded_at":...,"uploaded_by":...}]. Binaries in external storage. Full array re-copied on every compound_form snapshot.';
CREATE INDEX idx_cf_files_gin ON forms.compound_form USING GIN (files);

ALTER TABLE forms.vehicle_technical_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.vehicle_technical_form.files IS 'JSONB array of file metadata: [{"fileName":...,"contentType":...,"fileSizeBytes":...,"storageKey":...,"uploadedAt":...,"uploadedBy":...}].';

ALTER TABLE forms.trailer_technical_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.trailer_technical_form.files IS 'JSONB array of file metadata: [{"fileName":...,"contentType":...,"fileSizeBytes":...,"storageKey":...,"uploadedAt":...,"uploadedBy":...}].';

ALTER TABLE forms.sp_driver_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.sp_driver_form.files IS 'JSONB array of file metadata: [{"file_name":...,"content_type":...,"file_size_bytes":...,"storage_key":...,"uploaded_at":...,"uploaded_by":...}]. Sub-form-level attachments.';

ALTER TABLE forms.sp_teammate_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.sp_teammate_form.files IS 'Same structure as sp_driver_form.files.';
