-- liquibase formatted sql
-- changeset ljvis:20261121140000 ignore:true splitStatements:false
--
-- notifications.notification_template_mapping oli algusest peale kommenteeritud
-- "muudetakse käsitsi/haldusliidesest" (20261022100000), aga haldusliides jäi
-- tegemata ja original_template_id on kõigil ridadel NULL — send-postkast.yml
-- langeb tagasi constants.ini konstantidele ([#PK_TEMPLATE_*]).
--
-- See migratsioon viib tabeli projekti tavapärasele append-only mustrile
-- (samamoodi mis users.user_group, erru.ctud_request — rida ei uuendata, uus
-- versioon lisatakse, kehtiv rida = DISTINCT ON (notification_type) ORDER BY
-- ... created_at DESC), lisab default_recipient_email veeru (katab senise
-- LABOUR_INSPECTOR_EMAIL constants.ini konstandi) ja kannab olemasolevate
-- ridade constants.ini fallback-väärtused üle, et konstantide eemaldamine ei
-- muudaks käitumist. Haldusliides (notification-template-mapping/list.yml +
-- save.yml) lisandub eraldi.

ALTER TABLE notifications.notification_template_mapping
    DROP CONSTRAINT notification_template_mapping_pkey,
    ADD COLUMN id BIGSERIAL,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN default_recipient_email TEXT;

ALTER TABLE notifications.notification_template_mapping
    ADD CONSTRAINT pk_notification_template_mapping PRIMARY KEY (id);

CREATE INDEX idx_ntm_key_ts
    ON notifications.notification_template_mapping (notification_type, created_at DESC);

-- Uued "versioonid" postkasti-kanali võtmetele, mis kannavad üle constants.ini
-- praegused fallback-väärtused (dev-tmpl-* platshoiderid + tööinspektori
-- e-post), et nende konstantide eemaldamine send-postkast.yml'ist/save.yml'ist
-- ei muudaks käitumist. Reaalsed RIA malli tunnused täidetakse hiljem uue
-- haldusvaate kaudu.
INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active, default_recipient_email, created_by)
SELECT notification_type,
    CASE notification_type
        WHEN 'carrier_violation'      THEN 'dev-tmpl-carrier-violation'
        WHEN 'labor_kabotage'         THEN 'dev-tmpl-labor-kabotage'
        WHEN 'labor_foreign_proposal' THEN 'dev-tmpl-labor-foreign-proposal'
    END,
    channel, default_language, active,
    CASE notification_type
        WHEN 'labor_foreign_proposal' THEN 'juri.milov@ti.ee'
        ELSE NULL
    END,
    'ljvis2'
FROM (
    SELECT DISTINCT ON (notification_type) *
    FROM notifications.notification_template_mapping
    ORDER BY notification_type, created_at DESC
) latest
WHERE notification_type IN ('carrier_violation', 'labor_kabotage', 'labor_foreign_proposal');
