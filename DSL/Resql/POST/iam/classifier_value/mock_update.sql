-- mock: tagastab uuendatud klassifikaatori väärtuse
SELECT
  t."classifierValueId",
  t."classifierId",
  t."code",
  t."name",
  t."validFrom",
  t."validUntil",
  t."isValid"
FROM (
  VALUES
    (137, 1, 'DE', 'Saksamaa', '2020-01-01'::DATE, '2026-06-01'::DATE, false)
) AS t("classifierValueId", "classifierId", "code", "name", "validFrom", "validUntil", "isValid");
