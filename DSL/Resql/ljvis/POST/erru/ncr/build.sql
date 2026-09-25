/*
description: 'Eeltäitmine (LJVIS2-64 §4.1): build a new OUTGOING NCR request draft from an SP control-form
  sub-form (forms.sp_driver_form or forms.sp_teammate_form, selected by :spFormType) and its parent forms.compound_form,
  OR — when :spFormType = ''tram'' — directly from a forms.tram_control_card row (ADR-002 standalone entity,
  no compound_form parent; :spFormKey is then its tram_control_card_key).
  Appends the first snapshot of a new erru.ncr_message with status ''initiated'', same as append-request-draft.sql,
  but the field values are DERIVED from the SP sub-form instead of being passed by the caller. checkResult
  is Pass when the sub-form''s erru_points[] contains no MSI/VSI/SI entries, Fail otherwise — CleanCheck
  is never produced (LJVIS2-64 §4.1: ''ERRU väärtust CleanCheck ei kasutata''). Each MSI/VSI/SI erru_point
  becomes one seriousInfringements[] entry with category+infringementType only (penaltiesImposed/penaltiesRequested
  are left empty for the officer to fill in on the NCR form, per spec ''Karistuste andmeid ... ei eeltäideta'').
  M1 exception (LJVIS2-64 §4.1 ''Sõidukeelu erand''): when the compound_form''s vehicle category is M1
  (private car), the ''302'' (driving ban / sõidukeeld) infringement is dropped from the draft even if
  present in erru_points — that penalty applies only to transport undertakings, not private individuals.
  minorInfringement is never eeltäidetud (spec: officer fills it in manually on the form). Returns zero
  rows if the SP sub-form or its parent compound_form cannot be found, or if erru.ncr_message insert should
  not create a business_case_id (never happens here, since insert-only) — caller maps empty result to
  404/422.'
namespace: erru
params:
  spFormKey:
    type: integer
    required: false
  spFormType:
    type: string
    required: false
    description: '''driver'', ''teammate'' or ''tram'' — selects sp_driver_form / sp_teammate_form / tram_control_card'
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

-- ─────────────────────────────────────────────────────────────────────────────
-- ANDMETE ÜLEKANNE KONTROLLKAARDILT NCR-TEATESSE (#328 p3)
--
-- Politsei / TRAM kontrollkaardilt "Loo NCR teade" nupp ja öine automaatne
-- väljasaatmine (erru-ncr-autodispatch.yml) kutsuvad seda päringut. Need
-- kontrollkaardi väljad kanduvad NCR-teatesse ja PEAVAD olema täidetud, et
-- teade oleks kehtiv:
--   compound_form.company_name                              -> transport_undertaking_name
--   compound_form.company_activity_licence_copy_number      -> community_licence_number
--       (ühenduse tegevusloa / kinnitatud ärakirja / tõestatud koopia number)
--   compound_form.vehicle_reg_nr                            -> vehicle_registration_number
--   compound_form.vehicle_country_code (<> 'EE')            -> vehicle_registration_country + ncr_to
--   compound_form.control_date                              -> check_date + iga rikkumise kuupäevad
--   sp_*_form.erru_points[] (severity_category MSI/VSI/SI)  -> serious_infringements[] + check_result
--       (derive_sp_erru_points arvestab ka sp_*_form.cabotage_violations,
--        nt VSI869-873, mitte ainult 5 direktiivipõhist rikkumiste välja)
--   compound_form.vehicle_category_code = 'M1'              -> '302' (sõidukeeld) jäetakse välja
--   compound_form.inspector_organisation_id (nt PPA)        -> originating_authority
--       (kutsuja modaali originatingAuthority kirjutab selle vajadusel üle)
--
-- EI eeltäideta (spec LJVIS2-64 §4.1): minorInfringement, karistuste andmed.
-- ─────────────────────────────────────────────────────────────────────────────
WITH sp AS (
  (
    SELECT
      cf.company_name,
      cf.company_activity_licence_copy_number,
      cf.vehicle_reg_nr,
      cf.vehicle_country_code,
      cf.vehicle_category_code,
      cf.control_date,
      cf.inspector_organisation_id,
      forms.derive_sp_erru_points(
        s.violations_561_2006, s.violations_165_2014, s.violations_2002_15,
        s.violations_593_2008, s.violations_2020_1057, s.cabotage_violations, s.erru_points
      ) AS erru_points
    FROM forms.sp_driver_form s
    JOIN forms.compound_form cf ON cf.compound_form_key = s.compound_form_key
    WHERE s.sp_driver_form_key = :spFormKey::BIGINT
      AND :spFormType = 'driver'
    ORDER BY s.created_at DESC, cf.created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT
      cf.company_name,
      cf.company_activity_licence_copy_number,
      cf.vehicle_reg_nr,
      cf.vehicle_country_code,
      cf.vehicle_category_code,
      cf.control_date,
      cf.inspector_organisation_id,
      forms.derive_sp_erru_points(
        s.violations_561_2006, s.violations_165_2014, s.violations_2002_15,
        s.violations_593_2008, s.violations_2020_1057, s.cabotage_violations, s.erru_points
      ) AS erru_points
    FROM forms.sp_teammate_form s
    JOIN forms.compound_form cf ON cf.compound_form_key = s.compound_form_key
    WHERE s.sp_teammate_form_key = :spFormKey::BIGINT
      AND :spFormType = 'teammate'
    ORDER BY s.created_at DESC, cf.created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    -- ADR-002: TRAM kontrollkaart on iseseisev olem, kõik väljad on samal
    -- real (compound_form parenti pole).
    SELECT
      t.company_name,
      t.company_activity_licence_copy_number,
      t.vehicle_reg_nr,
      t.vehicle_country_code,
      t.vehicle_category_code,
      t.control_date,
      t.inspector_organisation_id,
      forms.derive_sp_erru_points(
        t.violations_561_2006, t.violations_165_2014, t.violations_2002_15,
        t.violations_593_2008, t.violations_2020_1057, t.cabotage_violations, t.erru_points
      ) AS erru_points
    FROM forms.tram_control_card t
    WHERE t.tram_control_card_key = :spFormKey::BIGINT
      AND :spFormType = 'tram'
    ORDER BY t.created_at DESC
    LIMIT 1
  )
), serious AS (
  -- One entry per MSI/VSI/SI erru_point; drop '302' when the vehicle is M1 (private car).
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', p->>'severity_category',
        'infringementType', p->>'erru_code',
        'dateOfInfringement', sp.control_date,
        'detectionCheckDate', sp.control_date,
        -- "Karistust saab edasi kaevata" vaikimisi false — NCR teade saadetakse
        -- valdavalt jõustunud otsuste kohta; ametnik muudab vajadusel (#328).
        'appealPossible', false,
        'penaltiesImposed', '[]'::JSONB,
        'penaltiesRequested', '[]'::JSONB
      )
    ) FILTER (
      WHERE p->>'severity_category' IN ('MSI', 'VSI', 'SI')
        AND NOT (sp.vehicle_category_code = 'M1' AND p->>'erru_code' = '302')
    ),
    '[]'::JSONB
  ) AS infringements,
  bool_or(p->>'severity_category' IN ('MSI', 'VSI', 'SI')
          AND NOT (sp.vehicle_category_code = 'M1' AND p->>'erru_code' = '302')) AS has_serious
  FROM sp, jsonb_array_elements(sp.erru_points) AS p
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
    -- Eeltäida kontrollkaardi inspektori asutusest (nt PPA/TRAM); kutsuja
    -- modaal võib selle üle kirjutada (#328 p3).
    COALESCE(NULLIF(:originatingAuthority, ''), NULLIF(sp.inspector_organisation_id, '')),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    sp.company_name,
    sp.company_activity_licence_copy_number,
    sp.vehicle_reg_nr,
    sp.vehicle_country_code,
    CASE WHEN serious.has_serious THEN 'Fail' ELSE 'Pass' END,
    sp.control_date,
    CASE WHEN serious.has_serious THEN serious.infringements ELSE '[]'::JSONB END,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM sp, serious
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
