/*
declaration:
  version: 0.1
  description: "List all organisations"
  method: post
  namespace: organisation
  returns: json
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
SELECT
    id,
    name
FROM ljvis2.organisation
ORDER BY name COLLATE "et-EE-x-icu";
