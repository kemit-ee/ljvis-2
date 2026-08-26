/*
description: "List users with pagination, sorting, and optional search"
namespace: user
params:
  page:
    type: number
    required: false
    description: "Page number"
  page_size:
    type: number
    required: false
    description: "Items per page"
  search:
    type: string
    required: false
    description: "Search by name or personal code"
  sorting:
    type: string
    required: false
    description: "Sorting column and direction"
  organisation_id:
    type: number
    required: false
    description: "Filter by organisation ID (local scope)"
returns:
  - name: id
    type: string
    nullable: true
  - name: first_name
    type: string
    nullable: true
  - name: last_name
    type: string
    nullable: true
  - name: personal_code
    type: string
    nullable: true
  - name: organisation_id
    type: string
    nullable: true
  - name: organisation_name
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: user_groups
    type: string
    nullable: true
  - name: page
    type: number
    nullable: true
  - name: total_pages
    type: number
    nullable: true
  - name: total
    type: number
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key,
        personal_code,
        first_name,
        last_name,
        email,
        organisation_id,
        organisation_name,
        access_start,
        access_end,
        status,
        user_groups
    FROM users.user_account
    ORDER BY user_account_key, created_at DESC
)
SELECT
    l.user_account_key AS id,
    l.first_name,
    l.last_name,
    l.personal_code,
    l.organisation_id,
    l.organisation_name,
    l.email,
    l.status,
    l.access_start,
    l.access_end,
    ARRAY_TO_JSON(
        COALESCE(
            ARRAY(
                SELECT ug.name
                FROM UNNEST(l.user_groups) AS grp_id
                CROSS JOIN LATERAL (
                    SELECT name FROM users.user_group
                    WHERE user_group_key = grp_id
                    ORDER BY created_at DESC LIMIT 1
                ) ug
            ),
            ARRAY[]::TEXT[]
        )
    ) AS user_groups,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (COALESCE(:organisation_id::TEXT, '') = '' OR l.organisation_id::TEXT = :organisation_id::TEXT)
    AND (
        COALESCE(:search, '') = ''
        OR l.first_name ILIKE '%' || COALESCE(:search, '') || '%'
        OR l.last_name  ILIKE '%' || COALESCE(:search, '') || '%'
    )
ORDER BY
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status asc'            THEN l.status           END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status desc'           THEN l.status           END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name asc'        THEN l.first_name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name desc'       THEN l.first_name COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name asc'         THEN l.last_name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name desc'        THEN l.last_name COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name asc'  THEN l.organisation_name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name desc' THEN l.organisation_name COLLATE "et-EE-x-icu" END DESC,
    l.first_name COLLATE "et-EE-x-icu" ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
