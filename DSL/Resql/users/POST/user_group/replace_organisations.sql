/*
declaration:
  version: 0.1
  description: "Replace all organisation links for a user group in one transaction"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation UUIDs (empty string to clear all)"
  response:
    fields:
      - field: organisation_id
        type: string
*/
INSERT INTO users.user_group_organisation (user_group_id, organisation_id)
SELECT :user_group_id::UUID, unnest(string_to_array(:organisation_ids, ','))::UUID
ON CONFLICT (user_group_id, organisation_id) DO NOTHING
RETURNING organisation_id;
