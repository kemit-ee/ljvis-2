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
        description: "User group UUID"
  response:
    fields:
      - field: organisation_id
        type: string
      - field: name
        type: string
*/
SELECT
    ugo.organisation_id,
    (SELECT o.name FROM users.organisation o WHERE o.id = ugo.organisation_id) AS name
FROM users.user_group_organisation ugo
WHERE ugo.user_group_id = :user_group_id::UUID
ORDER BY name;
