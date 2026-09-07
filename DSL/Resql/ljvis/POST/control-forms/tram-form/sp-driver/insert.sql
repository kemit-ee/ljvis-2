/*
description: Insert TRAM control card driver sub-form (shares sp- number series with PPA per ADR-001 otsus
  2)
namespace: control-forms
params:
  compoundFormKey:
    type: number
    required: false
  status:
    type: string
    required: false
  selectionStatus:
    type: string
    required: false
  transportType:
    type: string
    required: false
  transportEmptyRun:
    type: boolean
    required: false
  transportNature:
    type: string
    required: false
  transportNatureExempt:
    type: boolean
    required: false
  transportClasses:
    type: string
    required: false
  cabotageViolations:
    type: string
    required: false
  resultType:
    type: string
    required: false
  additionalMeasure:
    type: string
    required: false
  proceedingType:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  documentChecks:
    type: string
    required: false
  otherDocuments:
    type: string
    required: false
  tachographTypeCode:
    type: string
    required: false
  tachographDataNotDownloaded:
    type: boolean
    required: false
  checkedDaysCount:
    type: number
    required: false
  workDaysCount:
    type: number
    required: false
  otherActivityDaysCount:
    type: number
    required: false
  violations5612006:
    type: string
    required: false
  violations1652014:
    type: string
    required: false
  violations200215:
    type: string
    required: false
  violations5932008:
    type: string
    required: false
  violations20201057:
    type: string
    required: false
  massDimensionMeasurements:
    type: string
    required: false
  atpViolationDescription:
    type: string
    required: false
  erruPoints:
    type: string
    required: false
  enforcementDecision:
    type: string
    required: false
  proceedingClosureBasis:
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
*/
-- IDOR-kaitse: alamvormi saab lisada ainult TRAM-koondvormi külge
-- (forms.sp_driver_form-il pole authority veergu). Vt ADR-001 otsus 3.
WITH new_key AS (
  SELECT nextval('forms.seq_sp_driver_form_key') AS k
  WHERE EXISTS (
    SELECT 1 FROM forms.compound_form cf
    WHERE cf.compound_form_key = :compoundFormKey::BIGINT
      AND cf.authority = 'TRAM'
  )
)
INSERT INTO forms.sp_driver_form (sp_driver_form_key,
                                  compound_form_key,
                                  sub_form_number,
                                  template_version,
                                  status,
                                  selection_status,
                                  transport_type,
                                  transport_empty_run,
                                  transport_nature,
                                  transport_nature_exempt,
                                  transport_classes,
                                  cabotage_violations,
                                  result_type,
                                  additional_measure,
                                  proceeding_type,
                                  proceeding_reference_number,
                                  document_checks,
                                  other_documents,
                                  sp_applicability,
                                  tachograph_type_code,
                                  tachograph_data_not_downloaded,
                                  checked_days_count,
                                  work_days_count,
                                  other_activity_days_count,
                                  violations_561_2006,
                                  violations_165_2014,
                                  violations_2002_15,
                                  violations_593_2008,
                                  violations_2020_1057,
                                  mass_dimension_non_compliant,
                                  mass_dimension_measurements,
                                  atp_violation_found,
                                  atp_violation_description,
                                  erru_points,
                                  enforcement_decision,
                                  proceeding_closure_basis,
                                  notes,
                                  created_by)
SELECT nk.k,
        :compoundFormKey::BIGINT,
        'sp-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
        LPAD(nk.k::text, 5, '0') || '/1',
        1,
        :status,
        NULLIF(:selectionStatus, ''),
        NULLIF(:transportType, ''),
        COALESCE(:transportEmptyRun::BOOLEAN, FALSE),
        NULLIF(:transportNature, ''),
        NULLIF(:transportNatureExempt::text, '')::BOOLEAN,
        COALESCE(NULLIF(:transportClasses, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:cabotageViolations, '')::jsonb, '[]'::jsonb),
        NULLIF(:resultType, ''),
        NULLIF(:additionalMeasure, ''),
        COALESCE(:proceedingType, 'none'),
        NULLIF(:proceedingReferenceNumber, ''),
        COALESCE(NULLIF(:documentChecks, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:otherDocuments, '')::jsonb, '[]'::jsonb),
        'not_checked', -- 2. faas: sektsioon peidetud, alati not_checked
        NULLIF(:tachographTypeCode, ''),
        COALESCE(:tachographDataNotDownloaded::BOOLEAN, FALSE),
        NULLIF(:checkedDaysCount, '')::INTEGER,
        NULLIF(:workDaysCount, '')::INTEGER,
        NULLIF(:otherActivityDaysCount, '')::INTEGER,
        COALESCE(NULLIF(:violations5612006, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations1652014, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations200215, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations5932008, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations20201057, '')::jsonb, '[]'::jsonb),
        FALSE, -- 2. faas: sektsioon peidetud
        COALESCE(NULLIF(:massDimensionMeasurements, '') ::jsonb, '[]' ::jsonb),
        FALSE, -- 2. faas: ATP sektsioon peidetud
        NULLIF(:atpViolationDescription, ''),
        COALESCE(NULLIF(:erruPoints, '')::jsonb, '[]'::jsonb),
        NULLIF(:enforcementDecision, ''),
        NULLIF(:proceedingClosureBasis, ''),
        NULLIF(:notes, ''),
        :created_by
FROM new_key nk
RETURNING sp_driver_form_key AS id, sub_form_number;
