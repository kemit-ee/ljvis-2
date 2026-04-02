/*
declaration:
  version: 0.1
  description: "List users with pagination, sorting, and optional search"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: sorting
        type: string
        description: "Sort column and direction"
      - field: search
        type: string
        description: "Search by first or last name"
      - field: organisation_id
        type: string
        description: "Filter by organisation (for local admin)"
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
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.personal_code,
    u.organisation_id,
    o.name AS organisation_name,
    u.email,
    u.status,
    u.access_start,
    u.access_end,
    COALESCE(STRING_AGG(DISTINCT ug.name, ', '), '') AS user_groups,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM users."user" u
JOIN users.organisation o ON o.id = u.organisation_id
LEFT JOIN users.user_user_group uug ON uug.user_id = u.id
LEFT JOIN users.user_group ug ON ug.id = uug.user_group_id
WHERE
    (:organisation_id = '' OR u.organisation_id = :organisation_id::UUID)
    AND (
        :search = ''
        OR u.first_name ILIKE '%' || :search || '%'
        OR u.last_name ILIKE '%' || :search || '%'
    )
GROUP BY u.id, o.name
ORDER BY
    CASE WHEN u.status = 'inactive' THEN 1 ELSE 0 END ASC,
    CASE WHEN :sorting = 'first_name asc' THEN u.first_name END ASC,
    CASE WHEN :sorting = 'first_name desc' THEN u.first_name END DESC,
    CASE WHEN :sorting = 'last_name asc' THEN u.last_name END ASC,
    CASE WHEN :sorting = 'last_name desc' THEN u.last_name END DESC,
    CASE WHEN :sorting = 'personal_code asc' THEN u.personal_code END ASC,
    CASE WHEN :sorting = 'personal_code desc' THEN u.personal_code END DESC,
    CASE WHEN :sorting = 'organisation_name asc' THEN o.name END ASC,
    CASE WHEN :sorting = 'organisation_name desc' THEN o.name END DESC,
    u.last_name ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
