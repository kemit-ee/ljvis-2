-- liquibase formatted sql
-- changeset ljvis:20261117100000 ignore:true splitStatements:false
--
-- ADR-009 revideeritud (kasutaja otsus 10.09.2026): Tableau soovib TAVALISI
-- vaateid, mitte materialiseeritud. Öine refresh ja lukk kaovad; kiirus tuleb
-- aluslaua OSALISTEST indeksitest (ainult aktiivne, mittekustutatud hulk).
-- Vaadete SELECT-id on identsed 20261115100000-tableau-schema-01-core.sql-iga.
--

-- ── Materialiseeritud vaated + öine refresh maha ─────────────────────
DROP MATERIALIZED VIEW IF EXISTS tableau.form_overview            CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tableau.organisation             CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tableau.ehak                     CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tableau.classifier_value_current CASCADE;
DROP FUNCTION IF EXISTS tableau.refresh_all();

COMMENT ON SCHEMA tableau IS 'Ainult-lugemiseks analüütikavaated (Tableau). TAVALISED vaated — iga vaade = iga loogilise võtme viimane mittekustutatud snapshot, arvutatud päringu ajal. Kiirus: aluslaua osalised indeksid (idx_*_tableau_active). PII maskeeritud (ADR-009 variant A). Vt docs/planning/Tableau_guidlines.md.';

-- ════════════════════════════════════════════════════════════════════
-- DIMENSIOONID
-- ════════════════════════════════════════════════════════════════════

CREATE VIEW tableau.classifier_value_current AS
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
COMMENT ON VIEW tableau.classifier_value_current IS 'Klassifikaatori väärtused inimloetavate nimedega. JOIN: forms.*.<x>_code = value_code VÕI forms.*.<x> (nt county) = classifier_value_key::text. is_valid arvutatud valid_from/valid_until-ist.';

CREATE VIEW tableau.ehak AS
SELECT
  cv.classifier_value_key AS ehak_key,
  cv.value_code            AS ehak_code,
  cv.value_name            AS ehak_name,
  cv.parent_value_code     AS county_code,
  cv.parent_value_name     AS county_name,
  (cv.parent_value_code IS NULL) AS is_county
FROM tableau.classifier_value_current cv
WHERE cv.classifier_code = 'EHAK';
COMMENT ON VIEW tableau.ehak IS 'EHAK haldusüksused lamedaks: maakond (is_county=true, county_* NULL) ja linn/vald (county_* täidetud). JOIN forms.*.county = ehak_key::text.';

CREATE VIEW tableau.organisation AS
SELECT id, name, code
FROM users.organisation;
COMMENT ON VIEW tableau.organisation IS 'Asutused (id → nimi, kood). Vaade users.organisation-ist. Jookseb omaniku (liquibase-kasutaja) õigustega — tableau_ro ei vaja users skeemi grant''i.';

-- ════════════════════════════════════════════════════════════════════
-- FAKT: form_overview — ristvormi "üks rida per vorm"
-- ════════════════════════════════════════════════════════════════════
CREATE VIEW tableau.form_overview AS
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
COMMENT ON VIEW tableau.form_overview IS 'Üks rida per kontrollvorm (kõik tüübid). authority = PPA/TRAM. is_published filtriks. Aluseks dashboardidele.';

-- ════════════════════════════════════════════════════════════════════
-- Aluslaua osalised indeksid — "aktiivne snapshot" leidmiseks kiiresti
-- (DISTINCT ON (<key>) ... WHERE status <> 'deleted' muster forms.form_search-is)
-- ════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_compound_form_tableau_active          ON forms.compound_form          (compound_form_key, created_at DESC)          WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_tram_control_card_tableau_active      ON forms.tram_control_card      (tram_control_card_key, created_at DESC)      WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_sp_driver_form_tableau_active         ON forms.sp_driver_form         (sp_driver_form_key, created_at DESC)         WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_sp_teammate_form_tableau_active       ON forms.sp_teammate_form       (sp_teammate_form_key, created_at DESC)       WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_vehicle_technical_form_tableau_active ON forms.vehicle_technical_form (vehicle_technical_form_key, created_at DESC) WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_trailer_technical_form_tableau_active ON forms.trailer_technical_form (trailer_technical_form_key, created_at DESC) WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_adr_form_tableau_active              ON forms.adr_form               (adr_form_key, created_at DESC)               WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_kv_form_tableau_active               ON forms.kv_form                (kv_form_key, created_at DESC)                WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_foreign_violation_form_tableau_active ON forms.foreign_violation_form (foreign_violation_form_key, created_at DESC) WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_labour_inspection_form_tableau_active ON forms.labour_inspection_form (labour_inspection_form_key, created_at DESC) WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS idx_good_repute_form_tableau_active      ON forms.good_repute_form       (good_repute_form_key, created_at DESC)       WHERE status <> 'deleted';

CREATE INDEX IF NOT EXISTS idx_classifier_tableau_latest        ON classifier.classifier       (classifier_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classifier_value_tableau_latest  ON classifier.classifier_value (classifier_value_key, created_at DESC);

-- ── Grants ──────────────────────────────────────────────────────────
-- Tavaline Postgres vaade jookseb VAIKIMISI OMANIKU õigustega
-- (security_invoker pole seatud; PG 17 vaikeväärtus = false). Vaated kuuluvad
-- liquibase-kasutajale, kes näeb kõiki aluslaudu → tableau_ro vajab AINULT
-- USAGE + SELECT `tableau` skeemis. Aluslaua-grante (forms/classifier/users)
-- EI anta: need laseks rollil lugeda maskimata `forms.compound_form.drivers`
-- (isikukoodid), `punished_person_*`, `violations_*` — mööda ADR-009 variant A
-- maskimist. PII maskimine vaadetes on seega tegelik turvapiir.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA tableau TO tableau_ro';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO tableau_ro';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO tableau_ro';
  END IF;
END $$;
