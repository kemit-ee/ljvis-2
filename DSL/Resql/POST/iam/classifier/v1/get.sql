-- classifierId: BIGINT
SELECT
  cl.id                AS "id",
  cl.classifier_id     AS "classifierId",
  cl.code              AS "code",
  cl.name              AS "name",
  cl.description       AS "description",
  cl.created_at        AS "createdAt",
  cl.created_by        AS "createdBy"
FROM classifier_latest cl
WHERE cl.classifier_id = :classifierId
AND cl.id = (
  SELECT MAX(id) FROM classifier_latest WHERE classifier_id = :classifierId
);
