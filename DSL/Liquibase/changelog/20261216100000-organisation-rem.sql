-- liquibase formatted sql
-- changeset ljvis:20261216100000 ignore:true splitStatements:false
--
-- Uus asutus: Regionaal- ja Põllumajandusministeerium (REPM).
-- Idempotentne: ON CONFLICT (code) DO NOTHING.

INSERT INTO users.organisation (name, code, created_by) VALUES
    ('Regionaal- ja Põllumajandusministeerium', 'REPM', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
