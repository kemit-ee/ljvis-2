-- mock: tagastab hardcoded snapshot kinnitusrida
SELECT
  1                  AS "userGroupId",
  'Administraatorid' AS "name",
  false              AS "coversAllOrganisations",
  now()              AS "createdAt";
