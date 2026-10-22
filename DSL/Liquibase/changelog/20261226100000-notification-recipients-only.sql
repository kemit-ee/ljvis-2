-- liquibase formatted sql
-- changeset ljvis:20261226100000 ignore:true splitStatements:false
--
-- Desktop-kanali liigi teavituse adressaadid on ainult halduses valitud saajad. Teavitusele
-- lisatakse märge recipients_only: sellise teavituse näevad ainult recipient_personal_codes
-- kasutajad, mitte kõik required_permission omanikud. Olemasolevad teavitused jäävad
-- (DEFAULT false) õiguspõhiselt nähtavaks. Tabel on append-only, veerg lisatakse vaikeväärtusega.

ALTER TABLE notifications.notification
    ADD COLUMN IF NOT EXISTS recipients_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN notifications.notification.recipients_only IS 'true = teavituse näevad ainult recipient_personal_codes kasutajad (desktop-kanali liigid). false = required_permission-põhine nähtavus.';
