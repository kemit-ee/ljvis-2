/*
declaration:
  version: 0.1
  description: "List latest snapshots of all ADR sub-forms linked to a compound form key"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: compoundFormKey
        type: number
  response:
    fields:
      - field: id
        type: number
      - field: compoundFormKey
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
      - field: status
        type: string
      - field: resultType
        type: string
      - field: createdBy
        type: string
*/
SELECT DISTINCT ON (adr_form_key)
  adr_form_key AS id,
  compound_form_key,
  sub_form_number,
  version,
  status,
  result_type,
  created_by
FROM forms.adr_form
WHERE compound_form_key = :compoundFormKey::BIGINT
ORDER BY adr_form_key, created_at DESC;
