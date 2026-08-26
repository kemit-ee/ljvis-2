/*
description: "List latest snapshots of all ADR sub-forms linked to a compound form key"
namespace: control-forms
params:
  compoundFormKey:
    type: number
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: compoundFormKey
    type: number
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
  - name: createdBy
    type: string
    nullable: true
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
