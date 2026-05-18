/*
declaration:
  version: 0.1
  description: "Get user group detail by ID"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: id
        type: string
        description: "User group UUID"
      - field: organisation_id
        type: string
        description: "Optional organisation filter"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
      - field: created_at
        type: string
      - field: updated_at
        type: string
*/
SELECT
    ug.id,
    ug.name,
    ug.created_at,
    ug.updated_at
FROM users.user_group ug
WHERE ug.id = :id::UUID
  AND (COALESCE(:organisation_id, '') = '' OR EXISTS (
      SELECT 1 FROM users.user_group_organisation ugo
      WHERE ugo.user_group_id = ug.id
        AND ugo.organisation_id = COALESCE(:organisation_id, '')::UUID
  ))
LIMIT 1;