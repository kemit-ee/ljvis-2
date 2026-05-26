-- mock: tagastab klassifikaatorite pagineeritud nimekirja
SELECT
  t."classifierId",
  t."code",
  t."name",
  t."description",
  t."totalCount",
  t."page",
  t."pageSize"
FROM (
  VALUES
    (1, 'RTK', 'Riikide ja territooriumide klassifikaator', 'ISO 3166', 3, 1, 20),
    (2, 'SEVERITY', 'Rikkumise raskusaste', 'Rikkumiste raskusastmed', 3, 1, 20),
    (3, 'VEHICLE_CAT', 'Sõiduki kategooria', 'Sõidukite kategooriad', 3, 1, 20)
) AS t("classifierId", "code", "name", "description", "totalCount", "page", "pageSize");
