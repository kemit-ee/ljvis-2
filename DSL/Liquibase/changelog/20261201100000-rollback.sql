-- liquibase formatted sql
-- changeset ljvis:20261201100000-rollback ignore:true
CREATE INDEX IF NOT EXISTS idx_aj_user_code ON xroad.aj_usage_log (user_code);
DROP INDEX IF EXISTS xroad.idx_aj_user_code_logtime;
