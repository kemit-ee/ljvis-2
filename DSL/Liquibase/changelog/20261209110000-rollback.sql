-- liquibase formatted sql
-- changeset ljvis:20261209110000-rollback ignore:true

-- Kustutab kõik selle migratsiooni poolt lisatud read (uued level2 kirjed + relokeeritud
-- snapshot-read) tunnusmärgi created_by järgi. Relokeeritud lastele taastub automaatselt
-- eelmine (vana parent_key'ga) snapshot-rida kui uusim, kuna see jääb puutumata.
DELETE FROM classifier.classifier_value
WHERE created_by = 'system:lif-violation-split-20261209110000';
