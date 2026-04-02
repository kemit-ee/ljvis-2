/*
declaration:
  version: 0.1
  description: "Add an organisation link to a user group"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
      - field: organisation_id
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO users.user_group_organisation (user_group_id, organisation_id)
VALUES (:user_group_id::UUID, :organisation_id::UUID)
ON CONFLICT (user_group_id, organisation_id) DO NOTHING
RETURNING id, user_group_id, organisation_id;
