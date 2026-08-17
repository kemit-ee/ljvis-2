/*
declaration:
  version: 0.1
  description: >-
    X-tee ErakorralineYVconfirm (v1): uuendab vehicle_technical_form X-tee bloki
    välja in-place. Kood INSPECTION_DATE -> extraordinary_inspection_date,
    ENFORCEMENT_DECISION -> enforcement_decision, CLOSURE_BASIS -> proceeding_closure_basis.
    Uuendatakse ainult 'confirmed' staatusega vormi viimast snapshot'i.
    Ei loo uut snapshot'i (versiooni number ei muutu).
    Tagastab tühja array kui inspection_id ei leitud (YAML käsitleb kui NOT_FOUND).
  method: post
  accepts: json
  returns: json
  namespace: xroad
  allowlist:
    body:
      - field: inspectionId
        type: string
      - field: code
        type: string
      - field: value
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: sub_form_number
        type: string
      - field: version
        type: number
*/

WITH latest AS (
  SELECT id, sub_form_number, version
  FROM forms.vehicle_technical_form
  WHERE vehicle_technical_form_key = :inspectionId::BIGINT
    AND status = 'confirmed'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE forms.vehicle_technical_form t
SET
  extraordinary_inspection_date = CASE
    WHEN :code = 'INSPECTION_DATE' THEN NULLIF(:value, '')::DATE
    ELSE extraordinary_inspection_date
  END,
  enforcement_decision = CASE
    WHEN :code = 'ENFORCEMENT_DECISION' THEN NULLIF(:value, '')
    ELSE enforcement_decision
  END,
  proceeding_closure_basis = CASE
    WHEN :code = 'CLOSURE_BASIS' THEN NULLIF(:value, '')
    ELSE proceeding_closure_basis
  END
FROM latest
WHERE t.id = latest.id
RETURNING t.vehicle_technical_form_key AS id, t.sub_form_number, t.version;
