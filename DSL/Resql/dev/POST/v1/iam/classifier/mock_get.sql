-- mock: tagastab ühe klassifikaatori päise
SELECT
  t."classifierId",
  t."code",
  t."name",
  t."description"
FROM (
  VALUES
    (1, 'RTK', 'Riikide ja territooriumide klassifikaator', 'ISO 3166')
) AS t("classifierId", "code", "name", "description");
