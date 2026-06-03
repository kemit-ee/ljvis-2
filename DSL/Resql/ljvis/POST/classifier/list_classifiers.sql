/*
declaration:
  version: 0.1
  description: "List all classifiers"
  method: post
  namespace: classifier
  returns: json
  allowlist:
    body:
      - field: search
        type: string
        description: "Search by classifier code or name"
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: sorting
        type: string
        description: "Sort column and direction (code, name)"
  response:
    fields:
      - field: id
        type: string
      - field: code
        type: string
      - field: name
        type: string
      - field: description
        type: string
      - field: total
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (classifier_id)
        id,
        classifier_id,
        code,
        name,
        description
    FROM ljvis2.classifier_latest
    ORDER BY classifier_id, created_at DESC
)
SELECT
    l.classifier_id AS id,
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
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name asc'  THEN l.name  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name desc' THEN l.name  END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'code asc'  THEN l.code  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'code desc' THEN l.code  END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'description asc'  THEN l.description  END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'description desc' THEN l.description  END DESC,
    l.code ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
