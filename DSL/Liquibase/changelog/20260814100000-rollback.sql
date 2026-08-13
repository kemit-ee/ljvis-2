-- liquibase formatted sql
-- changeset ljvis:20260814100000 ignore:true

-- NOTE: schema erru is NOT dropped here — it is shared with erru.ctud_request /
-- erru.cgr_request (created by earlier changesets), which must survive this rollback.
DROP TABLE IF EXISTS erru.rsi_message CASCADE;
DROP SEQUENCE IF EXISTS erru.seq_rsi_business_case_no;
DROP SEQUENCE IF EXISTS erru.seq_rsi_message_key;
