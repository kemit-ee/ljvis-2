/*
declaration:
  version: 0.1
  description: "Get user with aggregated permissions by personal_code"
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
      - field: firstname
        type: string
      - field: lastname
        type: string
      - field: personalcode
        type: string
      - field: organisationid
        type: string
      - field: organisationname
        type: string
      - field: email
        type: string
      - field: status
        type: string
      - field: permissions
        type: string
        description: "Comma-separated list of permission codes"
*/
SELECT
    u.id,
    u.first_name AS firstname,
    u.last_name AS lastname,
    u.personal_code AS personalcode,
    u.organisation_id AS organisationid,
    (SELECT o.name FROM users.organisation o WHERE o.id = u.organisation_id) AS organisationname,
    u.email,
    u.status,
    COALESCE(
        (SELECT STRING_AGG(DISTINCT
            (SELECT p.code FROM users.permission p WHERE p.id = ugp.permission_id),
            ',')
         FROM users.user_user_group uug,
              users.user_group_permission ugp
         WHERE uug.user_id = u.id
           AND ugp.user_group_id = uug.user_group_id),
        ''
    ) AS permissions
FROM users."user" u
WHERE u.personal_code = :personal_code
  AND u.status IN ('active', 'deactivating')
LIMIT 1;
