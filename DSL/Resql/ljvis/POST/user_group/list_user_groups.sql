/*
description: "List all user groups with their organisations"
namespace: user_group
params:
  search:
    type: string
    required: false
    description: "Search by group name or organisation name"
  page:
    type: number
    required: false
    description: "Page number"
  page_size:
    type: number
    required: false
    description: "Items per page"
  sorting:
    type: string
    required: false
    description: "Sort column and direction"
  organisation_id:
    type: number
    required: false
    description: "Filter by organisation ID (for local admin), 0 means no filter"
returns:
  - name: id
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
  - name: organisations
    type: array
    nullable: true
  - name: total
    type: number
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        name,
        organisations,
        (CARDINALITY(organisations) = (SELECT COUNT(*)::INT FROM users.organisation)) AS covers_all_organisations
    FROM users.user_group
    ORDER BY user_group_key, created_at DESC
)
SELECT
    l.user_group_key AS id,
    l.name,
    ARRAY_TO_JSON(
        COALESCE(
            ARRAY(
                SELECT o.name
                FROM UNNEST(l.organisations) AS org_id
                JOIN users.organisation o ON o.id = org_id
                ORDER BY o.name
            ),
            ARRAY[]::TEXT[]
        )
    ) AS organisations,
    l.covers_all_organisations,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (
        :organisation_id::BIGINT = 0
        OR :organisation_id::BIGINT = ANY(l.organisations)
    )
    AND (
        COALESCE(:search, '') = ''
        OR l.name ILIKE '%' || COALESCE(:search, '') || '%'
        OR EXISTS (
            SELECT 1
            FROM UNNEST(l.organisations) AS org_id
            JOIN users.organisation o ON o.id = org_id
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
