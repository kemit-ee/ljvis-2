-- liquibase formatted sql
-- changeset ljvis:20261001100000 ignore:true
-- Andmejälgija (AJ) kasutusteabe logi — IKS § 19, § 25.
-- Append-only tabel: kirjeid ei uuendata ega kustutata.
-- Vt docs/andmejalgija-seadistamine.md ja ADR-005.

CREATE TABLE IF NOT EXISTS xroad.aj_usage_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_code       TEXT        NOT NULL,
    logtime         TIMESTAMPTZ NOT NULL DEFAULT now(),
    action          TEXT        NOT NULL,
    receiver_code   TEXT        NOT NULL,
    receiver_name   TEXT,
    receiver_system TEXT
);

COMMENT ON TABLE xroad.aj_usage_log IS 'Andmejälgija (AJ) kasutusteabe logi. APPEND-ONLY — kirjeid ei uuendata ega kustutata (IKS § 19, § 25). Vt docs/andmejalgija-seadistamine.md.';
COMMENT ON COLUMN xroad.aj_usage_log.user_code IS 'Isiku isikukood kelle andmeid töödeldi (EE formaat, 11 numbrit).';
COMMENT ON COLUMN xroad.aj_usage_log.logtime IS 'Andmetöötluse ajamoment (UTC).';
COMMENT ON COLUMN xroad.aj_usage_log.action IS 'Inimloetav kirjeldus andmetöötluse põhjusest (eesti keeles).';
COMMENT ON COLUMN xroad.aj_usage_log.receiver_code IS 'Asutuse registrikood kes isikuandmeid sai — X-tee kliendi member_code.';
COMMENT ON COLUMN xroad.aj_usage_log.receiver_name IS 'Asutuse nimi (valikuline).';
COMMENT ON COLUMN xroad.aj_usage_log.receiver_system IS 'Infosüsteemi nimi — X-tee kliendi subsystem (valikuline).';

CREATE INDEX idx_aj_user_code ON xroad.aj_usage_log (user_code);
CREATE INDEX idx_aj_logtime   ON xroad.aj_usage_log (logtime DESC);
