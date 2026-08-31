/*
declaration:
  version: 0.1
  description: "List classifier values for a given classifier with optional search and sorting"
  method: post
  namespace: classifier
  returns: json
  allowlist:
    body:
      - field: classifierId
        type: number
      - field: search
        type: string
      - field: sorting
        type: string
      - field: page
        type: number
      - field: pageSize
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (classifier_value_key)
        classifier_key,
        classifier_value_key,
        code,
        name,
        valid_from,
        valid_until,
        (valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until > CURRENT_DATE)) AS is_valid
    FROM classifier.classifier_value
    WHERE classifier_key = :classifierId::BIGINT
    ORDER BY classifier_value_key, created_at DESC
)
SELECT
    cvl.classifier_key        AS classifier_id,
    cvl.classifier_value_key  AS classifier_value_id,
    (SELECT DISTINCT ON (c.classifier_key) c.code
     FROM classifier.classifier c
     WHERE c.classifier_key = cvl.classifier_key
     ORDER BY c.classifier_key, c.created_at DESC) AS classifier_code,
    cvl.code,
    cvl.name,
    cvl.valid_from,
    cvl.valid_until,
    cvl.is_valid,
    COUNT(*) OVER ()          AS total
FROM latest cvl
WHERE (COALESCE(:search, '') = ''
       OR cvl.code ILIKE '%' || COALESCE(:search, '') || '%'
       OR cvl.name ILIKE '%' || COALESCE(:search, '') || '%')
ORDER BY
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'isValid desc'  THEN cvl.is_valid END DESC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'isValid asc'   THEN cvl.is_valid END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'code asc'      THEN cvl.code COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'code desc'     THEN cvl.code COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'name asc'      THEN cvl.name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'name desc'     THEN cvl.name COLLATE "et-EE-x-icu" END DESC,
    cvl.is_valid DESC,
    cvl.code COLLATE "et-EE-x-icu"
LIMIT :pageSize::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :pageSize::INTEGER);