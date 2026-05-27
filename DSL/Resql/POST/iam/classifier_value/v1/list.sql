-- classifierId: BIGINT, page: INTEGER, pageSize: INTEGER
SELECT
  cvl.id                   AS "id",
  cvl.classifier_value_id  AS "classifierValueId",
  cvl.classifier_id        AS "classifierId",
  cvl.classifier_code      AS "classifierCode",
  cvl.code                 AS "code",
  cvl.name                 AS "name",
  cvl.valid_from           AS "validFrom",
  cvl.valid_until          AS "validUntil",
  cvl.is_valid             AS "isValid",
  cvl.created_at           AS "createdAt",
  cvl.created_by           AS "createdBy",
  COUNT(*) OVER ()         AS "totalCount"
FROM classifier_value_latest cvl
WHERE cvl.classifier_id = :classifierId
AND cvl.id = (
  SELECT MAX(id) FROM classifier_value_latest WHERE classifier_value_id = cvl.classifier_value_id
)
ORDER BY cvl.code ASC
LIMIT  :pageSize
OFFSET ((:page - 1) * :pageSize);
