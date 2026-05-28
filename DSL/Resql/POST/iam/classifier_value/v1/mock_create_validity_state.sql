-- mock: tagastab hardcoded classifier_value_validity_state kinnitusrida
SELECT
  6001                    AS "id",
  2010                    AS "classifierValueId",
  '2026-01-01'::DATE      AS "validFrom",
  NULL::DATE              AS "validUntil",
  now()                   AS "createdAt",
  1                       AS "createdBy";
