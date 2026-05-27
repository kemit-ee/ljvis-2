-- mock: tagastab ühe hardcoded kasutajagrupi
SELECT
  1                            AS "userGroupId",
  'Administraatorid'           AS "name",
  '[{"id":1,"name":"Põhja prefektuur"}]'::JSONB AS "organisations",
  '[{"id":1,"code":"user.list.admin"}]'::JSONB  AS "permissions",
  false                        AS "coversAllOrganisations",
  now()                        AS "createdAt";
