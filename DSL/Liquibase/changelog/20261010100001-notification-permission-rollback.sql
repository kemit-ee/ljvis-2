-- Rollback: 20261010100001-notification-permission
-- NB: user_group ridu ei saa rollback-ida (append-only mudel).
-- Uuemad read jäävad, kuid kuna permission kirje kustutatakse,
-- ei mõjuta see runtime käitumist — permission kontrolli ei läbi.
DELETE FROM users.permission WHERE code = 'notification.admin';
