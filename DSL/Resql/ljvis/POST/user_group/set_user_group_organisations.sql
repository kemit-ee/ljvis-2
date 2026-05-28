/*
declaration:
  version: 0.1
  description: "Batch-insert user_group_organisation link rows and their state rows for comma-separated organisation IDs"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation IDs"
      - field: status
        type: string
        description: "active or removed"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH org_id_list AS (
    SELECT unnest(string_to_array(:organisation_ids, ','))::BIGINT AS org_id
),
existing_links AS (
    SELECT ugo.id, ugo.organisation_id
    FROM ljvis2.user_group_organisation ugo
    WHERE ugo.user_group_id = :user_group_id::BIGINT
      AND ugo.organisation_id = ANY(SELECT org_id FROM org_id_list)
),
new_links AS (
    INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by)
    SELECT :user_group_id::BIGINT, o.org_id, :created_by
    FROM org_id_list o
    WHERE o.org_id NOT IN (SELECT organisation_id FROM existing_links)
    RETURNING id
),
link_ids AS (
    SELECT id FROM existing_links
    UNION ALL
    SELECT id FROM new_links
)
INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by)
SELECT id, :status, :created_by FROM link_ids
RETURNING id;
