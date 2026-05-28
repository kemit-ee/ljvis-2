-- mock: tagastab hardcoded kehtivusperioodi uuenduse kinnitusrida
SELECT
  6002                    AS "id",
  2001                    AS "classifierValueId",
  '2026-03-01'::DATE      AS "validFrom",
  '2027-12-31'::DATE      AS "validUntil",
  now()                   AS "createdAt",
  1                       AS "createdBy";
