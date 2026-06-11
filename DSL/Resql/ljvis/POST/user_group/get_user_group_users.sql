/*
declaration:
  version: 0.1
  description: "List members of a user group with pagination, sorting, and optional search"
  method: post
  namespace: user_group
  returns: json
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "User group ID to filter members by"
      - field: user_organisation_id
        type: string
        description: "Organisation ID for local admin scope filtering (empty = no filter)"
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: search
        type: string
        description: "Search by first or last name"
      - field: sorting
        type: string
        description: "Sort column and direction"
  response:
    fields:
      - field: id
        type: string
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: personal_code
        type: string
      - field: organisation_name
        type: string
      - field: status
        type: string
      - field: page
        type: number
      - field: total_pages
        type: number
      - field: total
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key,
        first_name,
        last_name,
        personal_code,
        organisation_id,
        organisation_name,
        status,
        user_groups
    FROM ljvis2.user_account
    ORDER BY user_account_key, created_at DESC
)
SELECT
    l.user_account_key AS id,
    l.first_name,
    l.last_name,
    l.personal_code,
    l.organisation_name,
    l.status,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (
        COALESCE(:user_group_id, '') = ''
        OR l.user_groups @> ARRAY[:user_group_id::BIGINT]
    )
    AND (
        COALESCE(:user_organisation_id, '') = ''
        OR l.organisation_id = :user_organisation_id::BIGINT
    )
    AND (
        COALESCE(:search, '') = ''
        OR l.first_name ILIKE '%' || COALESCE(:search, '') || '%'
        OR l.last_name  ILIKE '%' || COALESCE(:search, '') || '%'
    )
ORDER BY
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status asc'            THEN l.status          END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status desc'           THEN l.status          END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name asc'        THEN l.first_name      END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name desc'       THEN l.first_name      END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name asc'         THEN l.last_name       END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name desc'        THEN l.last_name       END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name asc'  THEN l.organisation_name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name desc' THEN l.organisation_name END DESC,
    l.first_name ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
