/*
declaration:
  version: 0.1
  description: >-
    LJVIS2-152: paginated, filtered admin list of the LATEST risk-score
    record per company (risk.company_risk_score is insert-only/historical —
    see docs/risk-score/formula.md). Filters are plain AND. Sorting is
    whitelisted; total via COUNT(*) OVER() to keep round trips to one.
    Mirrors DSL/Resql/ljvis/POST/erru/ncr/search.sql's "latest per key" +
    pagination pattern.
  method: post
  accepts: json
  returns: json
  namespace: risk_score
  allowlist:
    body:
      - field: company_name
        type: string
      - field: company_reg_code
        type: string
      - field: risk_band_code
        type: string
      - field: sorting
        type: string
      - field: page
        type: string
      - field: page_size
        type: string
  response:
    fields:
      - field: company_name
        type: string
      - field: company_reg_code
        type: string
      - field: risk_score
        type: string
      - field: risk_band_code
        type: string
      - field: total_controls
        type: number
      - field: total
        type: number
*/
WITH latest AS (
  SELECT DISTINCT ON (company_reg_code) *
  FROM risk.company_risk_score
  ORDER BY company_reg_code, created_at DESC
)
SELECT
  l.company_name,
  l.company_reg_code,
  l.risk_score,
  l.risk_band_code,
  l.total_controls,
  (COUNT(*) OVER())::INTEGER AS total
FROM latest l
WHERE
  (COALESCE(:company_name, '') = '' OR l.company_name ILIKE '%' || :company_name || '%')
  AND (COALESCE(:company_reg_code, '') = '' OR l.company_reg_code ILIKE '%' || :company_reg_code || '%')
  AND (COALESCE(:risk_band_code, '') = '' OR l.risk_band_code = :risk_band_code)
ORDER BY
  -- Sort keys MUST match frontend/src/hooks/stringUtils.ts's toSnakeCase()
  -- output of the AppTable column accessor keys (companyName -> company_name,
  -- NOT "name" — a mismatch here silently produces NO sort at all, since
  -- every CASE WHEN falls through to the company_reg_code tiebreaker below;
  -- confirmed live: sorting=company_name asc/desc, the actual string the UI
  -- sends when the "Veoettevõtja" header is clicked, previously matched
  -- nothing here because this file only recognised 'name asc'/'name desc').
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'company_name asc'  THEN l.company_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'company_name desc' THEN l.company_name COLLATE "et-EE-x-icu" END DESC,
  -- NULLS LAST on both directions: unscored ("Hall"/Kontrollimata) companies
  -- have risk_score=NULL and should sit at the end regardless of sort
  -- direction, not jump to the top on DESC (Postgres' default NULLS FIRST).
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'risk_score asc'    THEN l.risk_score END ASC NULLS LAST,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'risk_score desc'   THEN l.risk_score END DESC NULLS LAST,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'risk_band_code asc'  THEN l.risk_band_code END ASC,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'risk_band_code desc' THEN l.risk_band_code END DESC,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'total_controls asc'  THEN l.total_controls END ASC,
  CASE WHEN COALESCE(:sorting, 'company_name asc') = 'total_controls desc' THEN l.total_controls END DESC,
  -- deterministic tiebreaker: prevents LIMIT/OFFSET paging from repeating or skipping rows
  l.company_reg_code ASC
LIMIT  COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
