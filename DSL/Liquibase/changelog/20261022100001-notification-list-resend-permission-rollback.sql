-- liquibase formatted sql
-- changeset ljvis:20261022100001-rollback ignore:true splitStatements:false
-- Rollback: 20261022100001-notification-list-resend-permission (kutsutakse ainult .xml <rollback> kaudu)
-- NB: user_group ridu ei saa rollback-ida (append-only mudel); uuemad read jäävad.
DELETE FROM users.permission WHERE code IN ('notification.list', 'notification.resend');

INSERT INTO users.permission (code, description, created_by) VALUES
    ('notification.admin',
     'Postkast 2.0 kaudu saadetud väliste teavituste logi vaatamine ja ebaõnnestunud teavituste uuesti saatmine (UC-02/UC-04)',
     'ljvis2')
ON CONFLICT (code) DO NOTHING;
