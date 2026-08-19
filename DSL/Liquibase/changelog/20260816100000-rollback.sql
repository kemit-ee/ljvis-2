-- liquibase formatted sql
-- changeset ljvis:20260816100000 ignore:true

-- NOTE: schema erru is NOT dropped here — it is shared with erru.ctud_request /
-- erru.cgr_request / erru.rsi_message (created by earlier changesets), which must
-- survive this rollback.
DROP TABLE IF EXISTS erru.ncr_message CASCADE;
DROP SEQUENCE IF EXISTS erru.seq_ncr_business_case_no;
DROP SEQUENCE IF EXISTS erru.seq_ncr_message_key;
