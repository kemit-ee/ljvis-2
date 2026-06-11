/*
declaration:
  version: 0.1
  description: "Get latest classifier value validity state"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_value_id
        type: string
  response:
    fields:
      - field: valid_from
        type: string
      - field: valid_until
        type: string
*/
SELECT id,
       TO_CHAR(valid_from, 'YYYY-MM-DD') as valid_from,
       TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until
FROM ljvis2.classifier_value_validity_state
WHERE classifier_value_id = :classifier_value_id::BIGINT
ORDER BY id DESC
LIMIT 1;
