/*
declaration:
  version: 0.1
  description: "Available list of users with pagination, sorting, and optional search for adding into group"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: page
        type: number
        description: "Page number"
      - field: page_size
        type: number
        description: "Items per page"
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation ids"
  response:
    fields:
      - field: id
        type: string
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: personal_code
        type: string
      - field: organisation_name
        type: string
      - field: status
        type: string
      - field: page
        type: number
      - field: total_pages
        type: number
      - field: total
        type: number
*/
SELECT
    ua.id,
    (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS first_name,
    (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS last_name,
    ua.personal_code,
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1)) AS organisation_name,
    (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1) AS status,
    :page AS page,
    CEIL(COUNT(*) OVER () / :page_size::DECIMAL) AS total_pages,
    (COUNT(*) OVER ())::INTEGER AS total
FROM ljvis2.user_account ua
WHERE
    NOT EXISTS (
        SELECT 1 FROM ljvis2.user_account_user_group uaug
        WHERE uaug.user_account_id = ua.id
          AND uaug.user_group_id = COALESCE(:user_group_id, '')::BIGINT
          AND (SELECT uaugs.status FROM ljvis2.user_account_user_group_state uaugs WHERE uaugs.user_account_user_group_id = uaug.id ORDER BY uaugs.created_at DESC LIMIT 1) = 'active'
    )
  AND (
    COALESCE(:organisation_ids, '') = ''
        OR (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) = ANY(STRING_TO_ARRAY(COALESCE(:organisation_ids, ''), ',')::BIGINT[])
    )
  AND (
    COALESCE(:search, '') = ''
        OR (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) ILIKE '%' || COALESCE(:search, '') || '%'
        OR (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) ILIKE '%' || COALESCE(:search, '') || '%'
    )
  AND (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1) = 'active'
ORDER BY
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status asc' THEN (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1) END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'status desc' THEN (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1) END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name asc' THEN (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'first_name desc' THEN (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name asc' THEN (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'last_name desc' THEN (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) END DESC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name asc' THEN (SELECT o.name FROM ljvis2.organisation o WHERE o.id = (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1)) END ASC,
    CASE WHEN COALESCE(:sorting, 'status asc') = 'organisation_name desc' THEN (SELECT o.name FROM ljvis2.organisation o WHERE o.id = (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1)) END DESC,
    (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) ASC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
