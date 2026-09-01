/*
declaration:
  version: 0.2
  description: "Citizen-facing read-only form listing over forms.form_search (LJVIS2-9 view). Companion to control-forms/search/search.sql, but without the officer allowed_types row-level filter. Two mutually-exclusive scopes, chosen by which param is non-empty (Ruuter passes exactly one, never both): company_reg_code (representative view — every citizen-visible form of that company) or personal_code (füüsiline isik / citizen-self view — forms where the person appears as driver/punished person/good-repute subject, via an exact space-delimited-token match against form_search.driver_search — NOT the officer 'driver' filter's ILIKE substring technique, since a substring match against another person's national ID code would be an unacceptable false-positive/precision risk on a PII-scoped citizen-facing endpoint). Citizen-visible status is 'published' for every form type, including good_repute — matches the general control-form lifecycle spec (LJVIS2-136: only the 'Avalikustatud' state is documented as visible to all read-permission holders; 'Kinnitatud' only relaxes field editability for officers/admins, it does not grant public visibility). A prior version of this query also accepted good_repute at 'confirmed'; that was flagged as an unresolved, not-signed-off-by-product exception during code review (code-review-citizen-company-view.md) and has been reverted to the published-only rule that applies to every other form type. Sub-forms (sp_driver/sp_teammate/vehicle_technical/trailer_technical/adr/kv) carry no data of their own for the citizen view — they're collapsed into their parent 'compound' row (dedup CTE below) so a citizen sees exactly one row per control, with has_violation OR'd in from any sub-form sibling."
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
WITH scoped AS (
    SELECT
        fs.*,
        -- Sub-form rows share compound_form_key with their parent 'compound'
        -- row and inherit the same company_reg_code/driver_search — fold a
        -- violation found on any of them into the control as a whole before
        -- the dedup step below drops the sub-form rows themselves.
        bool_or(fs.has_violation) OVER (
            PARTITION BY COALESCE(fs.compound_form_key, fs.form_key)
        ) AS agg_has_violation
    FROM forms.form_search fs
    WHERE
        fs.status = 'published'
        AND (
            (COALESCE(:company_reg_code, '') <> '' AND fs.company_reg_code = :company_reg_code)
            OR (COALESCE(:personal_code, '') <> '' AND lower(:personal_code) = ANY(string_to_array(fs.driver_search, ' ')))
        )
        AND (COALESCE(:form_type, '') = '' OR fs.form_type = :form_type)
),
deduped AS (
    SELECT
        form_type, form_key, compound_form_key, form_number, status, main_date,
        county, vehicle_reg_nr, company_reg_code, company_name,
        agg_has_violation AS has_violation, created_at
    FROM scoped
    -- One row per control: standalone types (compound_form_key IS NULL —
    -- foreign_violation/labour_inspection/good_repute) pass through as-is;
    -- for compound + its sub-forms, keep only the 'compound' row.
    WHERE compound_form_key IS NULL OR form_type = 'compound'
)
SELECT
    form_type, form_key, compound_form_key, form_number, status, main_date,
    county, vehicle_reg_nr, company_reg_code, company_name, has_violation,
    (COUNT(*) OVER ())::INTEGER AS total
FROM deduped
ORDER BY
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date asc'   THEN main_date END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'main_date desc'  THEN main_date END DESC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number asc'  THEN form_number COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'main_date desc') = 'form_number desc' THEN form_number COLLATE "et-EE-x-icu" END DESC,
    main_date DESC, created_at DESC
LIMIT :page_size::INTEGER
OFFSET ((GREATEST(:page::INTEGER, 1) - 1) * :page_size::INTEGER);
