-- liquibase formatted sql
-- changeset ljvis:20261115100000 ignore:true splitStatements:false
--
-- ADR-009: eraldi `tableau` skeem hallatud MATERIALISEERITUD vaadetega.
-- Analüütika jaoks ajalugu ei loe → matview salvestab füüsiliselt ainult
-- aktiivse seisu (üks rida per loogiline võti) ja on kõvasti indekseeritav.
-- Öine `tableau.refresh_all()` (CronManager 03:00). PII: variant A — isikukoodid
-- pseudonümiseeritud, sünnikuupäev → aasta, nimed jäävad.
-- Vt docs/planning/tableau-schema-plan.md.
--

CREATE SCHEMA IF NOT EXISTS tableau;
COMMENT ON SCHEMA tableau IS 'Ainult-lugemiseks analüütikavaated (Tableau). Materialiseeritud, öine refresh (tableau.refresh_all). Iga vaade = iga loogilise võtme viimane mittekustutatud snapshot. PII maskeeritud (ADR-009 variant A). Vt docs/planning/Tableau_guidlines.md.';

-- ── Roll ─────────────────────────────────────────────────────────────
-- CREATE ROLE IF NOT EXISTS PG-s puudub. LOGIN + parool annab DevOps eraldi.
-- Guarditud: kui liquibase kasutajal pole CREATEROLE, jäta vahele (DevOps loob).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    BEGIN
      CREATE ROLE tableau_ro NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'tableau_ro rolli ei loodud (CREATEROLE puudub) — DevOps loob käsitsi';
    END;
  END IF;
END $$;

-- ── Öine värskendus ──────────────────────────────────────────────────
-- Iga matview loeb baastabeleid OTSE (mitte teisi matview'sid) → refresh-järjekord
-- ükskõik, uued matview'd lisanduvad automaatselt. Mitte-CONCURRENTLY (CONCURRENTLY
-- ei tohi funktsiooni sees joosta) — lühike ACCESS EXCLUSIVE lukk per vaade, 03:00.
-- SECURITY DEFINER: REFRESH MATERIALIZED VIEW nõuab omanikuõigust. Funktsioon
-- jookseb loojana (= liquibase kasutaja = matview'de omanik), nii et ka eraldi
-- rakenduse-kasutaja saab öist värskendust kutsuda. search_path fikseeritud.
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
COMMENT ON FUNCTION tableau.refresh_all() IS 'Värskendab kõik tableau skeemi materialiseeritud vaated (SECURITY DEFINER). Kutsub öine cron (DSL/CronManager/tableau-matview-refresh.yaml).';
GRANT EXECUTE ON FUNCTION tableau.refresh_all() TO PUBLIC;

-- ════════════════════════════════════════════════════════════════════
-- DIMENSIOONID
-- ════════════════════════════════════════════════════════════════════

-- ── tableau.classifier_value_current ────────────────────────────────
-- Koodide dekodeerimine. classifier + classifier_value on mõlemad snapshot.
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
  c.code                                         AS classifier_code,
  c.name                                         AS classifier_name,
  cv.code                                        AS value_code,
  cv.name                                        AS value_name,
  p.code                                         AS parent_value_code,
  p.name                                         AS parent_value_name,
  cv.valid_from,
  cv.valid_until,
  (cv.valid_from <= CURRENT_DATE
   AND (cv.valid_until IS NULL OR cv.valid_until > CURRENT_DATE)) AS is_valid
FROM lcv cv
JOIN lc c        ON c.classifier_key = cv.classifier_key
LEFT JOIN lcv p  ON p.classifier_value_key = cv.parent_key;

CREATE UNIQUE INDEX uq_tableau_cvc_key ON tableau.classifier_value_current (classifier_value_key);
CREATE INDEX idx_tableau_cvc_code ON tableau.classifier_value_current (classifier_code, value_code);
COMMENT ON MATERIALIZED VIEW tableau.classifier_value_current IS 'Klassifikaatori väärtused inimloetavate nimedega. JOIN: forms.*.<x>_code = value_code VÕI forms.*.<x> (nt county) = classifier_value_key::text. is_valid arvutatud valid_from/valid_until-ist.';

-- ── tableau.ehak ────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW tableau.ehak AS
SELECT
  cv.classifier_value_key AS ehak_key,
  cv.value_code            AS ehak_code,
  cv.value_name            AS ehak_name,
  cv.parent_value_code     AS county_code,
  cv.parent_value_name     AS county_name,
  (cv.parent_value_code IS NULL) AS is_county
FROM tableau.classifier_value_current cv
WHERE cv.classifier_code = 'EHAK';

CREATE UNIQUE INDEX uq_tableau_ehak_key ON tableau.ehak (ehak_key);
COMMENT ON MATERIALIZED VIEW tableau.ehak IS 'EHAK haldusüksused lamedaks: maakond (is_county=true, county_* NULL) ja linn/vald (county_* täidetud). JOIN forms.*.county = ehak_key::text.';

-- ── tableau.organisation ────────────────────────────────────────────
-- users.organisation EI ole snapshot (PK id, UNIQUE code). Materialiseeritud
-- siia, et Tableau ei vaja `users` skeemi grant'i (matview = turvapiir).
CREATE MATERIALIZED VIEW tableau.organisation AS
SELECT id, name, code
FROM users.organisation;

CREATE UNIQUE INDEX uq_tableau_org_id ON tableau.organisation (id);
CREATE INDEX idx_tableau_org_code ON tableau.organisation (code);
COMMENT ON MATERIALIZED VIEW tableau.organisation IS 'Asutused (id → nimi, kood). Materialiseeritud users.organisation-ist et Tableau ei vaja users skeemi ligipääsu.';

-- ════════════════════════════════════════════════════════════════════
-- FAKT: form_overview — ristvormi "üks rida per vorm"
-- ════════════════════════════════════════════════════════════════════
-- Ehitatud forms.form_search peale (mis juba lahendab DISTINCT ON + mitte-deleted
-- + has_violation + driver_search). form_search on rakenduse hallatud vaade —
-- form_overview pärib selle hoolduse.
-- NB: loeb baastabeleid OTSE (forms.form_search, users.organisation) + ainult
-- tableau.classifier_value_current (mis refresh'itakse alfabeetiliselt enne) —
-- nii on refresh-järjekord garanteeritud ilma sõltuvusgraafita.
CREATE MATERIALIZED VIEW tableau.form_overview AS
SELECT
  fs.form_type,
  fs.form_key,
  fs.compound_form_key,
  CASE WHEN fs.form_type = 'tram_control_card' THEN 'TRAM' ELSE 'PPA' END AS authority,
  fs.form_number,
  fs.status,
  (fs.status = 'published')                       AS is_published,
  fs.main_date,
  EXTRACT(YEAR FROM fs.main_date)::int            AS main_year,
  fs.county                                       AS county_key,
  county_cv.value_name                            AS county_name,
  fs.vehicle_reg_nr,
  fs.company_reg_code,
  fs.company_name,
  fs.inspector_org_id,
  org.name                                        AS inspector_organisation_name,
  fs.inspector_name,
  fs.has_violation,
  -- driver_search sisaldab isikukoode → ainult nimeosa (§3, ADR-009)
  regexp_replace(coalesce(fs.driver_search, ''), '[0-9]{6,}', '', 'g') AS driver_search_names,
  fs.vr_reporting_country_code,
  fs.vr_sanction_code,
  fs.created_at
FROM forms.form_search fs
LEFT JOIN LATERAL (
  SELECT value_name
  FROM tableau.classifier_value_current
  WHERE classifier_code = 'EHAK'
    AND (value_code = fs.county OR classifier_value_key::text = fs.county)
  LIMIT 1
) county_cv ON true
LEFT JOIN LATERAL (
  SELECT name
  FROM users.organisation
  WHERE code = fs.inspector_org_id OR id::text = fs.inspector_org_id
  LIMIT 1
) org ON true;

CREATE UNIQUE INDEX uq_tableau_fo_key ON tableau.form_overview (form_type, form_key);
CREATE INDEX idx_tableau_fo_authority   ON tableau.form_overview (authority);
CREATE INDEX idx_tableau_fo_status      ON tableau.form_overview (status);
CREATE INDEX idx_tableau_fo_main_date   ON tableau.form_overview (main_date);
CREATE INDEX idx_tableau_fo_company     ON tableau.form_overview (company_reg_code);
CREATE INDEX idx_tableau_fo_org         ON tableau.form_overview (inspector_org_id);
CREATE INDEX idx_tableau_fo_compound    ON tableau.form_overview (compound_form_key);
COMMENT ON MATERIALIZED VIEW tableau.form_overview IS 'Üks rida per kontrollvorm (kõik tüübid). authority = PPA/TRAM. is_published filtriks. Aluseks dashboardidele. Detailveerud (version, proceeding_type, rikkumiste read) tulevad tableau.<olem>_current ja fakt-vaadetega (PR2).';

-- ════════════════════════════════════════════════════════════════════
-- Grants — guarditud (roll võib puududa kui CREATEROLE keelatud)
-- ════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA tableau TO tableau_ro';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO tableau_ro';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO tableau_ro';
  END IF;
END $$;
