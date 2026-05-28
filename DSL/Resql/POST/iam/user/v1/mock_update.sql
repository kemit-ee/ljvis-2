-- mock: tagastab hardcoded update kinnituse
SELECT
  101                      AS "userId",
  'Mart'                   AS "firstName",
  'Tamm'                   AS "lastName",
  'mart.tamm@politsei.ee'  AS "email",
  now()                    AS "createdAt";
