-- liquibase formatted sql
-- changeset ljvis:20260908100000 ignore:true splitStatements:false

ALTER TABLE forms.compound_form
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN forms.compound_form.version IS 'Display version (the /V suffix). Starts at 1; incremented by 1 on every re-save of an already-locked form. Computed server-side (never trusts client input).';
