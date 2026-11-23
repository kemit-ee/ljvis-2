-- liquibase formatted sql
-- changeset ljvis:20261229110000-rollback ignore:true splitStatements:false

-- Vanad (valed) koodid ja salvestatud vormide algsed väärtused ei ole taastatavad;
-- tahtlikult tühi. Aegunud ridu saab taastada käsitsi (valid_until = NULL).
SELECT 1;
