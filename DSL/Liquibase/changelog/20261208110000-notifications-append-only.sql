-- liquibase formatted sql
-- changeset ljvis:20261208110000 ignore:true splitStatements:false
--
-- Epic #522 / T1 — notifications skeemi kaks UPDATE-i muutuvad INSERT-only'ks.
--
-- 1) carrier_notification_request: "tarbitud" märge ei uuenda enam avatud rida. Tabel on nüüd
--    snapshot-tabel (võti = entity_type + entity_id, revision kasvab). Avatud tellimus = viimane rida,
--    mille sent_at on NULL; "saadetud" = uus rida sama entity jaoks, sent_at täidetud. Vana partial
--    unique (üks avatud rida entity kohta) ei saa enam kehtida (avatud rida jääb tabelisse),
--    seda asendab UNIQUE (entity_type, entity_id, revision): kaks samaaegset kirjutajat saavad sama
--    revision'i ja teine kukub (vt ADR-013).
-- 2) outbound_log: PK 2.0 vastuse väljad (status, failure_reason, pk_*, status_check_count) kirjutatakse
--    uue rea kaupa tabelisse outbound_log_status_event. Iga rida on täisseis (kantud edasi eelmisest),
--    praegune seis = viimane event; kui eventi pole, kehtib outbound_log rida ise.

ALTER TABLE notifications.carrier_notification_request ADD COLUMN revision BIGINT NOT NULL DEFAULT 1;

UPDATE notifications.carrier_notification_request r
SET revision = x.rn
FROM (SELECT id, row_number() OVER (PARTITION BY entity_type, entity_id ORDER BY id) AS rn
      FROM notifications.carrier_notification_request) x
WHERE r.id = x.id;

CREATE UNIQUE INDEX uq_carrier_notification_request_revision
    ON notifications.carrier_notification_request (entity_type, entity_id, revision);

DROP INDEX notifications.uq_carrier_notification_request_open;

COMMENT ON COLUMN notifications.carrier_notification_request.revision IS
    'Rea järjekorranumber (entity_type, entity_id) sees. Avatud tellimus = viimane rida, mille sent_at on NULL; saatmine lisab uue rea sent_at-iga.';
COMMENT ON COLUMN notifications.carrier_notification_request.sent_at IS
    'Täidetud ainult "saadetud" reale (INSERT-only; avatud rida jääb muutmata).';

CREATE TABLE notifications.outbound_log_status_event (
    id                           BIGSERIAL    PRIMARY KEY,
    log_id                       UUID         NOT NULL REFERENCES notifications.outbound_log (id),
    revision                     BIGINT       NOT NULL,
    status                       TEXT         NOT NULL,
    failure_reason               TEXT,
    pk_sending_operation_id      TEXT,
    pk_operation_restart_allowed BOOLEAN,
    pk_completed_at              TIMESTAMPTZ,
    status_check_count           INTEGER      NOT NULL DEFAULT 0,
    created_at                   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_outbound_log_status_event_status CHECK (status IN ('queued', 'in_progress', 'sent', 'error')),
    CONSTRAINT uq_outbound_log_status_event_revision UNIQUE (log_id, revision)
);

COMMENT ON TABLE notifications.outbound_log_status_event IS
    'INSERT-only staatuseventide ajalugu outbound_log kirjetele (Postkast 2.0 vastus, kontrollide arv). Iga rida on täisseis; praegune seis = suurima revision''iga rida. Ilma eventita kehtivad outbound_log enda väljad.';
COMMENT ON COLUMN notifications.outbound_log_status_event.revision IS
    'Rea järjekorranumber log_id sees; UNIQUE (log_id, revision) tõrjub samaaegse kirjutaja (vt ADR-013).';
