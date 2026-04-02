/*
declaration:
  version: 0.1
  description: "Get users belonging to a user group"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: user_group_id
        type: string
        description: "User group UUID"
      - field: search
        type: string
        description: "Search by first or last name"
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
*/
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.personal_code,
    o.name AS organisation_name,
    u.status
FROM users.user_user_group uug
JOIN users."user" u ON u.id = uug.user_id
JOIN users.organisation o ON o.id = u.organisation_id
WHERE uug.user_group_id = :user_group_id::UUID
    AND (
        :search = ''
        OR u.first_name ILIKE '%' || :search || '%'
        OR u.last_name ILIKE '%' || :search || '%'
    )
ORDER BY
    CASE WHEN u.status = 'inactive' THEN 1 ELSE 0 END ASC,
    u.last_name ASC;
