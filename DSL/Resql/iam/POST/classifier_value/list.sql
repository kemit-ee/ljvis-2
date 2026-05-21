-- classifierId: BIGINT, activeOnly: BOOLEAN, sortField: VARCHAR, sortDirection: VARCHAR, page: INTEGER, pageSize: INTEGER
WITH filtered AS (
  SELECT
    cvl.classifier_value_id,
    cvl.classifier_id,
    cvl.code,
    cvl.name,
    cvl.valid_from,
    cvl.valid_until,
    cvl.is_valid,
    cvl.created_at
  FROM classifier_value_latest cvl
  WHERE cvl.classifier_id = :classifierId
    AND NOT EXISTS (
      SELECT 1
      FROM classifier_value_latest newer
      WHERE newer.classifier_value_id = cvl.classifier_value_id
        AND newer.created_at > cvl.created_at
    )
    AND (
      coalesce(:activeOnly, true) = false
      OR cvl.is_valid = true
    )
),
paged AS (
  SELECT
    f.classifier_value_id,
    f.code,
    f.name,
    f.valid_from,
    f.valid_until,
    f.is_valid,
    count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    f.is_valid DESC,
    CASE WHEN coalesce(:sortField, 'code') = 'code' AND coalesce(:sortDirection, 'asc') = 'asc' THEN lower(f.code) END ASC,
    CASE WHEN coalesce(:sortField, 'code') = 'code' AND coalesce(:sortDirection, 'asc') = 'desc' THEN lower(f.code) END DESC,
    CASE WHEN coalesce(:sortField, 'code') = 'name' AND coalesce(:sortDirection, 'asc') = 'asc' THEN lower(f.name) END ASC,
    CASE WHEN coalesce(:sortField, 'code') = 'name' AND coalesce(:sortDirection, 'asc') = 'desc' THEN lower(f.name) END DESC,
    CASE WHEN coalesce(:sortField, 'code') = 'validFrom' AND coalesce(:sortDirection, 'asc') = 'asc' THEN f.valid_from END ASC,
    CASE WHEN coalesce(:sortField, 'code') = 'validFrom' AND coalesce(:sortDirection, 'asc') = 'desc' THEN f.valid_from END DESC,
    CASE WHEN coalesce(:sortField, 'code') = 'validUntil' AND coalesce(:sortDirection, 'asc') = 'asc' THEN f.valid_until END ASC,
    CASE WHEN coalesce(:sortField, 'code') = 'validUntil' AND coalesce(:sortDirection, 'asc') = 'desc' THEN f.valid_until END DESC,
    lower(f.code) ASC
  LIMIT coalesce(:pageSize, 20)
  OFFSET ((GREATEST(coalesce(:page, 1), 1) - 1) * coalesce(:pageSize, 20))
)
SELECT
  p.classifier_value_id AS "classifierValueId",
  p.code AS "code",
  p.name AS "name",
  p.valid_from AS "validFrom",
  p.valid_until AS "validUntil",
  p.is_valid AS "isValid",
  p.total_count AS "totalCount",
  GREATEST(coalesce(:page, 1), 1) AS "page",
  coalesce(:pageSize, 20) AS "pageSize"
FROM paged p;
