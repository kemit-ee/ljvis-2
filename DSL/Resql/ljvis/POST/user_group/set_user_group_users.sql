/*
description: "Update group membership for multiple users — copy latest snapshot for each user with user_group_key added or removed"
namespace: user_group
params:
  user_group_id:
    type: string
    required: false
    description: "user_group_key to add or remove"
  user_ids:
    type: string
    required: false
    description: "Comma-separated user_account_key values"
  status:
    type: string
    required: false
    description: "active (add) or removed (remove)"
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
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
