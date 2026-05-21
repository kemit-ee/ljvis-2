-- mock: tagastab loodud klassifikaatori väärtuse
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
    (137, 1, 'DE', 'Saksamaa', '2026-01-01'::DATE, NULL::DATE, true)
) AS t("classifierValueId", "classifierId", "code", "name", "validFrom", "validUntil", "isValid");
