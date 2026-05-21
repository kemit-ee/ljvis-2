-- mock: tagastab uuendatud klassifikaatori päise
SELECT
  t."classifierId",
  t."code",
  t."name",
  t."description"
FROM (
  VALUES
    (1, 'RTK', 'Riikide ja territooriumide klassifikaator', 'ISO 3166 alusel')
) AS t("classifierId", "code", "name", "description");
