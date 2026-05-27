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
        description: "User group ID"
      - field: organisation_id
        type: string
        description: "Optional organisation filter"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
SELECT
    ugl.user_group_id AS id,
    ugl.name
FROM ljvis2.user_group_latest ugl
WHERE ugl.user_group_id = :id::BIGINT
  AND (COALESCE(:organisation_id, '') = '' OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(ugl.organisations) AS org 
    WHERE org->>'id' = :organisation_id
  ))
  AND ugl.id = (
    SELECT MAX(id) FROM ljvis2.user_group_latest WHERE user_group_id = :id::BIGINT
      AND (COALESCE(:organisation_id, '') = '' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(organisations) AS org 
        WHERE org->>'id' = :organisation_id
      ))
  )
LIMIT 1;