SELECT
    cvl.classifier_id,
    cvl.classifier_value_id,
    cvl.classifier_code,
    cvl.code,
    cvl.name,
    cvl.valid_from,
    cvl.valid_until,
    cvl.is_valid,
    COUNT(*) OVER () AS total
FROM ljvis2.classifier_value_latest cvl
WHERE cvl.classifier_id = :classifierId::BIGINT
  AND cvl.id = (
    SELECT MAX(id) FROM ljvis2.classifier_value_latest WHERE classifier_value_id = cvl.classifier_value_id
  )
  AND (COALESCE(:search, '') = ''
       OR cvl.classifier_code ILIKE '%' || COALESCE(:search, '') || '%'
       OR cvl.name ILIKE '%' || COALESCE(:search, '') || '%')
ORDER BY
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'isValid desc'  THEN cvl.is_valid END DESC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'isValid asc'   THEN cvl.is_valid END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'code asc'     THEN cvl.code COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'code desc'    THEN cvl.code COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'name asc'     THEN cvl.name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'isValid desc') = 'name desc'    THEN cvl.name COLLATE "et-EE-x-icu" END DESC,
    cvl.is_valid DESC,
    cvl.code COLLATE "et-EE-x-icu"
LIMIT :pageSize::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :pageSize::INTEGER);