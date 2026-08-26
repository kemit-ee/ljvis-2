/*
description: "List members of a user group with pagination, sorting, and optional search"
namespace: user_group
params:
  user_group_id:
    type: number
    required: false
    description: "User group ID to filter members by (0 = no filter)"
  user_organisation_id:
    type: number
    required: false
    description: "Organisation ID for local admin scope filtering (0 = no filter)"
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
    description: "Search by first or last name"
  sorting:
    type: string
    required: false
    description: "Sort column and direction"
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
  - name: organisation_name
    type: string
    nullable: true
  - name: status
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
        first_name,
        last_name,
        personal_code,
        organisation_id,
        organisation_name,
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
    l.organisation_name,
    l.status,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE
    (
    :user_group_id::BIGINT = 0
        OR :user_group_id::BIGINT = ANY(l.user_groups)
        )
    AND
    (
    :user_organisation_id::BIGINT = 0
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
