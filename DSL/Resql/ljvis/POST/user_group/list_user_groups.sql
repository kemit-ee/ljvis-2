/*
declaration:
  version: 0.1
  description: "List all user groups with their organisations"
  method: post
  namespace: user_group
  returns: json
  allowlist:
    body:
      - field: search
        type: string
        description: "Search by group name or organisation name"
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: sorting
        type: string
        description: "Sort column and direction"
      - field: organisation_id
        type: string
        description: "Filter by organisation ID (for local admin)"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
      - field: organisations
        type: array
        description: "Array of organisation names"
      - field: total
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_id)
        user_group_id,
        name,
        organisations,
        covers_all_organisations
    FROM ljvis2.user_group_latest
    ORDER BY user_group_id, created_at DESC
)
SELECT
    l.user_group_id AS id,
    l.name,
    COALESCE(
        (SELECT ARRAY_AGG(elem->>'name')
         FROM JSONB_ARRAY_ELEMENTS(l.organisations) AS elem),
        ARRAY[]::TEXT[]
    ) AS organisations,
    l.covers_all_organisations,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (
        COALESCE(:organisation_id, '') = ''
        OR EXISTS (
            SELECT 1
            FROM JSONB_ARRAY_ELEMENTS(l.organisations) AS elem
            WHERE (elem->>'id')::BIGINT = :organisation_id::BIGINT
        )
    )
    AND (
        COALESCE(:search, '') = ''
        OR l.name ILIKE '%' || COALESCE(:search, '') || '%'
        OR EXISTS (
            SELECT 1
            FROM JSONB_ARRAY_ELEMENTS(l.organisations) AS elem
            WHERE elem->>'name' ILIKE '%' || COALESCE(:search, '') || '%'
        )
    )
ORDER BY
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name asc'            THEN l.name          END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name desc'           THEN l.name          END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations asc'   THEN l.organisations END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations desc'  THEN l.organisations END DESC,
    l.name ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
