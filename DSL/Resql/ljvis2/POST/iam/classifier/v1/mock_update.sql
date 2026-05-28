-- mock: tagastab hardcoded classifier_name_state kinnitusrida
SELECT
  5001               AS "id",
  1                  AS "classifierId",
  'Riik/Territoorium (uuendatud)' AS "name",
  'Uuendatud kirjeldus' AS "description",
  now()              AS "createdAt",
  1                  AS "createdBy";
