/*
declaration:
  version: 0.1
  description: "Remove all organisation links for a user group (first step of set-organisations)"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
*/
DELETE FROM users.user_group_organisation
WHERE user_group_id = :user_group_id::UUID;
