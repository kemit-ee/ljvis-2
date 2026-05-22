/*
declaration:
  version: 0.1
  description: "Rebuild user_account_latest snapshot for one or more users after any write operation"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_ids
        type: string
        description: "Comma-separated user account IDs"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_account_latest (
    user_account_id,
    personal_code,
    first_name,
    last_name,
    email,
    phone,
    structural_unit,
    job_title,
    organisation_id,
    organisation_name,
    access_start,
    access_end,
    status,
    user_groups,
    created_by
)
SELECT
    ua.id,
    ua.personal_code,
    (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.email FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.phone FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.structural_unit FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.job_title FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1)),
    (SELECT d.access_start FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT d.access_end FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1),
    (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1),
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', uaug.user_group_id, 'name',
            (SELECT ns.name FROM ljvis2.user_group_name_state ns WHERE ns.user_group_id = uaug.user_group_id ORDER BY ns.created_at DESC LIMIT 1)
        ))
        FROM ljvis2.user_account_user_group uaug
        WHERE uaug.user_account_id = ua.id
          AND (SELECT uaugs.status FROM ljvis2.user_account_user_group_state uaugs WHERE uaugs.user_account_user_group_id = uaug.id ORDER BY uaugs.created_at DESC LIMIT 1) = 'active'),
        '[]'::JSONB
    ),
    :created_by
FROM ljvis2.user_account ua
WHERE ua.id = ANY(SELECT unnest(string_to_array(:user_account_ids, ','))::BIGINT)
RETURNING id;
