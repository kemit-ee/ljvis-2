-- liquibase formatted sql
-- changeset ljvis:20261229100000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: läveta rikkumistel (nt art 8 lg 6b, Rooma I, lähetamine)
-- on tase-3 `name` lihtsalt raskusastme silt (VSI/MI/...). 2016/403 I lisaga
-- joondamine muutis ainult `description`'it (raskusastet), nii et nimi jäi
-- vana sildiga ja kuvati koodi kõrval valesti (nt "VSI843 • VSI", kuigi
-- raskusaste on MSI). Viib nime kooskõlla praeguse raskusastmega.
-- Kood ei muutu. Idempotentne.

UPDATE classifier.classifier_value cv
SET name = cv.description
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier
                            WHERE code = 'DRIVING_VIOLATION'
                            ORDER BY created_at DESC LIMIT 1)
  AND cv.parent_key IS NOT NULL
  AND cv.name IN ('MI', 'SI', 'VSI', 'MSI')
  AND cv.description IN ('MI', 'SI', 'VSI', 'MSI')
  AND cv.name <> cv.description;
