-- liquibase formatted sql
-- changeset ljvis:20261201100000 ignore:true
-- Andmejälgija findUsage: liitindeks katab nii isikukoodi filtri kui ka
-- logtime DESC, id DESC järjestuse (stabiilne lehitsemine, AJ protokoll §7).
-- Asendab üksiku user_code indeksi.

CREATE INDEX IF NOT EXISTS idx_aj_user_code_logtime
    ON xroad.aj_usage_log (user_code, logtime DESC, id DESC);

DROP INDEX IF EXISTS xroad.idx_aj_user_code;
