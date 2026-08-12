/*
declaration:
  version: 0.1
  description: "LJVIS2-9 cross-entity form search over forms.form_search view. Filters, pagination, sorting, row-level type allow-list."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: allowed_types
        type: string
        description: "Comma-separated form_type codes the caller may see (row-level)"
      - field: page
        type: number
        description: "Page number (1-based)"
      - field: page_size
        type: number
        description: "Rows per page"
      - field: sorting
        type: string
        description: "Sort column and direction, e.g. 'main_date desc'"
      - field: date_from
        type: string
        description: "Control date lower bound (inclusive), ISO yyyy-mm-dd"
      - field: date_to
        type: string
        description: "Control date upper bound (inclusive), ISO yyyy-mm-dd"
      - field: form_type
        type: string
        description: "Filter by a single form type"
      - field: vehicle_reg_nr
        type: string
        description: "Vehicle registration number (ILIKE)"
      - field: company_reg_code
        type: string
        description: "Company registry code (ILIKE)"
      - field: company_name
        type: string
        description: "Company name (ILIKE)"
      - field: driver
        type: string
        description: "Driver personal code or name (ILIKE over driver_search)"
      - field: county
        type: string
        description: "Control location county / maakond (ILIKE)"
      - field: inspector_org_id
        type: string
        description: "Performing authority organisation id"
      - field: has_violation
        type: string
        description: "'true' / 'false' — filter by violation presence"
      - field: status
        type: string
        description: "Form lifecycle status"
  response:
    fields:
      - field: form_type
        type: string
      - field: form_key
        type: number
      - field: compound_form_key
        type: number
      - field: form_number
        type: string
      - field: status
        type: string
      - field: main_date
        type: string
      - field: county
        type: string
      - field: vehicle_reg_nr
        type: string
      - field: company_reg_code
        type: string
      - field: company_name
        type: string
      - field: driver_search
        type: string
      - field: inspector_org_id
        type: string
      - field: inspector_name
        type: string
      - field: has_violation
        type: boolean
      - field: created_by
        type: string
      - field: total
        type: number
*/
SELECT
    fs.form_type,
    fs.form_key,
    fs.compound_form_key,
    fs.form_number,
    fs.status,
    fs.main_date,
    fs.county,
    fs.vehicle_reg_nr,
    fs.company_reg_code,
    fs.company_name,
    fs.driver_search,
    fs.inspector_org_id,
    fs.inspector_name,
    fs.has_violation,
    fs.created_by,
    (COUNT(*) OVER ())::INTEGER AS total
FROM forms.form_search fs
WHERE
    fs.form_type = ANY (string_to_array(COALESCE(:allowed_types, ''), ','))
    AND (COALESCE(:form_type, '') = '' OR fs.form_type = :form_type)
    AND (COALESCE(:date_from, '') = '' OR fs.main_date >= :date_from::DATE)
    AND (COALESCE(:date_to, '') = '' OR fs.main_date <= :date_to::DATE)
    AND (COALESCE(:vehicle_reg_nr, '') = '' OR fs.vehicle_reg_nr ILIKE '%' || :vehicle_reg_nr || '%')
    AND (COALESCE(:company_reg_code, '') = '' OR fs.company_reg_code ILIKE '%' || :company_reg_code || '%')
    AND (COALESCE(:company_name, '') = '' OR fs.company_name ILIKE '%' || :company_name || '%')
    AND (COALESCE(:driver, '') = '' OR fs.driver_search ILIKE '%' || lower(:driver) || '%')
    AND (COALESCE(:county, '') = '' OR fs.county ILIKE '%' || :county || '%')
    AND (COALESCE(:inspector_org_id, '') = '' OR fs.inspector_org_id = :inspector_org_id)
    AND (COALESCE(:has_violation, '') = '' OR fs.has_violation = :has_violation::BOOLEAN)
    AND (COALESCE(:status, '') = '' OR fs.status = :status)
ORDER BY
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date asc'      THEN fs.main_date END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date desc'     THEN fs.main_date END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number asc'    THEN fs.form_number COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number desc'   THEN fs.form_number COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'company_name asc'   THEN fs.company_name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'company_name desc'  THEN fs.company_name COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'status asc'         THEN fs.status END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'status desc'        THEN fs.status END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_type asc'      THEN fs.form_type END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_type desc'     THEN fs.form_type END DESC,
    fs.main_date DESC, fs.created_at DESC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
