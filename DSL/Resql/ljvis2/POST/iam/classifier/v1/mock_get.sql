-- mock: tagastab hardcoded klassifikaatori detailvaate
SELECT
  1001               AS "id",
  1                  AS "classifierId",
  'RIIK'             AS "code",
  'Riik/Territoorium' AS "name",
  'Riikide ja territooriumide loend' AS "description",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                  AS "createdBy";
