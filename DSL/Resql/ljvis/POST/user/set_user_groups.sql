/*
declaration:
  version: 0.1
  description: "Update user group memberships — copy latest snapshot with modified user_groups JSONB (add or remove group keys)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_id
        type: string
        description: "user_account_key of the target user"
      - field: group_ids
        type: string
        description: "Comma-separated user_group_key values"
      - field: status
        type: string
        description: "active (add) or removed (remove)"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH group_key_list AS (
    SELECT unnest(string_to_array(:group_ids, ','))::BIGINT AS group_key
),
latest AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key, personal_code, first_name, last_name,
        organisation_id, organisation_name, structural_unit, job_title,
        email, phone, access_start, access_end, status, user_groups
    FROM ljvis2.user_account
    WHERE user_account_key = :user_account_id::BIGINT
    ORDER BY user_account_key, created_at DESC
)
INSERT INTO ljvis2.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    l.user_account_key, l.personal_code, l.first_name, l.last_name,
    l.organisation_id, l.organisation_name, l.structural_unit, l.job_title,
    l.email, l.phone, l.access_start, l.access_end, l.status,
    CASE :status
        WHEN 'active' THEN (
            SELECT COALESCE(ARRAY_AGG(key_val ORDER BY key_val), ARRAY[]::BIGINT[])
            FROM (
                SELECT UNNEST(l.user_groups) AS key_val
                UNION
                SELECT group_key FROM group_key_list
            ) combined
        )
        WHEN 'removed' THEN (
            SELECT COALESCE(ARRAY_AGG(elem_val ORDER BY elem_val), ARRAY[]::BIGINT[])
            FROM UNNEST(l.user_groups) AS elem_val
            WHERE elem_val NOT IN (SELECT group_key FROM group_key_list)
        )
    END,
    :created_by
FROM latest l
RETURNING user_account_key AS id;
