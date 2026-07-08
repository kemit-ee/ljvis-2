/*
declaration:
  version: 0.1
  description: "Get user with aggregated permissions by personal_code"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
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
      - field: structuralunit
        type: string
      - field: jobtitle
        type: string
      - field: permissions
        type: array
        description: "Array of permission codes from all user groups"
*/
WITH latest_user AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key AS id,
        personal_code,
        first_name,
        last_name,
        organisation_id,
        organisation_name,
        structural_unit,
        job_title,
        email,
        status,
        user_groups
    FROM users.user_account
    WHERE personal_code = :personal_code
      AND status IN ('active', 'deactivating')
    ORDER BY user_account_key, created_at DESC
),
latest_group_perms AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        permissions
    FROM users.user_group
    ORDER BY user_group_key, created_at DESC
)
SELECT
    u.id,
    u.first_name AS firstname,
    u.last_name AS lastname,
    u.personal_code AS personalcode,
    u.organisation_id AS organisationid,
    u.organisation_name AS organisationname,
    u.structural_unit AS structuralunit,
    u.job_title AS jobtitle,
    u.email,
    u.status,
    COALESCE(
        (SELECT ARRAY_AGG(DISTINCT perm)
         FROM latest_group_perms lgp,
         UNNEST(lgp.permissions) AS perm
         WHERE lgp.user_group_key = ANY(u.user_groups)),
        ARRAY[]::TEXT[]
    ) AS permissions
FROM latest_user u
LIMIT 1;
