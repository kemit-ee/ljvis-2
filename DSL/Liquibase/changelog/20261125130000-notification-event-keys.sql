-- liquibase formatted sql
-- changeset ljvis:20261125130000 ignore:true splitStatements:false
--
-- Teavituse idempotentsus peab käima alliksündmuse, mitte seotud vormi järgi.
-- Nii saab sama vormi iga uus avalikustamise versioon tekitada uue teavituse,
-- kuid sama ERRU technicalId või sama avalikustamise versiooni kordustöötlus mitte.

ALTER TABLE notifications.notification
    ADD COLUMN IF NOT EXISTS event_key TEXT;

DROP INDEX IF EXISTS notifications.uq_notification_entity_type;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_type_event
    ON notifications.notification(type, event_key)
    WHERE event_key IS NOT NULL;

-- Tagasiühilduvus kutsujatele, mis pole veel event_key'd kasutusele võtnud.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_legacy_entity_type
    ON notifications.notification(type, related_entity_type, related_entity_id)
    WHERE event_key IS NULL AND related_entity_id IS NOT NULL;

-- Ainult teavituse liikide kataloog. Saajaid siin teadlikult ei määrata:
-- desktop_recipient_personal_codes jääb NULL ja saajad valitakse haldusvaates.
INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active, created_by)
VALUES
    ('ncr_ok',                  NULL, 'desktop', 'et', true, 'ljvis2'),
    ('rsi_received',            NULL, 'desktop', 'et', true, 'ljvis2'),
    ('serious_infringement',    NULL, 'desktop', 'et', true, 'ljvis2'),
    ('extraordinary_inspection',NULL, 'desktop', 'et', true, 'ljvis2'),
    ('cargo_securing',          NULL, 'desktop', 'et', true, 'ljvis2');
