-- liquibase formatted sql
-- changeset ljvis:20260828300000-rollback ignore:true

DELETE FROM users.organisation WHERE code IN ('PPA', 'TI', 'MTA', 'ERAA', 'KLIM', 'TRAM');
