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

-- Leia kinnitatava vormi viimane snapshot
-- Ainult 'confirmed' staatusega vormid on lubatud — muidu NOT_FOUND
WITH latest AS (
  SELECT id, sub_form_number, version
  FROM forms.vehicle_technical_form
  WHERE vehicle_technical_form_key = :inspectionId::BIGINT
    AND status = 'confirmed'    -- ainult kinnitatud vormid saavad X-tee välju
  ORDER BY created_at DESC
  LIMIT 1
)
-- Uuenda X-tee väli in-place (ei loo uut snapshot'i)
-- Kood määrab, millist veergu uuendatakse
UPDATE forms.vehicle_technical_form t
SET
  -- INSPECTION_DATE: tehnoülevaatuse läbiviimise kuupäev
  extraordinary_inspection_date = CASE
    WHEN :code = 'INSPECTION_DATE' THEN NULLIF(:value, '')::DATE
    ELSE extraordinary_inspection_date
  END,
  -- ENFORCEMENT_DECISION: otsuse sisu
  enforcement_decision = CASE
    WHEN :code = 'ENFORCEMENT_DECISION' THEN NULLIF(:value, '')
    ELSE enforcement_decision
  END,
  -- CLOSURE_BASIS: menetluse lõpetamise alus (nt VtMS § 29 lg 1)
  proceeding_closure_basis = CASE
    WHEN :code = 'CLOSURE_BASIS' THEN NULLIF(:value, '')
    ELSE proceeding_closure_basis
  END
FROM latest
WHERE t.id = latest.id
-- Tagasta uuendatud rea andmed (YAML kontrollib kas rida leiti)
RETURNING t.vehicle_technical_form_key AS id, t.sub_form_number, t.version;
