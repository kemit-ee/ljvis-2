-- mock: tagastab 2 liiget
SELECT
  101              AS "userId",
  'Mart'           AS "firstName",
  'Tamm'           AS "lastName",
  '38001010001'    AS "personalCode",
  'Põhja prefektuur' AS "organisationName",
  'active'         AS "status",
  2                AS "totalCount"
UNION ALL
SELECT
  102              AS "userId",
  'Liis'           AS "firstName",
  'Kask'           AS "lastName",
  '49002020002'    AS "personalCode",
  'Põhja prefektuur' AS "organisationName",
  'active'         AS "status",
  2                AS "totalCount";
