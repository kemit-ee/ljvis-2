-- classifierId: BIGINT, code: VARCHAR
SELECT EXISTS (
  SELECT 1 FROM classifier_value
  WHERE classifier_id = :classifierId
  AND code = :code
) AS "exists";
