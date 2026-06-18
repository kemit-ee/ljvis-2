/*
declaration:
  version: 0.1
  description: "Update group membership for multiple users — copy latest snapshot for each user with user_group_key added or removed"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "user_group_key to add or remove"
      - field: user_ids
        type: string
        description: "Comma-separated user_account_key values"
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
WITH user_key_list AS (
    SELECT unnest(string_to_array(:user_ids, ','))::BIGINT AS user_account_key
),
latest_users AS (
    SELECT DISTINCT ON (ua.user_account_key)
        ua.user_account_key, ua.personal_code, ua.first_name, ua.last_name,
        ua.organisation_id, ua.organisation_name, ua.structural_unit, ua.job_title,
        ua.email, ua.phone, ua.access_start, ua.access_end, ua.status, ua.user_groups
    FROM users.user_account ua
    JOIN user_key_list ukl ON ukl.user_account_key = ua.user_account_key
    ORDER BY ua.user_account_key, ua.created_at DESC
)
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    lu.user_account_key, lu.personal_code, lu.first_name, lu.last_name,
    lu.organisation_id, lu.organisation_name, lu.structural_unit, lu.job_title,
    lu.email, lu.phone, lu.access_start, lu.access_end, lu.status,
    CASE :status
        WHEN 'active'  THEN (
            CASE WHEN :user_group_id::BIGINT = ANY(lu.user_groups)
                 THEN lu.user_groups
                 ELSE array_append(lu.user_groups, :user_group_id::BIGINT)
            END
        )
        WHEN 'removed' THEN ARRAY_REMOVE(lu.user_groups, :user_group_id::BIGINT)
    END,
    :created_by
FROM latest_users lu
RETURNING user_account_key AS id;
