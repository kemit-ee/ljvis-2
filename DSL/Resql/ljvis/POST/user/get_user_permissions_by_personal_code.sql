/*
description: "Get user with aggregated permissions by personal_code"
namespace: user
params:
  personal_code:
    type: string
    required: false
    description: "User personal code (isikukood)"
returns:
  - name: id
    type: string
    nullable: true
  - name: firstname
    type: string
    nullable: true
  - name: lastname
    type: string
    nullable: true
  - name: personalcode
    type: string
    nullable: true
  - name: organisationid
    type: string
    nullable: true
  - name: organisationname
    type: string
    nullable: true
  - name: email
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: structuralunit
    type: string
    nullable: true
  - name: jobtitle
    type: string
    nullable: true
  - name: permissions
    type: array
    nullable: true
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
