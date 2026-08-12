-- liquibase formatted sql
-- changeset ljvis:20260812100000 ignore:true

-- NOTE: schema erru is NOT dropped here — it is shared with erru.ctud_request
-- (created by 20260801100000-initial-erru-ctud.sql), which must survive this rollback.
DROP TABLE IF EXISTS erru.cgr_request CASCADE;
DROP SEQUENCE IF EXISTS erru.seq_cgr_business_case_no;
DROP SEQUENCE IF EXISTS erru.seq_cgr_request_key;
