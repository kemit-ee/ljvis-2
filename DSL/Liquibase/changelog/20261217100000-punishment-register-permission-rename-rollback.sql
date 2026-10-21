-- liquibase formatted sql
-- changeset ljvis:20261217100000-rollback ignore:true

UPDATE users.permission
SET description = 'Karistusregistri kasutaja: menetluse tulemuse sisestamine ja kontrollvormi käsitsi avalikustamine'
WHERE code = 'control_form.punishment_register';
