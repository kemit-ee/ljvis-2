-- liquibase formatted sql
-- changeset ljvis:20261204100000-rollback ignore:true

DROP INDEX IF EXISTS forms.idx_sp_teammate_person_code_ee;
ALTER TABLE forms.sp_teammate_form
    DROP COLUMN IF EXISTS person_code_ee,
    DROP COLUMN IF EXISTS person_first_name,
    DROP COLUMN IF EXISTS person_last_name,
    DROP COLUMN IF EXISTS person_citizenship_code,
    DROP COLUMN IF EXISTS person_code_foreign,
    DROP COLUMN IF EXISTS person_birth_date;
