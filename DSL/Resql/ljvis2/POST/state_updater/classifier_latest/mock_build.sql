-- mock: tagastab hardcoded classifier_latest snapshot kinnitusrida
SELECT
  9001               AS "id",
  1                  AS "classifierId",
  'RIIK'             AS "code",
  'Riik/Territoorium (uuendatud)' AS "name",
  'Uuendatud kirjeldus' AS "description",
  now()              AS "createdAt",
  1                  AS "createdBy";
