-- liquibase formatted sql
-- changeset ljvis:20260708100000 ignore:true

CREATE SCHEMA IF NOT EXISTS forms;

CREATE TABLE forms.form_attachment (
    id            BIGSERIAL       NOT NULL,
    form_number   VARCHAR(50)     NOT NULL,
    file_name     VARCHAR(500)    NOT NULL,
    s3_key        VARCHAR(1000)   NOT NULL,
    status        VARCHAR(50)     NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by    VARCHAR(100)    NOT NULL,
    CONSTRAINT pk_form_attachment PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.form_attachment IS 'Universal table for files attached to any form (LJVIS-50). Linked logically via stable form_number, not table-specific foreign keys.';
COMMENT ON COLUMN forms.form_attachment.id IS 'Primary key';
COMMENT ON COLUMN forms.form_attachment.form_number IS 'Logical reference to the form (e.g. vr-2026-12345). Can refer to any form type (foreign_violation_form, police_form, etc).';
COMMENT ON COLUMN forms.form_attachment.file_name IS 'Original file name';
COMMENT ON COLUMN forms.form_attachment.s3_key IS 'S3 Object Key for downloading';
COMMENT ON COLUMN forms.form_attachment.status IS 'Status of the file: active / deleted';
COMMENT ON COLUMN forms.form_attachment.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN forms.form_attachment.created_by IS 'User who uploaded the file';

CREATE INDEX idx_fa_form_number ON forms.form_attachment (form_number);
CREATE INDEX idx_fa_status ON forms.form_attachment (status);
