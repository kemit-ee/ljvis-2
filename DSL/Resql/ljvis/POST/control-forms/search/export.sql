/*
description: Form search export. Same filters as search, but no paging; returns the latest snapshot of every matching form as a JSON document in text form (all columns). Capped at :max_rows + 1 so the caller can detect truncation.
namespace: control-forms
params:
  allowed_types:
    type: string
    required: false
    description: Comma-separated form_type codes the caller may see (row-level)
  actor_code:
    type: string
    required: false
    description: Caller personal code; own forms are always visible
  max_rows:
    type: number
    required: true
    description: Row cap; at most max_rows + 1 rows are returned
  date_from:
    type: string
    required: false
    description: Control date lower bound (inclusive), ISO yyyy-mm-dd
  date_to:
    type: string
    required: false
    description: Control date upper bound (inclusive), ISO yyyy-mm-dd
  form_type:
    type: string
    required: false
    description: Filter by a single form type
  vehicle_reg_nr:
    type: string
    required: false
    description: Vehicle registration number (ILIKE)
  company_reg_code:
    type: string
    required: false
    description: Company registry code (ILIKE)
  company_name:
    type: string
    required: false
    description: Company name (ILIKE)
  driver:
    type: string
    required: false
    description: Driver personal code or name (ILIKE over driver_search)
  county:
    type: string
    required: false
    description: Control location county / maakond, EHAK classifier value key (exact match)
  inspector_org_id:
    type: string
    required: false
    description: Performing authority organisation id
  has_violation:
    type: string
    required: false
    description: '''true'' / ''false'' — filter by violation presence'
  status:
    type: string
    required: false
    description: Form lifecycle status
  carrier_origin:
    type: string
    required: false
    description: "'ee' = Estonian carrier (country EE or unset), 'foreign' = foreign carrier; empty = all"
  vr_reporting_country_code:
    type: string
    required: false
    description: VR only - reporting country code (exact match)
  vr_sanction_code:
    type: string
    required: false
    description: VR only - applied sanction code (exact match)
returns:
- name: form_type
  type: string
  nullable: true
- name: form_key
  type: number
  nullable: true
- name: data
  type: string
  nullable: true
*/
WITH f AS (
    SELECT fs.form_type, fs.form_key, fs.main_date, fs.created_at
    FROM forms.form_search fs
    WHERE
    (fs.form_type = ANY (string_to_array(COALESCE(:allowed_types, ''), ','))
     OR fs.status = 'published'
     OR (COALESCE(:actor_code, '') <> '' AND fs.created_by = :actor_code))
    AND (COALESCE(:form_type, '') = '' OR fs.form_type = :form_type)
    AND (COALESCE(:date_from, '') = '' OR fs.main_date >= :date_from::DATE)
    AND (COALESCE(:date_to, '') = '' OR fs.main_date <= :date_to::DATE)
    AND (COALESCE(:vehicle_reg_nr, '') = '' OR fs.vehicle_reg_nr ILIKE '%' || :vehicle_reg_nr || '%')
    AND (COALESCE(:company_reg_code, '') = '' OR fs.company_reg_code ILIKE '%' || :company_reg_code || '%')
    AND (COALESCE(:company_name, '') = '' OR fs.company_name ILIKE '%' || :company_name || '%')
    AND (COALESCE(:driver, '') = '' OR fs.driver_search ILIKE '%' || lower(:driver) || '%')
    AND (COALESCE(:county, '') = '' OR fs.county = :county)
    AND (COALESCE(:inspector_org_id, '') = '' OR fs.inspector_org_id = :inspector_org_id)
    AND (COALESCE(:has_violation, '') = '' OR fs.has_violation = :has_violation::BOOLEAN)
    AND (COALESCE(:carrier_origin, '') = ''
         OR (:carrier_origin = 'ee' AND COALESCE(NULLIF(fs.company_country_code, ''), 'EE') = 'EE')
         OR (:carrier_origin = 'foreign' AND COALESCE(NULLIF(fs.company_country_code, ''), 'EE') <> 'EE'))
    AND (COALESCE(:status, '') = '' OR fs.status = :status)
    AND (COALESCE(:vr_reporting_country_code, '') = '' OR fs.vr_reporting_country_code = :vr_reporting_country_code)
    AND (COALESCE(:vr_sanction_code, '') = '' OR fs.vr_sanction_code = :vr_sanction_code)
    ORDER BY fs.main_date DESC, fs.created_at DESC
    LIMIT :max_rows::INTEGER + 1
),
snap AS (
    SELECT 'compound'::text AS form_type, t.compound_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (compound_form_key) *
        FROM forms.compound_form
        WHERE compound_form_key IN (SELECT form_key FROM f WHERE form_type = 'compound')
        ORDER BY compound_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'foreign_violation'::text AS form_type, t.foreign_violation_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (foreign_violation_form_key) *
        FROM forms.foreign_violation_form
        WHERE foreign_violation_form_key IN (SELECT form_key FROM f WHERE form_type = 'foreign_violation')
        ORDER BY foreign_violation_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'labour_inspection'::text AS form_type, t.labour_inspection_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (labour_inspection_form_key) *
        FROM forms.labour_inspection_form
        WHERE labour_inspection_form_key IN (SELECT form_key FROM f WHERE form_type = 'labour_inspection')
        ORDER BY labour_inspection_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'good_repute'::text AS form_type, t.good_repute_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (good_repute_form_key) *
        FROM forms.good_repute_form
        WHERE good_repute_form_key IN (SELECT form_key FROM f WHERE form_type = 'good_repute')
        ORDER BY good_repute_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'tram_control_card'::text AS form_type, t.tram_control_card_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (tram_control_card_key) *
        FROM forms.tram_control_card
        WHERE tram_control_card_key IN (SELECT form_key FROM f WHERE form_type = 'tram_control_card')
        ORDER BY tram_control_card_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'sp_driver'::text AS form_type, t.sp_driver_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (sp_driver_form_key) *
        FROM forms.sp_driver_form
        WHERE sp_driver_form_key IN (SELECT form_key FROM f WHERE form_type = 'sp_driver')
        ORDER BY sp_driver_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'sp_teammate'::text AS form_type, t.sp_teammate_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (sp_teammate_form_key) *
        FROM forms.sp_teammate_form
        WHERE sp_teammate_form_key IN (SELECT form_key FROM f WHERE form_type = 'sp_teammate')
        ORDER BY sp_teammate_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'vehicle_technical'::text AS form_type, t.vehicle_technical_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (vehicle_technical_form_key) *
        FROM forms.vehicle_technical_form
        WHERE vehicle_technical_form_key IN (SELECT form_key FROM f WHERE form_type = 'vehicle_technical')
        ORDER BY vehicle_technical_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'trailer_technical'::text AS form_type, t.trailer_technical_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (trailer_technical_form_key) *
        FROM forms.trailer_technical_form
        WHERE trailer_technical_form_key IN (SELECT form_key FROM f WHERE form_type = 'trailer_technical')
        ORDER BY trailer_technical_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'adr'::text AS form_type, t.adr_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (adr_form_key) *
        FROM forms.adr_form
        WHERE adr_form_key IN (SELECT form_key FROM f WHERE form_type = 'adr')
        ORDER BY adr_form_key, created_at DESC
    ) t
    UNION ALL
    SELECT 'kv'::text AS form_type, t.kv_form_key AS form_key, to_jsonb(t) AS data
    FROM (
        SELECT DISTINCT ON (kv_form_key) *
        FROM forms.kv_form
        WHERE kv_form_key IN (SELECT form_key FROM f WHERE form_type = 'kv')
        ORDER BY kv_form_key, created_at DESC
    ) t
)
SELECT f.form_type, f.form_key, snap.data::text AS data
FROM f
JOIN snap ON snap.form_type = f.form_type AND snap.form_key = f.form_key
ORDER BY f.main_date DESC, f.created_at DESC;
