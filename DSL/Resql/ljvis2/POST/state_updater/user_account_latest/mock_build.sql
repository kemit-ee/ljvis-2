-- mock: tagastab hardcoded snapshot kinnitusrida
SELECT
  101                     AS "userId",
  'Mart'                  AS "firstName",
  'Tamm'                  AS "lastName",
  'active'                AS "status",
  'Põhja prefektuur'      AS "organisationName",
  now()                   AS "createdAt";
