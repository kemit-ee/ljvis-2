-- mock: kontrollib väärtuse koodi olemasolu
SELECT
  t."exists"
FROM (
  VALUES
    (false)
) AS t("exists");
