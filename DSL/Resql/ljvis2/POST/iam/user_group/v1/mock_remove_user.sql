-- mock: tagastab hardcoded eemaldamise kinnitus
SELECT
  55         AS "membershipId",
  'removed'  AS "status",
  now()      AS "createdAt";
