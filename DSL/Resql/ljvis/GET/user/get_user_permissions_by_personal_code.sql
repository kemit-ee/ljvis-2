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
WITH latest_user AS (
    SELECT DISTINCT ON (user_account_id)
        user_account_id AS id,
        personal_code,
        first_name,
        last_name,
        organisation_id,
        organisation_name,
        email,
        status,
        user_groups
    FROM ljvis2.user_account_latest
    ORDER BY user_account_id, created_at DESC
)
SELECT
    u.id,
    u.first_name AS firstname,
    u.last_name AS lastname,
    u.personal_code AS personalcode,
    u.organisation_id AS organisationid,
    u.organisation_name AS organisationname,
    u.email,
    u.status,
    COALESCE(
        (SELECT ARRAY_AGG(DISTINCT perm->>'code')
         FROM JSONB_ARRAY_ELEMENTS(u.user_groups) AS grp
         JOIN LATERAL (
             SELECT DISTINCT ON (ugl.user_group_id)
                 ugl.permissions
             FROM ljvis2.user_group_latest ugl
             WHERE ugl.user_group_id = (grp->>'id')::BIGINT
             ORDER BY ugl.user_group_id, ugl.created_at DESC
         ) AS gl ON true
         CROSS JOIN JSONB_ARRAY_ELEMENTS(gl.permissions) AS perm),
        ARRAY[]::TEXT[]
    ) AS permissions
FROM latest_user u
WHERE u.personal_code = :personal_code
  AND u.status IN ('active', 'deactivating')
LIMIT 1;
