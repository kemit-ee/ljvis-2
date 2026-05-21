-- searchTerm: VARCHAR, sortField: VARCHAR, sortDirection: VARCHAR, page: INTEGER, pageSize: INTEGER
WITH filtered AS (
  SELECT
    cl.classifier_id,
    cl.code,
    cl.name,
    cl.description,
    cl.created_at
  FROM classifier_latest cl
  WHERE NOT EXISTS (
    SELECT 1
    FROM classifier_latest newer
    WHERE newer.classifier_id = cl.classifier_id
      AND newer.created_at > cl.created_at
  )
    AND (
      :searchTerm IS NULL
      OR length(trim(:searchTerm)) < 3
      OR cl.code ILIKE '%' || :searchTerm || '%'
      OR cl.name ILIKE '%' || :searchTerm || '%'
    )
),
paged AS (
  SELECT
    f.classifier_id,
    f.code,
    f.name,
    f.description,
    count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN coalesce(:sortField, 'name') = 'code' AND coalesce(:sortDirection, 'asc') = 'asc' THEN lower(f.code) END ASC,
    CASE WHEN coalesce(:sortField, 'name') = 'code' AND coalesce(:sortDirection, 'asc') = 'desc' THEN lower(f.code) END DESC,
    CASE WHEN coalesce(:sortField, 'name') = 'name' AND coalesce(:sortDirection, 'asc') = 'asc' THEN lower(f.name) END ASC,
    CASE WHEN coalesce(:sortField, 'name') = 'name' AND coalesce(:sortDirection, 'asc') = 'desc' THEN lower(f.name) END DESC,
    lower(f.name) ASC,
    lower(f.code) ASC
  LIMIT coalesce(:pageSize, 20)
  OFFSET ((GREATEST(coalesce(:page, 1), 1) - 1) * coalesce(:pageSize, 20))
)
SELECT
  p.classifier_id AS "classifierId",
  p.code AS "code",
  p.name AS "name",
  p.description AS "description",
  p.total_count AS "totalCount",
  GREATEST(coalesce(:page, 1), 1) AS "page",
  coalesce(:pageSize, 20) AS "pageSize"
FROM paged p;
