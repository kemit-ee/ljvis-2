-- liquibase formatted sql
-- changeset ljvis:20260902100000 ignore:true splitStatements:false

ALTER TABLE forms.sp_driver_form
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN forms.sp_driver_form.version IS 'Display version (the /V suffix). Starts at 1; incremented by 1 on every re-save. Computed server-side (never trusts client input).';

ALTER TABLE forms.sp_teammate_form
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN forms.sp_teammate_form.version IS 'Display version (the /V suffix). Starts at 1; incremented by 1 on every re-save. Computed server-side (never trusts client input).';
