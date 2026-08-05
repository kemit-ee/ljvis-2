/*
declaration:
  version: 0.1
  description: "Update trailer technical-check sub-form — appends a new snapshot row. sub_form_number is always read from the latest snapshot; version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed/published) data."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: status
        type: string
      - field: partsSummary
        type: string
      - field: partsDefects
        type: string
      - field: resultType
        type: string
      - field: resultTransportInterruption
        type: boolean
      - field: eraYvMntRegnr
        type: boolean
      - field: eraYvMntVintin
        type: boolean
      - field: eraYvMntAxles
        type: boolean
      - field: eraYvMntPlaces
        type: boolean
      - field: eraYvMntRebuilt
        type: boolean
      - field: proceedingType
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: violations
        type: string
      - field: notes
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
*/
WITH latest AS (
  SELECT sub_form_number,
         CASE WHEN status = 'saved' THEN version ELSE version + 1 END AS version,
         extraordinary_inspection_date, enforcement_decision, proceeding_closure_basis
  FROM forms.trailer_technical_form
  WHERE trailer_technical_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.trailer_technical_form (
  trailer_technical_form_key,
  compound_form_key,
  sub_form_number,
  version,
  status,
  parts_summary,
  parts_defects,
  result_type,
  result_transport_interruption,
  era_yv_mnt_regnr,
  era_yv_mnt_vintin,
  era_yv_mnt_axles,
  era_yv_mnt_places,
  era_yv_mnt_rebuilt,
  proceeding_type,
  proceeding_reference_number,
  violations,
  notes,
  extraordinary_inspection_date,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
)
SELECT
  :key::BIGINT,
  (SELECT compound_form_key FROM forms.trailer_technical_form WHERE trailer_technical_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1),
  latest.sub_form_number,
  latest.version,
  :status,
  COALESCE(NULLIF(:partsSummary, '')::jsonb, '[]'::jsonb),
  COALESCE(NULLIF(:partsDefects, '')::jsonb, '[]'::jsonb),
  COALESCE(NULLIF(:resultType, ''), 'ok'),
  COALESCE(:resultTransportInterruption::BOOLEAN, FALSE),
  COALESCE(:eraYvMntRegnr::BOOLEAN, FALSE),
  COALESCE(:eraYvMntVintin::BOOLEAN, FALSE),
  COALESCE(:eraYvMntAxles::BOOLEAN, FALSE),
  COALESCE(:eraYvMntPlaces::BOOLEAN, FALSE),
  COALESCE(:eraYvMntRebuilt::BOOLEAN, FALSE),
  NULLIF(:proceedingType, ''),
  NULLIF(:proceedingReferenceNumber, ''),
  COALESCE(NULLIF(:violations, '')::jsonb, '[]'::jsonb),
  NULLIF(:notes, ''),
  latest.extraordinary_inspection_date,
  latest.enforcement_decision,
  latest.proceeding_closure_basis,
  :created_by
FROM latest
RETURNING trailer_technical_form_key AS id, sub_form_number, version;
