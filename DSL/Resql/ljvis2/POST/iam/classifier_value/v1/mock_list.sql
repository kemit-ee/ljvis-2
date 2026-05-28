-- mock: tagastab 3 hardcoded klassifikaatori väärtust
SELECT
  2001                    AS "id",
  1                       AS "classifierValueId",
  1                       AS "classifierId",
  'RIIK'                  AS "classifierCode",
  'EE'                    AS "code",
  'Eesti'                 AS "name",
  '2020-01-01'::DATE      AS "validFrom",
  NULL::DATE              AS "validUntil",
  true                    AS "isValid",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                       AS "createdBy",
  3                       AS "totalCount"
UNION ALL
SELECT
  2002                    AS "id",
  2                       AS "classifierValueId",
  1                       AS "classifierId",
  'RIIK'                  AS "classifierCode",
  'FI'                    AS "code",
  'Soome'                 AS "name",
  '2020-01-01'::DATE      AS "validFrom",
  NULL::DATE              AS "validUntil",
  true                    AS "isValid",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                       AS "createdBy",
  3                       AS "totalCount"
UNION ALL
SELECT
  2003                    AS "id",
  3                       AS "classifierValueId",
  1                       AS "classifierId",
  'RIIK'                  AS "classifierCode",
  'LV'                    AS "code",
  'Läti'                  AS "name",
  '2020-01-01'::DATE      AS "validFrom",
  '2026-12-31'::DATE      AS "validUntil",
  false                   AS "isValid",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                       AS "createdBy",
  3                       AS "totalCount";
