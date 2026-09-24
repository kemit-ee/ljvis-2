-- liquibase formatted sql
-- changeset ljvis:20261125120000 ignore:true splitStatements:false
--
-- `notification/create.yml` kutsujate läbivaatusel (vt 20261125110000-notification-desktop-recipients)
-- selgus, et DSL/Ruuter.internal/ljvis/POST/erru/nu/inbound-request.yml saadab
-- teavituse type'iga 'nu_inbound_received', aga notification_template_mapping
-- kataloogis (20261022100000-postkast2-xtee-alignment.sql) seda rida ei ole —
-- erinevalt teistest neljast create.yml kutsujast (ncr_violation, ncr_response,
-- driving_ban, weight_violation), mis kõik on kataloogis. Puuduva rea tõttu
-- ei kuvatud 'NU sobimatusteated' halduse „Postkasti mallide ja vastuvõtjate
-- seaded" nimekirjas üldse, seega polnud sellele desktop-kanali teavitusele
-- võimalik konkreetseid saajaid (desktop_recipient_personal_codes) määrata —
-- ainult required_permission ('nu.read') filter kehtis.

INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active, created_by)
VALUES
    ('nu_inbound_received', NULL, 'desktop', 'et', true, 'ljvis2');
