-- liquibase formatted sql
-- changeset ljvis:20261202100000 ignore:true
-- Raskusastmete nimetused ühtseks: MSI – kõige raskem rikkumine,
-- VSI – väga raske rikkumine, SI – raske rikkumine (MI – kergem rikkumine).
-- Seemned 20260828240000 (NCR_INFRINGEMENT_CATEGORY) ja 20260901120000
-- (DANGEROUS_GOODS_INFRINGEMENTS_NEW) kasutasid "väga tõsine" / "tõsine".
-- Idempotentne: UPDATE seab sama väärtuse uuesti.

UPDATE classifier.classifier_value
SET name = 'VSI — väga raske rikkumine'
WHERE code = 'VSI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_INFRINGEMENT_CATEGORY');

UPDATE classifier.classifier_value
SET name = 'SI — raske rikkumine'
WHERE code = 'SI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_INFRINGEMENT_CATEGORY');

UPDATE classifier.classifier
SET description = 'Raske rikkumise kategooria: MSI (kõige raskem rikkumine / Most Serious Infringement), VSI (väga raske rikkumine / Very Serious Infringement), SI (raske rikkumine / Serious Infringement). (ncrCategoryType)'
WHERE code = 'NCR_INFRINGEMENT_CATEGORY';

UPDATE classifier.classifier_value
SET name = 'Väga raske rikkumine (VSI)'
WHERE code = 'ADR_2_VSI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW');

UPDATE classifier.classifier_value
SET name = 'Raske rikkumine (SI)'
WHERE code = 'ADR_3_SI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW');
