-- liquibase formatted sql
-- changeset ljvis:20260827100000-rollback ignore:true

DROP TABLE IF EXISTS risk.company_risk_score CASCADE;
DROP SCHEMA IF EXISTS risk CASCADE;
