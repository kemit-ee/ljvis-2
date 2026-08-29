/*
declaration:
  version: 0.1
  description: "Citizen-facing read-only form listing over forms.form_search (LJVIS2-9 view). Companion to control-forms/search/search.sql, but without the officer allowed_types row-level filter. Two mutually-exclusive scopes, chosen by which param is non-empty (Ruuter passes exactly one, never both): company_reg_code (representative view — every citizen-visible form of that company) or personal_code (füüsiline isik / citizen-self view — forms where the person appears as driver/punished person/good-repute subject, via an exact space-delimited-token match against form_search.driver_search — NOT the officer 'driver' filter's ILIKE substring technique, since a substring match against another person's national ID code would be an unacceptable false-positive/precision risk on a PII-scoped citizen-facing endpoint). Citizen-visible status is 'published' for every form type EXCEPT good_repute, whose lifecycle (chk_grf_status) never reaches 'published' — its terminal state is 'confirmed'."
  method: post
  accepts: json
  returns: json
  namespace: citizen
  allowlist:
    body:
      - field: company_reg_code
        type: string
        description: "Active company's registry code (company scope) — from the citizen session's activeRegistryCode, never client-supplied trust boundary. Empty when scope is personal_code."
      - field: personal_code
        type: string
        description: "Session's personal code (citizen-self scope). Empty when scope is company_reg_code."
      - field: page
        type: number
        description: "Page number (1-based)"
      - field: page_size
        type: number
        description: "Rows per page"
      - field: sorting
        type: string
        description: "Sort column and direction, e.g. 'main_date desc'"
      - field: form_type
        type: string
        description: "Filter by a single form type"
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
      - field: has_violation
        type: boolean
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
    fs.has_violation,
    (COUNT(*) OVER ())::INTEGER AS total
FROM forms.form_search fs
WHERE
    (fs.status = 'published' OR (fs.form_type = 'good_repute' AND fs.status = 'confirmed'))
    AND (
        (COALESCE(:company_reg_code, '') <> '' AND fs.company_reg_code = :company_reg_code)
        OR (COALESCE(:personal_code, '') <> '' AND lower(:personal_code) = ANY(string_to_array(fs.driver_search, ' ')))
    )
    AND (COALESCE(:form_type, '') = '' OR fs.form_type = :form_type)
ORDER BY
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date asc'   THEN fs.main_date END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date desc'  THEN fs.main_date END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number asc'  THEN fs.form_number COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number desc' THEN fs.form_number COLLATE "et-EE-x-icu" END DESC,
    fs.main_date DESC, fs.created_at DESC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
