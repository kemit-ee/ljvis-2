-- mock: tagastab hardcoded liikme lisamise kinnitus
SELECT
  55       AS "membershipId",
  'active' AS "status",
  now()    AS "createdAt";
