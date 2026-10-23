-- liquibase formatted sql
-- changeset ljvis:20261225100000 ignore:true splitStatements:false
--
-- Sissetulev CTUD (tegevusloa kontrolli päring) loob nüüd teavituse type'iga 'ctud_inbound_received'
-- (DSL/Ruuter.internal/ljvis/POST/erru/ctud/inbound-request.yml). Rida lisatakse
-- notification_template_mapping kataloogi, et haldus saaks desktop-kanali saajad määrata.

INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active, created_by)
SELECT 'ctud_inbound_received', NULL, 'desktop', 'et', true, 'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM notifications.notification_template_mapping
                  WHERE notification_type = 'ctud_inbound_received' AND channel = 'desktop');
