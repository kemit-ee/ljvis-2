-- liquibase formatted sql
-- changeset ljvis:20260727120000 ignore:true

CREATE SCHEMA IF NOT EXISTS xroad;

CREATE TABLE IF NOT EXISTS xroad.xroad_integration_log (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code  VARCHAR(100) NOT NULL,
    request_xml   TEXT,
    response_xml  TEXT,
    duration_ms   INTEGER,
    success       BOOLEAN     NOT NULL,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xroad_integration_log_service  ON xroad.xroad_integration_log (service_code);
CREATE INDEX idx_xroad_integration_log_created  ON xroad.xroad_integration_log (created_at DESC);
CREATE INDEX idx_xroad_integration_log_success  ON xroad.xroad_integration_log (success);
