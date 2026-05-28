/*
declaration:
  version: 0.1
  description: "List users with pagination, sorting, and optional search"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: is_local_admin
        type: string
        description: "Whether the user is a local admin (true/false)"
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
SELECT
    ual.user_account_id AS id,
    ual.first_name,
    ual.last_name,
    ual.personal_code,
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ual.organisation_id) AS organisation_name,
    ual.status,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM ljvis2.user_account_latest ual
WHERE
    (COALESCE(:user_group_id, '') = '' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(ual.user_groups) AS ug
        WHERE ug->>'id' = COALESCE(:user_group_id, '')::TEXT
    ))
  AND (
    COALESCE(:is_local_admin, 'false') != 'true'
        OR ual.organisation_id = :user_organisation_id::BIGINT
    )
  AND (
    COALESCE(:search, '') = ''
        OR ual.first_name ILIKE '%' || COALESCE(:search, '') || '%'
        OR ual.last_name ILIKE '%' || COALESCE(:search, '') || '%'
    )
  AND ual.id = (
    SELECT MAX(id) FROM ljvis2.user_account_latest WHERE user_account_id = ual.user_account_id
  )
ORDER BY
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status asc' THEN ual.status END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status desc' THEN ual.status END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name asc' THEN ual.first_name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name desc' THEN ual.first_name END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name asc' THEN ual.last_name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name desc' THEN ual.last_name END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name asc' THEN (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ual.organisation_id) END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name desc' THEN (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ual.organisation_id) END DESC,
    ual.first_name ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
