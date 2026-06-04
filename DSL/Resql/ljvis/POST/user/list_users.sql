/*
declaration:
  version: 0.1
  description: "List users with pagination, sorting, and optional search"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: search
        type: string
        description: "Search by name or personal code"
      - field: sorting
        type: string
        description: "Sorting column and direction"
      - field: organisation_id
        type: string
        description: "Filter by organisation ID (local scope)"
  response:
    fields:
      - field: id
        type: string
        description: "User ID"
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: personal_code
        type: string
      - field: organisation_id
        type: string
      - field: organisation_name
        type: string
      - field: status
        type: string
      - field: user_groups
        type: string
        description: "Comma-separated group names"
      - field: page
        type: number
      - field: total_pages
        type: number
      - field: total
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (user_account_id)
        user_account_id,
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
    FROM ljvis2.user_account_latest
    ORDER BY user_account_id, created_at DESC
)
SELECT
    l.user_account_id AS id,
    l.first_name,
    l.last_name,
    l.personal_code,
    l.organisation_id,
    l.organisation_name,
    l.email,
    l.status,
    l.access_start,
    l.access_end,
    COALESCE(
        (SELECT ARRAY_AGG(elem->>'name')
         FROM JSONB_ARRAY_ELEMENTS(l.user_groups) AS elem),
        ARRAY[]::TEXT[]
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
