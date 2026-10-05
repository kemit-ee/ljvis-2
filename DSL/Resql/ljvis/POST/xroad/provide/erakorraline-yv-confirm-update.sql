/*
description: 'X-tee ErakorralineYVconfirm (v1): lisab vehicle_technical_form-ile uue snapshot-rea, kus X-tee bloki
  väli on uuendatud. Kood INSPECTION_DATE -> extraordinary_inspection_date, ENFORCEMENT_DECISION ->
  enforcement_decision, CLOSURE_BASIS -> proceeding_closure_basis. Aluseks on vormi uusim snapshot ja see peab
  olema ''confirmed'' (muidu 0 rida = NOT_FOUND). INSERT-only: revision + 1, version ja kõik muud väljad
  kantakse edasi (versiooni number ei muutu), vana rida jääb ajalukku. created_by = ''system''. Tagastab tühja
  array kui inspection_id ei leitud (YAML käsitleb kui NOT_FOUND).'
namespace: xroad
params:
  inspectionId:
    type: integer
    required: false
  code:
    type: string
    required: false
  value:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: sub_form_number
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM forms.vehicle_technical_form
  WHERE vehicle_technical_form_key = :inspectionId::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.vehicle_technical_form
SELECT (jsonb_populate_record(
    NULL::forms.vehicle_technical_form,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.vehicle_technical_form_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', 'system',
      -- INSPECTION_DATE: tehnoülevaatuse läbiviimise kuupäev
      'extraordinary_inspection_date', CASE
        WHEN :code = 'INSPECTION_DATE' THEN NULLIF(:value, '')::DATE
        ELSE l.extraordinary_inspection_date
      END,
      -- ENFORCEMENT_DECISION: otsuse sisu
      'enforcement_decision', CASE
        WHEN :code = 'ENFORCEMENT_DECISION' THEN NULLIF(:value, '')
        ELSE l.enforcement_decision
      END,
      -- CLOSURE_BASIS: menetluse lõpetamise alus (nt VtMS § 29 lg 1)
      'proceeding_closure_basis', CASE
        WHEN :code = 'CLOSURE_BASIS' THEN NULLIF(:value, '')
        ELSE l.proceeding_closure_basis
      END
    )
)).*
FROM latest l
WHERE l.status = 'confirmed'    -- ainult kinnitatud vorm saab X-tee välju
  AND :code IN ('INSPECTION_DATE', 'ENFORCEMENT_DECISION', 'CLOSURE_BASIS')
RETURNING vehicle_technical_form_key AS id, sub_form_number, version;
