/*
description: "Get drive rest form (teammate) by key"
namespace: control-forms
params:
  id:
    type: number
    required: false
    description: "sp_teammate_form_key"
returns:
  - name: id
    type: string
    nullable: true
  - name: compoundFormKey
    type: string
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: selectionStatus
    type: string
    nullable: true
  - name: transportType
    type: string
    nullable: true
  - name: transportEmptyRun
    type: boolean
    nullable: true
  - name: transportNature
    type: string
    nullable: true
  - name: transportNatureExempt
    type: boolean
    nullable: true
  - name: transportClasses
    type: string
    nullable: true
  - name: cabotageViolations
    type: string
    nullable: true
  - name: resultType
    type: string
    nullable: true
  - name: proceedingType
    type: string
    nullable: true
  - name: proceedingReferenceNumber
    type: string
    nullable: true
  - name: documentChecks
    type: string
    nullable: true
  - name: otherDocuments
    type: string
    nullable: true
  - name: spApplicability
    type: string
    nullable: true
  - name: tachographTypeCode
    type: string
    nullable: true
  - name: tachographDataNotDownloaded
    type: boolean
    nullable: true
  - name: checkedDaysCount
    type: number
    nullable: true
  - name: workDaysCount
    type: number
    nullable: true
  - name: otherActivityDaysCount
    type: number
    nullable: true
  - name: violations5612006
    type: string
    nullable: true
  - name: violations1652014
    type: string
    nullable: true
  - name: violations200215
    type: string
    nullable: true
  - name: violations5932008
    type: string
    nullable: true
  - name: violations20201057
    type: string
    nullable: true
  - name: massDimensionNonCompliant
    type: boolean
    nullable: true
  - name: massDimensionMeasurements
    type: string
    nullable: true
  - name: atpViolationFound
    type: boolean
    nullable: true
  - name: atpViolationDescription
    type: string
    nullable: true
  - name: erruPoints
    type: string
    nullable: true
  - name: enforcementDecision
    type: string
    nullable: true
  - name: proceedingClosureBasis
    type: string
    nullable: true
  - name: notes
    type: string
    nullable: true
  - name: createdBy
    type: string
    nullable: true
*/
SELECT
  sp_teammate_form_key AS id,
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
FROM forms.sp_teammate_form
WHERE sp_teammate_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
