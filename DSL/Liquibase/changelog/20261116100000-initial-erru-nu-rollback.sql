-- liquibase formatted sql
-- changeset ljvis:20261116100000-rollback ignore:true splitStatements:false
DROP TABLE IF EXISTS erru.nu_message;
DROP SEQUENCE IF EXISTS erru.seq_nu_message_key;
DROP SEQUENCE IF EXISTS erru.seq_nu_business_case_no;
