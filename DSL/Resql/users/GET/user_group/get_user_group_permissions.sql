/*
declaration:
  version: 0.1
  description: "Get permissions linked to a user group"
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
      - field: permission_id
        type: string
      - field: code
        type: string
      - field: description
        type: string
*/
SELECT
    ugp.permission_id,
    (SELECT p.code FROM ljvis2.permission p WHERE p.id = ugp.permission_id) AS code,
    (SELECT p.description FROM ljvis2.permission p WHERE p.id = ugp.permission_id) AS description
FROM ljvis2.user_group_permission ugp
WHERE ugp.user_group_id = :user_group_id::BIGINT
  AND (SELECT ugps.status FROM ljvis2.user_group_permission_state ugps WHERE ugps.user_group_permission_id = ugp.id ORDER BY ugps.created_at DESC LIMIT 1) = 'active'
ORDER BY code;
