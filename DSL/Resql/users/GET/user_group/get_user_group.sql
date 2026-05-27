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
    ug.id,
    (SELECT ns.name FROM ljvis2.user_group_name_state ns WHERE ns.user_group_id = ug.id ORDER BY ns.created_at DESC LIMIT 1) AS name
FROM ljvis2.user_group ug
WHERE ug.id = :id::BIGINT
  AND (COALESCE(:organisation_id, '') = '' OR EXISTS (
      SELECT 1 FROM ljvis2.user_group_organisation ugo
      WHERE ugo.user_group_id = ug.id
        AND ugo.organisation_id = COALESCE(:organisation_id, '')::BIGINT
        AND (SELECT uogos.status FROM ljvis2.user_group_organisation_state uogos WHERE uogos.user_group_organisation_id = ugo.id ORDER BY uogos.created_at DESC LIMIT 1) = 'active'
  ))
LIMIT 1;