-- liquibase formatted sql
-- changeset ljvis:20261020110000-rollback ignore:true

-- Kustuta ainult 2. taseme rikked (parent_key NOT NULL); 1. tase (CAA_0..CAA_9)
-- jääb (see tuleb 20260803150000-st).
DELETE FROM classifier.classifier_value
WHERE classifier_key = (
        SELECT classifier_key FROM classifier.classifier
        WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1
      )
  AND parent_key IS NOT NULL
  AND code LIKE 'CAA_%.%';
