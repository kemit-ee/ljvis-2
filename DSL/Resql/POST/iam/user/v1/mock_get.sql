-- mock: tagastab ühe hardcoded kasutaja
SELECT
  101                          AS "userId",
  '38001010001'                AS "personalCode",
  'Mart'                       AS "firstName",
  'Tamm'                       AS "lastName",
  'mart.tamm@politsei.ee'      AS "email",
  '5551234'                    AS "phone",
  'PÕHJA PREFEKTUUR'           AS "structuralUnit",
  'Vaneminspektor'             AS "jobTitle",
  1                            AS "organisationId",
  'Põhja prefektuur'           AS "organisationName",
  'active'                     AS "status",
  '2023-01-01'::DATE           AS "accessStart",
  NULL::DATE                   AS "accessEnd",
  '[{"id":1,"name":"Administraatorid"}]'::JSONB AS "userGroups";
