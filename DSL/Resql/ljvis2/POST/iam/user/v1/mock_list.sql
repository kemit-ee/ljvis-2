-- mock: tagastab 2 hardcoded kasutajat
SELECT
  101                          AS "userId",
  '38001010001'                AS "personalCode",
  'Mart'                       AS "firstName",
  'Tamm'                       AS "lastName",
  'mart.tamm@politsei.ee'      AS "email",
  1                            AS "organisationId",
  'Põhja prefektuur'           AS "organisationName",
  'active'                     AS "status",
  '2023-01-01'::DATE           AS "accessStart",
  NULL::DATE                   AS "accessEnd",
  '[{"id":1,"name":"Administraatorid"}]'::JSONB AS "userGroups",
  2                            AS "totalCount"
UNION ALL
SELECT
  102                          AS "userId",
  '49002020002'                AS "personalCode",
  'Liis'                       AS "firstName",
  'Kask'                       AS "lastName",
  'liis.kask@politsei.ee'      AS "email",
  1                            AS "organisationId",
  'Põhja prefektuur'           AS "organisationName",
  'inactive'                   AS "status",
  '2022-03-15'::DATE           AS "accessStart",
  '2024-12-31'::DATE           AS "accessEnd",
  '[]'::JSONB                  AS "userGroups",
  2                            AS "totalCount";
