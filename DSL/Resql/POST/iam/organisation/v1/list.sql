-- no parameters — returns full organisation catalogue
SELECT
  id   AS "id",
  name AS "name",
  code AS "code"
FROM organisation
ORDER BY name ASC;
