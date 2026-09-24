-- liquibase formatted sql
-- changeset ljvis:20260924100000 ignore:true splitStatements:false
--
-- Võimaldab desktop-kanali teavituse (notification_template_mapping.channel='desktop')
-- suunata konkreetsetele kasutajatele, mitte ainult required_permission õiguse kaudu
-- (senine ainuke mudel, vt 20261010100000-notifications-schema.sql). Saajad valitakse
-- halduses (notification-template-mapping) kasutajaotsingu kaudu ja salvestatakse
-- personal_code'idena — sama identiteet, mida notifications.notification_read.user_code
-- ja auth_user.personalcode juba kasutavad, seega lugemisel pole vaja lisaresolve't
-- users.user_account vastu.
--
-- desktop_recipient_personal_codes lisandub notification_template_mapping'ile
-- (append-only, uus versioon iga muudatuse kohta, vt 20261121140000) kui HALDUSE
-- SEADISTUS. recipient_personal_codes lisandub notification'ile endale, sest tabel
-- on immutable-sündmuste logi (ADR-006) — iga teavitus tardistab oma saajad
-- loomise hetkel, mitte live-viitena mapping'u praegusele seisule (nii jääb varem
-- saadetud teavituse saajate ring muutumatuks ka siis, kui haldusseadistust hiljem
-- muudetakse).

ALTER TABLE notifications.notification_template_mapping
    ADD COLUMN desktop_recipient_personal_codes TEXT[];

ALTER TABLE notifications.notification
    ADD COLUMN recipient_personal_codes TEXT[];

CREATE INDEX idx_notification_recipient_codes
    ON notifications.notification USING GIN (recipient_personal_codes);
