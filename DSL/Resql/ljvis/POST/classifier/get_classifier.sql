SELECT
    cl.classifier_id     AS "id",
    cl.code              AS "code",
    cl.name              AS "name",
    cl.description       AS "description",
    cl.created_at        AS "createdAt",
    cl.created_by        AS "createdBy"
FROM ljvis2.classifier_latest cl
WHERE cl.classifier_id = :id::BIGINT
  AND cl.id = (
    SELECT MAX(id) FROM ljvis2.classifier_latest WHERE classifier_id = :id::BIGINT
);