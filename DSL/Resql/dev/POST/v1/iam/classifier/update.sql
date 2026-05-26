-- classifierId: BIGINT, name: VARCHAR, description: VARCHAR, code: VARCHAR, createdBy: BIGINT
WITH current_classifier AS (
  SELECT
    cl.classifier_id,
    cl.code,
    cl.name,
    cl.description
  FROM classifier_latest cl
  WHERE NOT EXISTS (
    SELECT 1
    FROM classifier_latest newer
    WHERE newer.classifier_id = cl.classifier_id
      AND newer.created_at > cl.created_at
  )
    AND cl.classifier_id = :classifierId
  LIMIT 1
),
validated AS (
  SELECT
    cc.classifier_id,
    cc.code,
    CASE
      WHEN :name IS NULL OR length(trim(:name)) = 0 THEN cc.name
      ELSE :name
    END AS new_name,
    CASE
      WHEN :description IS NULL THEN cc.description
      ELSE :description
    END AS new_description
  FROM current_classifier cc
  WHERE :code IS NULL OR cc.code = :code
),
ins_state AS (
  INSERT INTO classifier_name_state (classifier_id, name, description, created_by)
  SELECT
    v.classifier_id,
    v.new_name,
    v.new_description,
    :createdBy
  FROM validated v
  RETURNING classifier_id
),
ins_latest AS (
  INSERT INTO classifier_latest (classifier_id, code, name, description, created_by)
  SELECT
    v.classifier_id,
    v.code,
    (
      SELECT s.name
      FROM classifier_name_state s
      WHERE s.classifier_id = v.classifier_id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    (
      SELECT s.description
      FROM classifier_name_state s
      WHERE s.classifier_id = v.classifier_id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    :createdBy
  FROM validated v
  RETURNING classifier_id
)
SELECT
  cl.classifier_id AS "classifierId",
  cl.code AS "code",
  cl.name AS "name",
  cl.description AS "description"
FROM classifier_latest cl
WHERE cl.classifier_id = (
  SELECT il.classifier_id
  FROM ins_latest il
  LIMIT 1
)
ORDER BY cl.created_at DESC
LIMIT 1;
