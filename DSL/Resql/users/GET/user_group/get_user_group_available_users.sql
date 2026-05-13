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
    u.id,
    u.first_name,
    u.last_name,
    u.personal_code,
    o.name AS organisation_name,
    u.status,
    COALESCE(STRING_AGG(DISTINCT ug.name, ', '), '') AS user_groups,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM users."user" u
         JOIN users.organisation o ON o.id = u.organisation_id
         LEFT JOIN users.user_user_group uug ON uug.user_id = u.id
         LEFT JOIN users.user_group ug ON ug.id = uug.user_group_id
WHERE
    (uug.user_group_id IS NULL OR uug.user_group_id != COALESCE(:user_group_id, '')::UUID)
  AND (
    COALESCE(:search, '') = ''
        OR u.first_name ILIKE '%' || COALESCE(:search, '') || '%'
        OR u.last_name ILIKE '%' || COALESCE(:search, '') || '%'
    )
  AND u.status = 'active'
GROUP BY u.id, o.name
ORDER BY
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status asc' THEN u.status END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status desc' THEN u.status END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name asc' THEN u.first_name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name desc' THEN u.first_name END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name asc' THEN u.last_name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name desc' THEN u.last_name END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name asc' THEN o.name END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name desc' THEN o.name END DESC,
    u.first_name ASC
    LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
