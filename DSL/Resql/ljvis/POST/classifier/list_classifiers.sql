/*
description: "List all classifiers"
namespace: classifier
params:
  search:
    type: string
    required: false
    description: "Search by classifier code or name"
  sorting:
    type: string
    required: false
    description: "Sort column and direction (code, name)"
  pageSize:
    type: string
    required: false
  page:
    type: number
    required: false
    description: "Page number"
returns:
  - name: id
    type: string
    nullable: true
  - name: code
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
  - name: description
    type: string
    nullable: true
  - name: total
    type: number
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (classifier_key)
        classifier_key,
        code,
        name,
        description
    FROM classifier.classifier
    ORDER BY classifier_key, created_at DESC
)
SELECT
    l.classifier_key AS id,
    l.code,
    l.name,
    l.description,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    COALESCE(:search, '') = ''
    OR l.code ILIKE '%' || COALESCE(:search, '') || '%'
    OR l.name ILIKE '%' || COALESCE(:search, '') || '%'
ORDER BY
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name asc'  THEN l.name COLLATE "et-EE-x-icu"  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name desc' THEN l.name COLLATE "et-EE-x-icu"  END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'code asc'  THEN l.code COLLATE "et-EE-x-icu"  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'code desc' THEN l.code COLLATE "et-EE-x-icu"  END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'description asc'  THEN l.description COLLATE "et-EE-x-icu"  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'description desc' THEN l.description COLLATE "et-EE-x-icu"  END DESC,
    l.code COLLATE "et-EE-x-icu" ASC
LIMIT :pageSize::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :pageSize::INTEGER);
