-- liquibase formatted sql
-- changeset ljvis:20261117121000-rollback ignore:true splitStatements:false
DROP FUNCTION IF EXISTS erru.nu_record_exchange_result(JSONB, TEXT);
DROP FUNCTION IF EXISTS erru.nu_register_ack(BIGINT);
DROP FUNCTION IF EXISTS erru.nu_finish_send(BIGINT, JSONB, TEXT);
DROP FUNCTION IF EXISTS erru.nu_begin_send(BIGINT, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS erru.nu_exchange_event;
DROP FUNCTION IF EXISTS erru.nu_save_draft(BIGINT, INTEGER, BIGINT, BIGINT, JSONB, TEXT);
DROP FUNCTION IF EXISTS erru.nu_message_identity(erru.nu_message);
DROP FUNCTION IF EXISTS erru.nu_source_identity(forms.good_repute_form);
