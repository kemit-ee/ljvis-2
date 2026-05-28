-- mock: tagastab hardcoded loodud classifier_value kinnitusrida
SELECT
  2010               AS "id",
  1                  AS "classifierId",
  'NO'               AS "code",
  'Norra'            AS "name",
  now()              AS "createdAt",
  1                  AS "createdBy";
