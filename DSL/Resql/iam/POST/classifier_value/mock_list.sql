-- mock: tagastab klassifikaatori väärtuste pagineeritud nimekirja
SELECT
  t."classifierValueId",
  t."code",
  t."name",
  t."validFrom",
  t."validUntil",
  t."isValid",
  t."totalCount",
  t."page",
  t."pageSize"
FROM (
  VALUES
    (10, 'EE', 'Eesti', '2020-01-01'::DATE, NULL::DATE, true, 3, 1, 20),
    (11, 'DE', 'Saksamaa', '2020-01-01'::DATE, NULL::DATE, true, 3, 1, 20),
    (12, 'GB', 'Suurbritannia', '2020-01-01'::DATE, '2024-01-01'::DATE, false, 3, 1, 20)
) AS t("classifierValueId", "code", "name", "validFrom", "validUntil", "isValid", "totalCount", "page", "pageSize");
