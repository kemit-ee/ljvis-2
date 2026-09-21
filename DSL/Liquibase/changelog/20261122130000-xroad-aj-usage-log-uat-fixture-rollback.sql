-- liquibase formatted sql
-- changeset ljvis:20261122130000 ignore:true splitStatements:false
-- Rollback: eemalda UAT-testandmed, mis lisati 20261122130000-xroad-aj-usage-log-uat-fixture.sql-iga.

DELETE FROM xroad.aj_usage_log
WHERE user_code = '60001019906' AND action LIKE 'LJVIS-UAT-testandmed:%';
