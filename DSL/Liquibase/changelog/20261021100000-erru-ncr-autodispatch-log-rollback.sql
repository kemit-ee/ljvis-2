-- liquibase formatted sql
-- changeset ljvis:20261021100000-rollback ignore:true splitStatements:false
-- Rollback: 20261021100000-erru-ncr-autodispatch-log (kutsutakse ainult .xml <rollback> kaudu).

DROP TABLE IF EXISTS erru.ncr_autodispatch_log;
