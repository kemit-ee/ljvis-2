-- liquibase formatted sql
-- changeset ljvis:20260801100000 ignore:true

DROP TABLE IF EXISTS erru.ctud_request CASCADE;
DROP SEQUENCE IF EXISTS erru.seq_ctud_business_case_no;
DROP SEQUENCE IF EXISTS erru.seq_ctud_request_key;
DROP SCHEMA IF EXISTS erru;
