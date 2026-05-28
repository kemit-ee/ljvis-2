-- mock: tagastab hardcoded classifier_value_latest snapshot kinnitusrida
SELECT
  9002                    AS "id",
  2010                    AS "classifierValueId",
  1                       AS "classifierId",
  'RIIK'                  AS "classifierCode",
  'NO'                    AS "code",
  'Norra'                 AS "name",
  '2026-01-01'::DATE      AS "validFrom",
  NULL::DATE              AS "validUntil",
  true                    AS "isValid",
  now()                   AS "createdAt",
  1                       AS "createdBy";
