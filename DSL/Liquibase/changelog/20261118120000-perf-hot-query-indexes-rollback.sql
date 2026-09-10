-- liquibase formatted sql
-- changeset ljvis:20261118120000-rollback ignore:true

DROP INDEX IF EXISTS forms.idx_cf_company_published;
DROP INDEX IF EXISTS erru.idx_cgr_outgoing_key_ts;
