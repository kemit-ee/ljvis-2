/*
declaration:
  version: 0.1
  description: "Insert user group organisation links"
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
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by)
SELECT :user_group_id::BIGINT, unnest(string_to_array(:organisation_ids, ','))::BIGINT, :created_by
RETURNING id;
