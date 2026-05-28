-- mock: tagastab 3 hardcoded klassifikaatorit
SELECT
  1001               AS "id",
  1                  AS "classifierId",
  'RIIK'             AS "code",
  'Riik/Territoorium' AS "name",
  'Riikide ja territooriumide loend' AS "description",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                  AS "createdBy",
  3                  AS "totalCount"
UNION ALL
SELECT
  1002               AS "id",
  2                  AS "classifierId",
  'DOKL'             AS "code",
  'Dokumendi liik'   AS "name",
  'Isikut tõendavate dokumentide liigid' AS "description",
  '2026-01-05T09:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                  AS "createdBy",
  3                  AS "totalCount"
UNION ALL
SELECT
  1003               AS "id",
  3                  AS "classifierId",
  'SUGU'             AS "code",
  'Sugu'             AS "name",
  'Soo klassifikaator' AS "description",
  '2026-02-01T08:30:00Z'::TIMESTAMPTZ AS "createdAt",
  1                  AS "createdBy",
  3                  AS "totalCount";
