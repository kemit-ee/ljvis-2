/*
declaration:
  version: 0.1
  description: "Get user by personal_code (isikukood) for authentication"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
      - field: personal_code
        type: string
        description: "User personal code (isikukood)"
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
      - field: status
        type: string
*/
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.personal_code,
    u.organisation_id,
    (SELECT o.name FROM users.organisation o WHERE o.id = u.organisation_id) AS organisation_name,
    u.email,
    u.status
FROM users."user" u
WHERE u.personal_code = :personal_code
  AND u.status = 'active'
LIMIT 1;
