/*
declaration:
  version: 0.1
  description: "Get TRAM control card driver sub-form by key"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "sp_driver_form_key"
  response:
    fields:
      - field: id
        type: string
      - field: compoundFormKey
        type: string
      - field: subFormNumber
        type: string
      - field: status
        type: string
      - field: selectionStatus
        type: string
      - field: transportType
        type: string
      - field: transportEmptyRun
        type: boolean
      - field: transportNature
        type: string
      - field: transportNatureExempt
        type: boolean
      - field: transportClasses
        type: string
      - field: cabotageViolations
        type: string
      - field: resultType
        type: string
      - field: proceedingType
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: documentChecks
        type: string
      - field: otherDocuments
        type: string
      - field: spApplicability
        type: string
      - field: tachographTypeCode
        type: string
      - field: tachographDataNotDownloaded
        type: boolean
      - field: checkedDaysCount
        type: number
      - field: workDaysCount
        type: number
      - field: otherActivityDaysCount
        type: number
      - field: violations5612006
        type: string
      - field: violations1652014
        type: string
      - field: violations200215
        type: string
      - field: violations5932008
        type: string
      - field: violations20201057
        type: string
      - field: massDimensionNonCompliant
        type: boolean
      - field: massDimensionMeasurements
        type: string
      - field: atpViolationFound
        type: boolean
      - field: atpViolationDescription
        type: string
      - field: erruPoints
        type: string
      - field: enforcementDecision
        type: string
      - field: proceedingClosureBasis
        type: string
      - field: notes
        type: string
      - field: createdBy
        type: string
*/
SELECT
  sp_driver_form_key AS id,
  compound_form_key,
  sub_form_number,
  status,
  selection_status,
  transport_type,
  transport_empty_run,
  transport_nature,
  transport_nature_exempt,
  transport_classes::text AS transport_classes,
  cabotage_violations::text AS cabotage_violations,
  result_type,
  proceeding_type,
  proceeding_reference_number,
  document_checks::text AS document_checks,
  other_documents::text AS other_documents,
  sp_applicability,
  tachograph_type_code,
  tachograph_data_not_downloaded,
  checked_days_count,
  work_days_count,
  other_activity_days_count,
  violations_561_2006::text AS violations_561_2006,
  violations_165_2014::text AS violations_165_2014,
  violations_2002_15::text AS violations_2002_15,
  violations_593_2008::text AS violations_593_2008,
  violations_2020_1057::text AS violations_2020_1057,
  mass_dimension_non_compliant,
  mass_dimension_measurements::text AS mass_dimension_measurements,
  atp_violation_found,
  atp_violation_description,
  erru_points::text AS erru_points,
  enforcement_decision,
  proceeding_closure_basis,
  notes,
  created_by
FROM forms.sp_driver_form
WHERE sp_driver_form_key = :id::BIGINT
  AND EXISTS (SELECT 1 FROM forms.compound_form cf WHERE cf.compound_form_key = sp_driver_form.compound_form_key AND cf.authority = 'TRAM')
ORDER BY created_at DESC
LIMIT 1;
