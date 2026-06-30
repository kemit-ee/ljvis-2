/*
declaration:
  version: 0.1
  description: "Get list of available permissions for a user"
  method: post
  namespace: control-form
  returns: json
  allowlist:
    body:
      - field: id
        type: number
        description: "User ID"
  response:
    fields:
      - field: id
        type: string
      - field: code
        type: string
      - field: description
        type: string
*/
SELECT
    id,
    code,
    description
FROM users.permission
WHERE code LIKE '%_form.write'
  AND code = ANY (
      SELECT unnest(permissions)
      FROM (
          SELECT DISTINCT ON (user_group_key) permissions
          FROM users.user_group
          WHERE user_group_key = ANY (
              SELECT unnest(user_groups)
              FROM users.user_account
              WHERE id = :id
          )
          ORDER BY user_group_key, id DESC
      ) latest_groups
  )
ORDER BY code;
