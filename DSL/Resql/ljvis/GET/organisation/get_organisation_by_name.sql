/*
declaration:
  version: 0.1
  description: "Get organisation ID by name"
  method: get
  namespace: organisation
  returns: json
  allowlist:
    query:
      - field: name
        type: string
        description: "Organisation name"
  response:
    fields:
      - field: id
        type: number
*/
SELECT id
FROM ljvis2.organisation
WHERE name = :name
LIMIT 1;
