-- liquibase formatted sql
-- changeset ljvis:20261116100000 ignore:true
-- Rollback: eemalda arhiiv-skeem. NB: rollback puhul tuleb ka töö-baasi
-- Ruuteri fallback-sammud eemaldada (DSL ja migratsioon käivad koos).

DROP SCHEMA IF EXISTS archive CASCADE;
