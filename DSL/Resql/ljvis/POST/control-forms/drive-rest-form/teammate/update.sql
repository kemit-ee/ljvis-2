/*
description: Update drive rest form for teammate — insert new snapshot with updated data
namespace: control-forms
params:
  key:
    type: integer
    required: false
  compoundFormKey:
    type: number
    required: false
  subFormNumber:
    type: string
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
  spApplicability:
    type: string
    required: false
  tachographTypeCode:
    type: string
    required: false
  tachographDataNotDownloaded:
    type: boolean
    required: false
  tachographNotes:
    type: string
    required: false
  checkedDaysCount:
    type: string
    required: false
  workDaysCount:
    type: string
    required: false
  otherActivityDaysCount:
    type: string
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
  atpViolationFound:
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
  liiniNumber:
    type: string
    required: false
  liiniNimetus:
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
-- Meeskonnaliikme isikuandmed võetakse koondvormi viimasest versioonist (drivers[1]); vormil endal need ei muutu.
WITH latest AS (
  SELECT sub_form_number, CASE WHEN status = 'saved' OR :status <> status THEN version ELSE version + 1 END AS version, revision, template_version, compound_form_key, enforcement_decision, proceeding_closure_basis
  FROM forms.sp_teammate_form
  WHERE sp_teammate_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
),
tm AS (
  SELECT drivers -> 1 AS d FROM forms.compound_form
   WHERE compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), (SELECT compound_form_key::text FROM latest))::BIGINT
   ORDER BY created_at DESC LIMIT 1
),
prev AS (
  SELECT person_code_ee, person_first_name, person_last_name, person_citizenship_code, person_code_foreign, person_birth_date FROM forms.sp_teammate_form
   WHERE sp_teammate_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1
)
INSERT INTO forms.sp_teammate_form (sp_teammate_form_key,
                                  compound_form_key,
                                  sub_form_number,
                                  version,
                                  revision,
                                  template_version,
                                  status,
                                  selection_status,
                                  transport_type,
                                  transport_empty_run,
                                  transport_nature,
                                  transport_nature_exempt,
                                  transport_classes,
                                  result_type,
                                  additional_measure,
                                  proceeding_type,
                                  proceeding_reference_number,
                                  document_checks,
                                  other_documents,
                                  sp_applicability,
                                  tachograph_type_code,
                                  tachograph_data_not_downloaded,
                                  tachograph_notes,
                                  checked_days_count,
                                  work_days_count,
                                  other_activity_days_count,
                                  violations_561_2006,
                                  violations_165_2014,
                                  violations_2002_15,
                                  violations_593_2008,
                                  violations_2020_1057,
                                  atp_violation_found,
                                  atp_violation_description,
                                  erru_points,
                                  enforcement_decision,
                                  proceeding_closure_basis,
                                  notes,
                                  liini_number,
                                  liini_nimetus,
                                  person_code_ee,
                                  person_first_name,
                                  person_last_name,
                                  person_citizenship_code,
                                  person_code_foreign,
                                  person_birth_date,
                                  created_by)
SELECT
        :key::BIGINT,
        COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT,
        COALESCE(NULLIF(:subFormNumber, ''), l.sub_form_number),
        l.version,
        l.revision + 1,
        l.template_version,
        :status,
        NULLIF(:selectionStatus, ''),
        COALESCE((
          SELECT d.transport_type FROM forms.sp_driver_form d
           WHERE d.compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT
             AND d.status <> 'deleted'
           ORDER BY d.version DESC, d.created_at DESC LIMIT 1
        ), NULLIF(:transportType, '')),
        COALESCE((
          SELECT d.transport_empty_run FROM forms.sp_driver_form d
           WHERE d.compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT
             AND d.status <> 'deleted'
           ORDER BY d.version DESC, d.created_at DESC LIMIT 1
        ), COALESCE(:transportEmptyRun::BOOLEAN, FALSE)),
        NULLIF(:transportNature, ''),
        COALESCE((
          SELECT d.transport_nature_exempt FROM forms.sp_driver_form d
           WHERE d.compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT
             AND d.status <> 'deleted'
           ORDER BY d.version DESC, d.created_at DESC LIMIT 1
        ), NULLIF(:transportNatureExempt::text, '')::BOOLEAN),
        COALESCE((
          SELECT d.transport_classes FROM forms.sp_driver_form d
           WHERE d.compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT
             AND d.status <> 'deleted'
           ORDER BY d.version DESC, d.created_at DESC LIMIT 1
        ), COALESCE(NULLIF(:transportClasses, '')::jsonb, '[]'::jsonb)),
        NULLIF(:resultType, ''),
        NULLIF(:additionalMeasure, ''),
        COALESCE(:proceedingType, 'none'),
        NULLIF(:proceedingReferenceNumber, ''),
        COALESCE(NULLIF(:documentChecks, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:otherDocuments, '')::jsonb, '[]'::jsonb),
        NULLIF(:spApplicability, ''),
        NULLIF(:tachographTypeCode, ''),
        COALESCE(:tachographDataNotDownloaded::BOOLEAN, FALSE),
        NULLIF(:tachographNotes, ''),
        NULLIF(:checkedDaysCount, '')::INTEGER,
        NULLIF(:workDaysCount, '')::INTEGER,
        NULLIF(:otherActivityDaysCount, '')::INTEGER,
        COALESCE(NULLIF(:violations5612006, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations1652014, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations200215, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations5932008, '')::jsonb, '[]'::jsonb),
        COALESCE(NULLIF(:violations20201057, '')::jsonb, '[]'::jsonb),
        CASE WHEN :atpViolationFound = 'true' THEN TRUE ELSE FALSE END,
        NULLIF(:atpViolationDescription, ''),
        forms.derive_sp_erru_points(
          COALESCE(NULLIF(:violations5612006, '')::jsonb, '[]'::jsonb),
          COALESCE(NULLIF(:violations1652014, '')::jsonb, '[]'::jsonb),
          COALESCE(NULLIF(:violations200215, '')::jsonb, '[]'::jsonb),
          COALESCE(NULLIF(:violations5932008, '')::jsonb, '[]'::jsonb),
          COALESCE(NULLIF(:violations20201057, '')::jsonb, '[]'::jsonb),
          COALESCE((
            SELECT d.cabotage_violations FROM forms.sp_driver_form d
             WHERE d.compound_form_key = COALESCE(NULLIF(:compoundFormKey::text, ''), l.compound_form_key::text)::BIGINT
               AND d.status <> 'deleted'
             ORDER BY d.version DESC, d.created_at DESC LIMIT 1
          ), '[]'::jsonb),
          COALESCE(NULLIF(:erruPoints, '')::jsonb, '[]'::jsonb)
        ),
        COALESCE(NULLIF(:enforcementDecision, ''), l.enforcement_decision),
        COALESCE(NULLIF(:proceedingClosureBasis, ''), l.proceeding_closure_basis),
        NULLIF(:notes, ''),
        NULLIF(:liiniNumber, ''),
        NULLIF(:liiniNimetus, ''),
        COALESCE((SELECT NULLIF(COALESCE(d->>'personalCodeEe', d->>'personal_code_ee'), '') FROM tm), (SELECT person_code_ee FROM prev)),
        COALESCE((SELECT NULLIF(COALESCE(d->>'firstName', d->>'first_name'), '') FROM tm), (SELECT person_first_name FROM prev)),
        COALESCE((SELECT NULLIF(COALESCE(d->>'lastName', d->>'last_name'), '') FROM tm), (SELECT person_last_name FROM prev)),
        COALESCE((SELECT NULLIF(COALESCE(d->>'citizenshipCode', d->>'citizenship_code'), '') FROM tm), (SELECT person_citizenship_code FROM prev)),
        COALESCE((SELECT NULLIF(COALESCE(d->>'personalCodeForeign', d->>'personal_code_foreign'), '') FROM tm), (SELECT person_code_foreign FROM prev)),
        COALESCE((SELECT CASE WHEN NULLIF(COALESCE(d->>'birthDate', d->>'birth_date'), '') ~ '^\d{4}-\d{2}-\d{2}' THEN LEFT(NULLIF(COALESCE(d->>'birthDate', d->>'birth_date'), ''), 10)::DATE END FROM tm), (SELECT person_birth_date FROM prev)),
        :created_by
FROM latest l
RETURNING sp_teammate_form_key AS id, sub_form_number, version;
