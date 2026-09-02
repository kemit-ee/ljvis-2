-- liquibase formatted sql
-- changeset ljvis:20260829120000-rollback ignore:true

DROP SEQUENCE IF EXISTS forms.seq_tram_compound_form_key;
DROP INDEX IF EXISTS forms.idx_cf_authority;
ALTER TABLE forms.compound_form DROP CONSTRAINT IF EXISTS chk_compound_form_authority;
ALTER TABLE forms.compound_form DROP COLUMN IF EXISTS authority;
