-- classifierId: BIGINT, code: VARCHAR
SELECT
  cl.classifier_id AS "classifierId",
  cl.code AS "code",
  cl.name AS "name",
  cl.description AS "description"
FROM classifier_latest cl
WHERE NOT EXISTS (
  SELECT 1
  FROM classifier_latest newer
  WHERE newer.classifier_id = cl.classifier_id
    AND newer.created_at > cl.created_at
)
  AND (
    (:classifierId IS NOT NULL AND cl.classifier_id = :classifierId)
    OR (:code IS NOT NULL AND cl.code = :code)
  )
ORDER BY cl.created_at DESC
LIMIT 1;
