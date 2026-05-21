-- classifierId: BIGINT, code: VARCHAR, name: VARCHAR, validFrom: DATE, validUntil: DATE, createdBy: BIGINT
WITH ins_value AS (
  INSERT INTO classifier_value (classifier_id, code, name, created_by)
  VALUES (:classifierId, :code, :name, :createdBy)
  RETURNING id, classifier_id, code, name
),
ins_validity AS (
  INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
  SELECT
    iv.id,
    :validFrom,
    :validUntil,
    :createdBy
  FROM ins_value iv
  RETURNING classifier_value_id
),
ins_latest AS (
  INSERT INTO classifier_value_latest (
    classifier_value_id,
    classifier_id,
    classifier_code,
    code,
    name,
    valid_from,
    valid_until,
    is_valid,
    created_by
  )
  SELECT
    iv.id,
    iv.classifier_id,
    (
      SELECT c.code
      FROM classifier c
      WHERE c.id = iv.classifier_id
      LIMIT 1
    ),
    iv.code,
    iv.name,
    (
      SELECT s.valid_from
      FROM classifier_value_validity_state s
      WHERE s.classifier_value_id = iv.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    (
      SELECT s.valid_until
      FROM classifier_value_validity_state s
      WHERE s.classifier_value_id = iv.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    (
      SELECT (s.valid_from <= CURRENT_DATE AND (s.valid_until IS NULL OR s.valid_until > CURRENT_DATE))
      FROM classifier_value_validity_state s
      WHERE s.classifier_value_id = iv.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    :createdBy
  FROM ins_value iv
  RETURNING classifier_value_id
)
SELECT
  cvl.classifier_value_id AS "classifierValueId",
  cvl.classifier_id AS "classifierId",
  cvl.code AS "code",
  cvl.name AS "name",
  cvl.valid_from AS "validFrom",
  cvl.valid_until AS "validUntil",
  cvl.is_valid AS "isValid"
FROM classifier_value_latest cvl
WHERE cvl.classifier_value_id = (
  SELECT il.classifier_value_id
  FROM ins_latest il
  LIMIT 1
)
ORDER BY cvl.created_at DESC
LIMIT 1;
