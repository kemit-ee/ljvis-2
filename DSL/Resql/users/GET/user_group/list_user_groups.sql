/*
declaration:
  version: 0.1
  description: "List all user groups with their organisations"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
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
      - field: user_organisation_id
        type: string
        description: "User's organisation ID (for local admin filtering)"
      - field: is_local_admin
        type: string
        description: "Whether the user is a local admin (true/false)"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
      - field: organisations
        type: string
        description: "Comma-separated organisation names"
      - field: total
        type: number
*/
SELECT
    id,
    name,
    organisations,
    (COUNT(*) OVER ())::INTEGER AS total
FROM (
    SELECT
        ug.id,
        ug.name,
        COALESCE(STRING_AGG(DISTINCT o.name, ', '), '') AS organisations
    FROM users.user_group ug
    LEFT JOIN users.user_group_organisation ugo ON ugo.user_group_id = ug.id
    LEFT JOIN users.organisation o ON o.id = ugo.organisation_id
    WHERE
        (
            COALESCE(:search, '') = ''
            OR ug.name ILIKE '%' || COALESCE(:search, '') || '%'
            OR o.name ILIKE '%' || COALESCE(:search, '') || '%'
        )
      AND (
        COALESCE(:is_local_admin, 'false') != 'true'
            OR EXISTS (
                SELECT 1 FROM users.user_group_organisation ugo3
                WHERE ugo3.user_group_id = ug.id AND ugo3.organisation_id = :user_organisation_id::UUID
            )
        )
    GROUP BY ug.id, ug.name
) sub
ORDER BY
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name asc' THEN name END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'name desc' THEN name END DESC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations asc' THEN organisations END ASC,
    CASE WHEN COALESCE(:sorting, 'name asc') = 'organisations desc' THEN organisations END DESC,
    name ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
