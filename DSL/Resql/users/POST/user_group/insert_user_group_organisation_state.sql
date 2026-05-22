/*
declaration:
  version: 0.1
  description: "Insert state for user group organisation links"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_organisation_ids
        type: string
        description: "Comma-separated user_group_organisation IDs"
      - field: status
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by)
SELECT unnest(string_to_array(:user_group_organisation_ids, ','))::BIGINT, :status, :created_by
RETURNING id;
