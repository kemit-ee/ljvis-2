-- liquibase formatted sql
-- changeset ljvis:20260708110000-rollback ignore:true

ALTER TABLE forms.foreign_violation_form ADD COLUMN files JSONB NOT NULL DEFAULT '[]';
COMMENT ON COLUMN forms.foreign_violation_form.files IS 'JSONB array of file metadata: [{file_name, content_type, file_size_bytes, storage_key, uploaded_at, uploaded_by}]. Binaries in S3.';
