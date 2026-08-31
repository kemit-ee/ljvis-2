-- liquibase formatted sql
-- changeset ljvis:20261010100000 splitStatements:false
--
-- LJVIS2-XXX: Teavituste moodul — andmemudel.
--
-- Kõik tabelid on APPEND-ONLY (INSERT only, ei ole UPDATE ega DELETE).
-- Disainimuster: immutable sündmused, denormaliseeritud struktuur.
-- Vt docs/workingdocs/architecture-decisions.md ADR-006.

CREATE SCHEMA IF NOT EXISTS notifications;

-- ---------------------------------------------------------------------------
-- In-app teavitused (LJVIS töölaud).
-- APPEND-ONLY: kirjeid ei uuendata ega kustutata.
-- Immutable sündmused — teavitusel puudub muutuv seis,
-- seega *_state/_latest split pole vajalik.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications.notification (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type                TEXT        NOT NULL,   -- 'ncr_violation'|'ncr_response'|'driving_ban'|'weight_violation'
    required_permission TEXT        NOT NULL,   -- 'ncr.read'|'ncr.respond'|'rsi.read'
    related_entity_type TEXT,                   -- 'ncr'|'compound_form'|...
    related_entity_id   TEXT,
    title_et            TEXT        NOT NULL,
    body_et             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          TEXT        NOT NULL DEFAULT 'system'
);

-- Osaunikaalne indeks: sama tüüp + seotud kirje → ainult üks teavitus.
-- Annab INSERT … ON CONFLICT DO NOTHING idempotentsuse.
CREATE UNIQUE INDEX uq_notification_entity_type
    ON notifications.notification(type, related_entity_type, related_entity_id)
    WHERE related_entity_id IS NOT NULL;

CREATE INDEX idx_notification_perm    ON notifications.notification(required_permission);
CREATE INDEX idx_notification_created ON notifications.notification(created_at DESC);

-- ---------------------------------------------------------------------------
-- Lugemise sündmuste logi.
-- APPEND-ONLY: INSERT ON CONFLICT DO NOTHING (idempotentne).
-- Kasutaja ei saa teavitust "lugemata" märkida — lugemine on ühekordne sündmus.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications.notification_read (
    notification_id UUID        NOT NULL REFERENCES notifications.notification(id),
    user_code       TEXT        NOT NULL,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_code)
);

CREATE INDEX idx_notif_read_user ON notifications.notification_read(user_code);

-- ---------------------------------------------------------------------------
-- Väliste teavituste saatmislogi (UC-02 — Postkast 2.0 e-kirjad).
-- APPEND-ONLY: iga saatmiskatse (sh uuesti saatmine UC-04) on eraldi rida.
--
-- PK 2.0 API märkused (https://e-gov.github.io/PK-Doku/):
--   * POST /notification-management/v1/notifications tagastab sending_operation_id
--     → salvestatakse pk_sending_operation_id veergu.
--   * UC-04 retry: PUT /notification-management/v1/sending-operations/{id}
--     (PK 2.0 sisseehitatud retry mehhanism, mitte uus POST).
--   * pk_template_id on PK 2.0-s eelkonfigureeritud malli ID
--     (eeltingimus: mallid loodud PK 2.0 haldusliideses enne toodangut).
-- ---------------------------------------------------------------------------
CREATE TABLE notifications.outbound_log (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    message_type            TEXT        NOT NULL,  -- 'carrier_violation'|'labor_kabotage'|'labor_foreign_proposal'
    send_date               TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                  TEXT        NOT NULL,  -- 'sent'|'sent_error'
    related_entity_type     TEXT,
    related_entity_id       TEXT,
    original_log_id         UUID,                  -- täidetud uuesti saatmisel (viide algse katse reale)
    pk_template_id          TEXT,                  -- PK 2.0 malli ID (templateId)
    pk_sending_operation_id TEXT,                  -- PK 2.0 tagastatud sending_operation_id (UC-04 retry jaoks)
    payload_json            JSONB,                 -- saadetud kirja andmeobjekt (templateId, recipients, data)
    created_by              TEXT        NOT NULL DEFAULT 'system'
);

CREATE INDEX idx_outbound_log_date   ON notifications.outbound_log(send_date DESC);
CREATE INDEX idx_outbound_log_status ON notifications.outbound_log(status);
CREATE INDEX idx_outbound_log_entity ON notifications.outbound_log(related_entity_type, related_entity_id);

-- ---------------------------------------------------------------------------
-- Saajate logi — ühe outbound_log kirje kohta 1..N saajat.
-- APPEND-ONLY: uuesti saatmisel lisatakse uued recipient read uue
-- outbound_log rea alla (algne kirje jääb muutmata).
-- sending_report: 'ok' kui PK 2.0 kinnitas eduka kättetoimetuse.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications.outbound_log_recipient (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id         UUID NOT NULL REFERENCES notifications.outbound_log(id),
    person_email   TEXT,
    person_name    TEXT,
    person_code    TEXT,   -- äriregistrikood veoettevõtete puhul
    sending_report TEXT NOT NULL DEFAULT 'ok'  -- 'ok' | 'error: <msg>'
);

CREATE INDEX idx_outbound_recipient_log ON notifications.outbound_log_recipient(log_id);
