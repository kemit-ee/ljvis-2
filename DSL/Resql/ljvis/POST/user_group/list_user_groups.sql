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
        type: number
        description: "Filter by organisation ID (for local admin), 0 means no filter"
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
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        name,
        organisations,
        (CARDINALITY(organisations) = (SELECT COUNT(*)::INT FROM ljvis2.organisation)) AS covers_all_organisations
    FROM ljvis2.user_group
    ORDER BY user_group_key, created_at DESC
)
SELECT
    l.user_group_key AS id,
    l.name,
    COALESCE(
        ARRAY(
            SELECT o.name
            FROM UNNEST(l.organisations) AS org_id
            JOIN ljvis2.organisation o ON o.id = org_id
            ORDER BY o.name
        ),
        ARRAY[]::TEXT[]
    ) AS organisations,
    l.covers_all_organisations,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (
        :organisation_id = 0
        OR :organisation_id = ANY(l.organisations)
    )
    AND (
        COALESCE(:search, '') = ''
        OR l.name ILIKE '%' || COALESCE(:search, '') || '%'
        OR EXISTS (
            SELECT 1
            FROM UNNEST(l.organisations) AS org_id
            JOIN ljvis2.organisation o ON o.id = org_id
            WHERE o.name ILIKE '%' || COALESCE(:search, '') || '%'
        )
    )
ORDER BY
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name asc'            THEN l.name COLLATE "et-EE-x-icu"          END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name desc'           THEN l.name COLLATE "et-EE-x-icu"          END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations asc'   THEN l.organisations END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations desc'  THEN l.organisations END DESC,
    l.name COLLATE "et-EE-x-icu" ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
