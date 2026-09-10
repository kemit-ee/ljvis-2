-- liquibase formatted sql
-- changeset ljvis:20261117100000 ignore:true splitStatements:false
-- Rollback: taasta 20261115100000 seis — materialiseeritud vaated + refresh_all().

DROP INDEX IF EXISTS forms.idx_compound_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_tram_control_card_tableau_active;
DROP INDEX IF EXISTS forms.idx_sp_driver_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_sp_teammate_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_vehicle_technical_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_trailer_technical_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_adr_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_kv_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_foreign_violation_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_labour_inspection_form_tableau_active;
DROP INDEX IF EXISTS forms.idx_good_repute_form_tableau_active;
DROP INDEX IF EXISTS classifier.idx_classifier_tableau_latest;
DROP INDEX IF EXISTS classifier.idx_classifier_value_tableau_latest;

DROP VIEW IF EXISTS tableau.form_overview            CASCADE;
DROP VIEW IF EXISTS tableau.organisation             CASCADE;
DROP VIEW IF EXISTS tableau.ehak                     CASCADE;
DROP VIEW IF EXISTS tableau.classifier_value_current CASCADE;

CREATE OR REPLACE FUNCTION tableau.refresh_all() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, matviewname
    FROM pg_catalog.pg_matviews
    WHERE schemaname = 'tableau'
    ORDER BY matviewname
  LOOP
    EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I', r.schemaname, r.matviewname);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION tableau.refresh_all() TO PUBLIC;

CREATE MATERIALIZED VIEW tableau.classifier_value_current AS
WITH lc AS (
  SELECT DISTINCT ON (classifier_key) classifier_key, code, name
  FROM classifier.classifier
  ORDER BY classifier_key, created_at DESC
),
lcv AS (
  SELECT DISTINCT ON (classifier_value_key)
    classifier_value_key, classifier_key, code, name, parent_key, valid_from, valid_until
  FROM classifier.classifier_value
  ORDER BY classifier_value_key, created_at DESC
)
SELECT
  cv.classifier_value_key,
  c.code AS classifier_code, c.name AS classifier_name,
  cv.code AS value_code, cv.name AS value_name,
  p.code AS parent_value_code, p.name AS parent_value_name,
  cv.valid_from, cv.valid_until,
  (cv.valid_from <= CURRENT_DATE
   AND (cv.valid_until IS NULL OR cv.valid_until > CURRENT_DATE)) AS is_valid
FROM lcv cv
JOIN lc c        ON c.classifier_key = cv.classifier_key
LEFT JOIN lcv p  ON p.classifier_value_key = cv.parent_key;
CREATE UNIQUE INDEX uq_tableau_cvc_key ON tableau.classifier_value_current (classifier_value_key);
CREATE INDEX idx_tableau_cvc_code ON tableau.classifier_value_current (classifier_code, value_code);

CREATE MATERIALIZED VIEW tableau.ehak AS
SELECT
  cv.classifier_value_key AS ehak_key, cv.value_code AS ehak_code, cv.value_name AS ehak_name,
  cv.parent_value_code AS county_code, cv.parent_value_name AS county_name,
  (cv.parent_value_code IS NULL) AS is_county
FROM tableau.classifier_value_current cv
WHERE cv.classifier_code = 'EHAK';
CREATE UNIQUE INDEX uq_tableau_ehak_key ON tableau.ehak (ehak_key);

CREATE MATERIALIZED VIEW tableau.organisation AS
SELECT id, name, code FROM users.organisation;
CREATE UNIQUE INDEX uq_tableau_org_id ON tableau.organisation (id);
CREATE INDEX idx_tableau_org_code ON tableau.organisation (code);

CREATE MATERIALIZED VIEW tableau.form_overview AS
SELECT
  fs.form_type, fs.form_key, fs.compound_form_key,
  CASE WHEN fs.form_type = 'tram_control_card' THEN 'TRAM' ELSE 'PPA' END AS authority,
  fs.form_number, fs.status, (fs.status = 'published') AS is_published,
  fs.main_date, EXTRACT(YEAR FROM fs.main_date)::int AS main_year,
  fs.county AS county_key, county_cv.value_name AS county_name,
  fs.vehicle_reg_nr, fs.company_reg_code, fs.company_name,
  fs.inspector_org_id, org.name AS inspector_organisation_name, fs.inspector_name,
  fs.has_violation,
  regexp_replace(coalesce(fs.driver_search, ''), '[0-9]{6,}', '', 'g') AS driver_search_names,
  fs.vr_reporting_country_code, fs.vr_sanction_code, fs.created_at
FROM forms.form_search fs
LEFT JOIN LATERAL (
  SELECT value_name FROM tableau.classifier_value_current
  WHERE classifier_code = 'EHAK'
    AND (value_code = fs.county OR classifier_value_key::text = fs.county)
  LIMIT 1
) county_cv ON true
LEFT JOIN LATERAL (
  SELECT name FROM users.organisation
  WHERE code = fs.inspector_org_id OR id::text = fs.inspector_org_id
  LIMIT 1
) org ON true;
CREATE UNIQUE INDEX uq_tableau_fo_key ON tableau.form_overview (form_type, form_key);
CREATE INDEX idx_tableau_fo_authority ON tableau.form_overview (authority);
CREATE INDEX idx_tableau_fo_status    ON tableau.form_overview (status);
CREATE INDEX idx_tableau_fo_main_date ON tableau.form_overview (main_date);
CREATE INDEX idx_tableau_fo_company   ON tableau.form_overview (company_reg_code);
CREATE INDEX idx_tableau_fo_org       ON tableau.form_overview (inspector_org_id);
CREATE INDEX idx_tableau_fo_compound  ON tableau.form_overview (compound_form_key);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA tableau TO tableau_ro';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO tableau_ro';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO tableau_ro';
  END IF;
END $$;
