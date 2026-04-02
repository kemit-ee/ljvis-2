/*
declaration:
  version: 0.1
  description: "List all user groups with their organisations"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: search
        type: string
        description: "Search by group name"
      - field: organisation_search
        type: string
        description: "Filter by organisation name"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
      - field: organisations
        type: string
        description: "Comma-separated organisation names"
*/
SELECT
    ug.id,
    ug.name,
    COALESCE(STRING_AGG(DISTINCT o.name, ', '), '') AS organisations
FROM users.user_group ug
LEFT JOIN users.user_group_organisation ugo ON ugo.user_group_id = ug.id
LEFT JOIN users.organisation o ON o.id = ugo.organisation_id
WHERE
    (:search = '' OR ug.name ILIKE '%' || :search || '%')
    AND (:organisation_search = '' OR o.name ILIKE '%' || :organisation_search || '%')
GROUP BY ug.id, ug.name
ORDER BY ug.name;
