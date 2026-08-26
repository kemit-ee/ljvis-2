/*
description: "Eeltäitmine (LJVIS2-64 §4.1): build a new OUTGOING NCR request draft from an SP control-form sub-form (forms.sp_driver_form or forms.sp_teammate_form, selected by :spFormType) and its parent forms.compound_form. Appends the first snapshot of a new erru.ncr_message with status 'initiated', same as append-request-draft.sql, but the field values are DERIVED from the SP sub-form instead of being passed by the caller. checkResult is Pass when the sub-form's erru_points[] contains no MSI/VSI/SI entries, Fail otherwise — CleanCheck is never produced (LJVIS2-64 §4.1: 'ERRU väärtust CleanCheck ei kasutata'). Each MSI/VSI/SI erru_point becomes one seriousInfringements[] entry with category+infringementType only (penaltiesImposed/penaltiesRequested are left empty for the officer to fill in on the NCR form, per spec 'Karistuste andmeid ... ei eeltäideta'). M1 exception (LJVIS2-64 §4.1 'Sõidukeelu erand'): when the compound_form's vehicle category is M1 (private car), the '302' (driving ban / sõidukeeld) infringement is dropped from the draft even if present in erru_points — that penalty applies only to transport undertakings, not private individuals. minorInfringement is never eeltäidetud (spec: officer fills it in manually on the form). Returns zero rows if the SP sub-form or its parent compound_form cannot be found, or if erru.ncr_message insert should not create a business_case_id (never happens here, since insert-only) — caller maps empty result to 404/422."
namespace: erru
params:
  spFormKey:
    type: string
    required: false
  spFormType:
    type: string
    required: false
    description: "'driver' or 'teammate' — selects sp_driver_form vs sp_teammate_form"
  originatingAuthority:
    type: string
    required: false
  requestSource:
    type: string
    required: false
  requestPurpose:
    type: string
    required: false
  ncrTo:
    type: string
    required: false
  handlerPersonalCode:
    type: string
    required: false
  handlerName:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
*/
WITH sp AS (
  (
    SELECT compound_form_key, erru_points
    FROM forms.sp_driver_form
    WHERE sp_driver_form_key = :spFormKey::BIGINT
      AND :spFormType = 'driver'
    ORDER BY created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT compound_form_key, erru_points
    FROM forms.sp_teammate_form
    WHERE sp_teammate_form_key = :spFormKey::BIGINT
      AND :spFormType = 'teammate'
    ORDER BY created_at DESC
    LIMIT 1
  )
), cf AS (
  SELECT
    cf.company_name,
    cf.company_activity_licence_copy_number,
    cf.vehicle_reg_nr,
    cf.vehicle_country_code,
    cf.vehicle_category_code,
    cf.control_date
  FROM forms.compound_form cf, sp
  WHERE cf.compound_form_key = sp.compound_form_key
  ORDER BY cf.created_at DESC
  LIMIT 1
), serious AS (
  -- One entry per MSI/VSI/SI erru_point; drop '302' when the vehicle is M1 (private car).
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', p->>'severity_category',
        'infringementType', p->>'erru_code',
        'dateOfInfringement', cf.control_date,
        'detectionCheckDate', cf.control_date,
        'appealPossible', true,
        'penaltiesImposed', '[]'::JSONB,
        'penaltiesRequested', '[]'::JSONB
      )
    ) FILTER (
      WHERE p->>'severity_category' IN ('MSI', 'VSI', 'SI')
        AND NOT (cf.vehicle_category_code = 'M1' AND p->>'erru_code' = '302')
    ),
    '[]'::JSONB
  ) AS infringements,
  bool_or(p->>'severity_category' IN ('MSI', 'VSI', 'SI')
          AND NOT (cf.vehicle_category_code = 'M1' AND p->>'erru_code' = '302')) AS has_serious
  FROM sp, cf, jsonb_array_elements(sp.erru_points) AS p
), ins AS (
  INSERT INTO erru.ncr_message (
    ncr_message_key,
    version,
    direction,
    status,
    business_case_id,
    ncr_from,
    ncr_to,
    originating_authority,
    request_source,
    request_purpose,
    transport_undertaking_name,
    community_licence_number,
    vehicle_registration_number,
    vehicle_registration_country,
    check_result,
    check_date,
    serious_infringements,
    handler_personal_code,
    handler_name,
    created_by
  )
  SELECT
    nextval('erru.seq_ncr_message_key'),
    1,
    'outgoing',
    'initiated',
    'NCR-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_ncr_business_case_no')::text, 5, '0'),
    'EE',
    NULLIF(:ncrTo, ''),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    cf.company_name,
    cf.company_activity_licence_copy_number,
    cf.vehicle_reg_nr,
    cf.vehicle_country_code,
    CASE WHEN serious.has_serious THEN 'Fail' ELSE 'Pass' END,
    cf.control_date,
    CASE WHEN serious.has_serious THEN serious.infringements ELSE '[]'::JSONB END,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM cf, serious
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
