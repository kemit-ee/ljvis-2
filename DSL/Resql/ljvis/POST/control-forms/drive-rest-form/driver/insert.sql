/*
declaration:
  version: 0.1
  description: "Insert drive rest form for driver"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: spDriverFormKey
        type: number
      - field: compoundFormKey
        type: number
      - field: subFormNumber
        type: string
      - field: templateVersion
        type: number
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
      - field: additionalMeasure
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
        type: string
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
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
*/
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
VALUES (nextval('forms.seq_sp_driver_form_key'),
        :compoundFormKey::BIGINT,
        'sp-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
        LPAD(currval('forms.seq_sp_driver_form_key')::text, 5, '0') || '/1',
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
        NULLIF(:spApplicability, ''),
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
        COALESCE(:massDimensionNonCompliant::BOOLEAN, FALSE),
        COALESCE(NULLIF(:massDimensionMeasurements, '') ::jsonb, '[]' ::jsonb),
        CASE WHEN :atpViolationFound = 'true' THEN TRUE ELSE FALSE END,
        NULLIF(:atpViolationDescription, ''),
        COALESCE(NULLIF(:erruPoints, '')::jsonb, '[]'::jsonb),
        NULLIF(:enforcementDecision, ''),
        NULLIF(:proceedingClosureBasis, ''),
        NULLIF(:notes, ''),
        :created_by) RETURNING sp_driver_form_key AS id, sub_form_number;
