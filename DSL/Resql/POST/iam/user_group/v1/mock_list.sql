-- mock: tagastab 2 hardcoded kasutajagruppi
SELECT
  1                            AS "userGroupId",
  'Administraatorid'           AS "name",
  '[{"id":1,"name":"Põhja prefektuur"}]'::JSONB AS "organisations",
  '[{"id":1,"code":"user.list.admin"}]'::JSONB  AS "permissions",
  false                        AS "coversAllOrganisations",
  2                            AS "totalCount"
UNION ALL
SELECT
  2                            AS "userGroupId",
  'Inspektorid'                AS "name",
  '[{"id":1,"name":"Põhja prefektuur"},{"id":2,"name":"Lõuna prefektuur"}]'::JSONB AS "organisations",
  '[{"id":2,"code":"user.read.local"}]'::JSONB  AS "permissions",
  false                        AS "coversAllOrganisations",
  2                            AS "totalCount";
