/*
declaration:
  version: 0.1
  description: "Get a single user by ID with organisation and groups"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
      - field: id
        type: string
        description: "User UUID"
      - field: organisation_id
        type: string
        description: "Optional organisation filter"
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
      - field: organisation_id
        type: string
      - field: organisation_name
        type: string
      - field: email
        type: string
      - field: phone
        type: string
      - field: access_start
        type: string
      - field: access_end
        type: string
      - field: status
        type: string
*/
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.personal_code,
    u.organisation_id,
    o.name AS organisation_name,
    u.email,
    u.phone,
    u.access_start,
    u.access_end,
    u.status,
    u.created_at,
    u.updated_at
FROM users."user" u
JOIN users.organisation o ON o.id = u.organisation_id
WHERE u.id = :id::UUID
  AND (:organisation_id = '' OR u.organisation_id = :organisation_id::UUID)
LIMIT 1;
