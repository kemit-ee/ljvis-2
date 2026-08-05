/*
declaration:
  version: 0.1
  description: "List latest snapshots of all transport-interruption sub-forms linked to a compound form (for the koondvorm tab/navigation list)"
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
        type: string
      - field: subFormNumber
        type: string
      - field: version
        type: number
      - field: status
        type: string
*/
SELECT DISTINCT ON (kv_form_key)
  kv_form_key AS id,
  sub_form_number,
  version,
  status
FROM forms.kv_form
WHERE compound_form_key = :compoundFormKey::BIGINT
ORDER BY kv_form_key, created_at DESC;
