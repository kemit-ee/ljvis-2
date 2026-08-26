/*
description: "Insert vehicle technical-check sub-form (mootorsõiduki tehnovorm) — first save"
namespace: control-forms
params:
  compoundFormKey:
    type: number
    required: false
  status:
    type: string
    required: false
  partsSummary:
    type: string
    required: false
  partsDefects:
    type: string
    required: false
  resultType:
    type: string
    required: false
  resultTransportInterruption:
    type: boolean
    required: false
  eraYvMntRegnr:
    type: boolean
    required: false
  eraYvMntVintin:
    type: boolean
    required: false
  eraYvMntAxles:
    type: boolean
    required: false
  eraYvMntPlaces:
    type: boolean
    required: false
  eraYvMntRebuilt:
    type: boolean
    required: false
  proceedingType:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  violations:
    type: string
    required: false
  notes:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
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
