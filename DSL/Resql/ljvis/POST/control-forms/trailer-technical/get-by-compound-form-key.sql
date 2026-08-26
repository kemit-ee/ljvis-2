/*
description: "List latest snapshots of all trailer technical-check sub-forms linked to a compound form (for the koondvorm tab/navigation list)"
namespace: control-forms
params:
  compoundFormKey:
    type: number
    required: false
returns:
  - name: id
    type: string
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: resultType
    type: string
    nullable: true
*/
SELECT DISTINCT ON (trailer_technical_form_key)
  trailer_technical_form_key AS id,
  sub_form_number,
  version,
  status,
  result_type
FROM forms.trailer_technical_form
WHERE compound_form_key = :compoundFormKey::BIGINT
ORDER BY trailer_technical_form_key, created_at DESC;
