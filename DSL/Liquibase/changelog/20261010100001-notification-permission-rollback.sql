-- liquibase formatted sql
-- changeset ljvis:20261010100001 ignore:true splitStatements:false
-- Rollback: 20261010100001-notification-permission (kutsutakse ainult .xml <rollback> kaudu)
-- NB: user_group ridu ei saa rollback-ida (append-only mudel).
-- Uuemad read jäävad, kuid kuna permission kirje kustutatakse,
-- ei mõjuta see runtime käitumist — permission kontrolli ei läbi.
DELETE FROM users.permission WHERE code = 'notification.admin';
