-- liquibase formatted sql
-- changeset ljvis:20260828109000-rollback ignore:true

DELETE FROM users.permission WHERE code IN ('xtee.query.rahvastikuregister');
