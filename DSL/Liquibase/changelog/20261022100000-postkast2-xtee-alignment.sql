-- liquibase formatted sql
-- changeset ljvis:20261022100000 ignore:true splitStatements:false
--
-- LJVIS2-47/LJVIS2-43: viib notifications.outbound_log ja teavituste logi vaate
-- vastavusse detailanalüüsidega 12-1 (Postkast 2.0 integratsioon, üle X-tee) ja
-- 12-2 (Saadetud teavituste nimekirja vaatamine). Additiivne laiendus — tabeli
-- nimi jääb, toodangus andmeid ei ole, seega migratsiooni ei tehta.
--
-- Edaspidi üks outbound_log rida = üks saatmiskatse = üks adressaat (varem 1..N
-- outbound_log_recipient kaudu). outbound_log_recipient jääb alles UC-03
-- (saajate aruande) jaoks, aga uus saatmisvoog kirjutab sinna täpselt 1 rea.
--
-- Staatus laieneb kahelt väärtuselt (sent/sent_error) neljale, mis peegeldavad
-- Postkast 2.0 saatmisoperatsiooni elukaart (12-1 §4 "Saatmise tulemus ja
-- staatused"): queued (salvestatud, PK pole veel vastu võtnud) -> in_progress
-- (PK kättetoimetab) -> sent | error (lõppseis). Vana 'sent_error' väärtust
-- andmeid pole (stub ei ole toodangus jooksnud), seega CHECK lisatakse kohe
-- lõplikule väärtuste hulgale.

ALTER TABLE notifications.outbound_log
    ADD COLUMN notification_key TEXT,
    ADD COLUMN recipient_address TEXT,
    ADD COLUMN notification_language TEXT NOT NULL DEFAULT 'et',
    ADD COLUMN failure_reason TEXT,
    ADD COLUMN template_variables JSONB,
    ADD COLUMN requested_send_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN pk_operation_restart_allowed BOOLEAN,
    ADD COLUMN pk_completed_at TIMESTAMPTZ,
    ADD COLUMN status_check_count INTEGER NOT NULL DEFAULT 0;

-- notification_key on LJVIS-i antud tunnus (X-EXTERNAL-ID päisesse) — unikaalne
-- iga saatmiskatse kohta (sh iga uuesti saatmise katse saab oma tunnuse).
CREATE UNIQUE INDEX uq_outbound_log_notification_key
    ON notifications.outbound_log(notification_key)
    WHERE notification_key IS NOT NULL;

CREATE INDEX idx_outbound_log_recipient_address ON notifications.outbound_log(recipient_address);

ALTER TABLE notifications.outbound_log
    ADD CONSTRAINT chk_outbound_log_status
    CHECK (status IN ('queued', 'in_progress', 'sent', 'error'));

-- ---------------------------------------------------------------------------
-- Teavituse liigi -> Postkast 2.0 malli kataloog (12-1 §4 "Teavituse liigid ja
-- mallid"). LJVIS hoiab malli ALGSET tunnust (originalTemplateId), mitte
-- konkreetse versiooni tunnust — PK 2.0 leiab ise malli viimase kehtiva
-- versiooni. Ainult loetakse; muudetakse käsitsi/haldusliidesest, mitte kasutaja
-- poolt LJVIS-is (12-1 §4 "Ükski kasutaja ei saa LJVIS-is teavituse teksti...").
--
-- original_template_id on siin teadlikult NULL, sest PK 2.0 tootmis-malli
-- tunnused (LJVIS2-156/157, RIA) pole veel teada. send-postkast.yml langeb
-- tagasi konstantidele [#PK_TEMPLATE_*] kuni need siia sisestatakse.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications.notification_template_mapping (
    notification_type   TEXT        PRIMARY KEY,
    original_template_id TEXT,
    channel             TEXT        NOT NULL CHECK (channel IN ('postkast', 'desktop')),
    default_language    TEXT        NOT NULL DEFAULT 'et',
    active              BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active)
VALUES
    ('carrier_violation',      NULL, 'postkast', 'et', true),
    ('labor_kabotage',         NULL, 'postkast', 'et', true),
    ('labor_foreign_proposal', NULL, 'postkast', 'et', true),
    ('ncr_violation',          NULL, 'desktop',  'et', true),
    ('ncr_response',           NULL, 'desktop',  'et', true),
    ('driving_ban',            NULL, 'desktop',  'et', true),
    ('weight_violation',       NULL, 'desktop',  'et', true);
