/*
declaration:
  version: 0.1
  description: "Rebuild classifier_latest snapshot for one or more classifiers after any write operation"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_id
        type: number
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.classifier_latest (
    classifier_id,
    code,
    name,
    description,
    created_by
)
SELECT
    c.id,
    c.code,
    (SELECT ns.name FROM ljvis2.classifier_name_state ns WHERE ns.classifier_id = c.id ORDER BY ns.created_at DESC LIMIT 1),
    (SELECT ns.description FROM ljvis2.classifier_name_state ns WHERE ns.classifier_id = c.id ORDER BY ns.created_at DESC LIMIT 1),
    :created_by::BIGINT
FROM ljvis2.classifier c
WHERE c.id = :classifier_id
RETURNING id;
