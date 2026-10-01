-- liquibase formatted sql
-- changeset ljvis:20261203100000 ignore:true splitStatements:false
--
-- Uus Postkasti teavituse liik "labor_tachograph_not_downloaded": Tööinspektsioonile
-- saadetakse teavitus, kui avalikustatakse autojuhi või meeskonnaliikme
-- sõidu- ja puhkeaja kontrollkaart, millele on tehtud märge, et andmed
-- sõidumeerikust või juhikaardilt on alla laadimata. Adressaat ja malli tunnus
-- on sama mustriga mis labor_foreign_proposal (muudetav haldusvaates).

INSERT INTO notifications.notification_template_mapping
    (notification_type, original_template_id, channel, default_language, active, default_recipient_email, created_by)
VALUES
    ('labor_tachograph_not_downloaded', 'dev-tmpl-labor-tachograph-not-downloaded',
     'postkast', 'et', true, 'juri.milov@ti.ee', 'ljvis2');
