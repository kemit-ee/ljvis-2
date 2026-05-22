/*
declaration:
  version: 0.1
  description: "Get organisations linked to a user group"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: user_group_id
        type: string
        description: "User group ID"
  response:
    fields:
      - field: organisation_id
        type: string
      - field: name
        type: string
*/
SELECT
    ugo.organisation_id,
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ugo.organisation_id) AS name
FROM ljvis2.user_group_organisation ugo
WHERE ugo.user_group_id = :user_group_id::BIGINT
  AND (SELECT uogos.status FROM ljvis2.user_group_organisation_state uogos WHERE uogos.user_group_organisation_id = ugo.id ORDER BY uogos.created_at DESC LIMIT 1) = 'active'
ORDER BY name;
