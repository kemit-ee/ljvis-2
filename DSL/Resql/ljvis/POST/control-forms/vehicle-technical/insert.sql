/*
declaration:
  version: 0.1
  description: "Insert vehicle technical-check sub-form (mootorsõiduki tehnovorm) — first save"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: compoundFormKey
        type: number
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
WITH ins AS (
  INSERT INTO forms.vehicle_technical_form (
    vehicle_technical_form_key,
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
    created_by
  )
  VALUES (
    nextval('forms.seq_vehicle_technical_form_key'),
    :compoundFormKey::BIGINT,
    'th-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_vehicle_technical_form_key')::text, 5, '0'),
    1,
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
    :created_by
  )
  RETURNING vehicle_technical_form_key, sub_form_number, version
)
SELECT vehicle_technical_form_key AS id, sub_form_number, version FROM ins;
