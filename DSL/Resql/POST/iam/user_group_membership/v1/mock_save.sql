-- mock: tagastab hardcoded liikmelisuse kinnituse
SELECT
  42       AS "membershipId",
  'active' AS "status",
  now()    AS "createdAt";
