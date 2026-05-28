-- page: INTEGER, pageSize: INTEGER, search: VARCHAR (optional)
SELECT
  cl.id                AS "id",
  cl.classifier_id     AS "classifierId",
  cl.code              AS "code",
  cl.name              AS "name",
  cl.description       AS "description",
  cl.created_at        AS "createdAt",
  cl.created_by        AS "createdBy",
  COUNT(*) OVER ()     AS "totalCount"
FROM classifier_latest cl
WHERE cl.id = (
  SELECT MAX(id) FROM classifier_latest WHERE classifier_id = cl.classifier_id
)
AND (
  :search IS NULL
  OR LOWER(cl.name) LIKE LOWER(CONCAT('%', :search, '%'))
  OR LOWER(cl.code) LIKE LOWER(CONCAT('%', :search, '%'))
)
ORDER BY cl.name ASC
LIMIT  :pageSize
OFFSET ((:page - 1) * :pageSize);
