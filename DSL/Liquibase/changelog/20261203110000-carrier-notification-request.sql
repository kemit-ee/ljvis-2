-- liquibase formatted sql
-- changeset ljvis:20261203110000 ignore:true splitStatements:false
--
-- Vedajale raske rikkumise teavituse tellimus PPA (sõidu-puhkeaeg, TRAM-kaart) ja
-- Transpordiameti (tehnovormid) kontrollvormidel. Kasutaja märgib linnukese vormi
-- KINNITAMISEL; teavitus saadetakse avalikustamisel (mis võib olla automaatne,
-- nt e-toimiku otsuse järel), seega tellimus peab kinnitamise ja avalikustamise
-- vahel säilima. Eraldi tabel, et mitte lisada veergu viiele vormitabelile ja
-- nende snapshot/delete/DMapper päringutele.
--
-- Append-only: tellimust ei muudeta, ainult saatmise fakt märgitakse sent_at'iga
-- (üks avatud tellimus vormi kohta). Saatmise ajalugu: notifications.outbound_log.

CREATE TABLE IF NOT EXISTS notifications.carrier_notification_request (
    id          BIGSERIAL   PRIMARY KEY,
    entity_type TEXT        NOT NULL,   -- 'drive_rest_driver_form'|'drive_rest_teammate_form'|'tram_control_card'|'vehicle_technical'|'trailer_technical'
    entity_id   BIGINT      NOT NULL,   -- alamvormi võti
    requested_by VARCHAR(100) NOT NULL DEFAULT 'system',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_carrier_notification_request_open
    ON notifications.carrier_notification_request (entity_type, entity_id)
    WHERE sent_at IS NULL;

COMMENT ON TABLE notifications.carrier_notification_request IS
    'Kasutaja tellimus (kinnitamisel märgitud linnuke) saata vedajale raske rikkumise teavitus avalikustamisel. sent_at täidetakse pärast saatmist.';
