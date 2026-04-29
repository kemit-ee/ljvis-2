/*
declaration:
  version: 0.1
  description: "Check if another user already has the given personal_code (for update conflict detection)"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
      - field: personal_code
        type: string
        description: "Personal code to check"
  response:
    fields:
      - field: id
        type: string
*/
SELECT u.id
FROM users."user" u
WHERE u.personal_code = :personal_code
  AND u.id != :id::UUID
LIMIT 1;
