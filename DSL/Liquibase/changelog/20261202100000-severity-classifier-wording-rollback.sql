-- liquibase formatted sql
-- changeset ljvis:20261202100000-rollback ignore:true

UPDATE classifier.classifier_value
SET name = 'VSI — väga tõsine rikkumine'
WHERE code = 'VSI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_INFRINGEMENT_CATEGORY');

UPDATE classifier.classifier_value
SET name = 'SI — tõsine rikkumine'
WHERE code = 'SI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_INFRINGEMENT_CATEGORY');

UPDATE classifier.classifier
SET description = 'Tõsise rikkumise kategooria: MSI (kõige raskem rikkumine / Most Serious Infringement), VSI (väga tõsine / Very Serious Infringement), SI (tõsine / Serious Infringement). (ncrCategoryType)'
WHERE code = 'NCR_INFRINGEMENT_CATEGORY';

UPDATE classifier.classifier_value
SET name = 'Väga tõsine rikkumine (VSI)'
WHERE code = 'ADR_2_VSI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW');

UPDATE classifier.classifier_value
SET name = 'Tõsine rikkumine (SI)'
WHERE code = 'ADR_3_SI'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'DANGEROUS_GOODS_INFRINGEMENTS_NEW');
