-- liquibase formatted sql
-- changeset ljvis:20261229120000 ignore:true splitStatements:false
--
-- forms.derive_sp_erru_points() ei arvestanud mass_dimension_measurements veergu —
-- sõiduki massi, pikkuse ja laiuse rikkumiste ERRU koodid (SI922, VSI843, MSI701,
-- SI923, VSI844, MSI702, SI924, VSI845, SI925, VSI846) ei jõudnud kunagi
-- erru_points väärtusesse ega seega NCR-teate seriousInfringements loetellu.
--
-- Lisab uue 8. parameetri violations_mass (vaikimisi '[]'), mis liidetakse
-- teiste rikkumiste hulka samamoodi (level3Code/severity väljadega objektid;
-- kõrgus ja teljekoormus on ilma raskusastmeta ja jäävad välja).
-- Kutsujad, kes uut parameetrit ei anna (meeskonnaliige, TRAM-kaart), töötavad edasi.
--
-- Lõpus arvutatakse salvestatud erru_points uuesti kõigil vormidel, mille
-- tulemus erineb: kaetud on nii massi/mõõtmete koodid kui ka eelmise migratsiooni
-- (20261229110000) ümbernimetatud koodid. Käsitsi lisatud punktid säilivad.

DROP FUNCTION IF EXISTS forms.derive_sp_erru_points(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);

CREATE OR REPLACE FUNCTION forms.derive_sp_erru_points(
    violations_561_2006 JSONB,
    violations_165_2014 JSONB,
    violations_2002_15 JSONB,
    violations_593_2008 JSONB,
    violations_2020_1057 JSONB,
    violations_cabotage JSONB DEFAULT '[]'::JSONB,
    existing_points JSONB DEFAULT '[]'::JSONB,
    violations_mass JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    WITH violations AS (
        SELECT value AS item FROM jsonb_array_elements(COALESCE(violations_561_2006, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_165_2014, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_2002_15, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_593_2008, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_2020_1057, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_cabotage, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_mass, '[]'::JSONB))
    ), normalized AS (
        SELECT DISTINCT
            COALESCE(item->>'violationCode', item->>'level3Code') AS erru_code,
            UPPER(COALESCE(item->>'severityCode', item->>'severity')) AS severity_category
          FROM violations
         WHERE UPPER(COALESCE(item->>'severityCode', item->>'severity', '')) IN ('MSI', 'VSI', 'SI')
           AND COALESCE(item->>'violationCode', item->>'level3Code', '') <> ''
    ), points AS (
        SELECT jsonb_build_object(
            'erru_code', erru_code,
            'severity_category', severity_category,
            'source_type', 'auto_from_violation'
        ) AS point
          FROM normalized
        UNION
        SELECT value
          FROM jsonb_array_elements(COALESCE(existing_points, '[]'::JSONB))
         WHERE value->>'source_type' = 'manual'
    )
    SELECT COALESCE(jsonb_agg(point ORDER BY point->>'erru_code'), '[]'::JSONB)
      FROM points;
$$;

UPDATE forms.sp_driver_form f
   SET erru_points = forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points, f.mass_dimension_measurements)
 WHERE f.erru_points IS DISTINCT FROM forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points, f.mass_dimension_measurements);

UPDATE forms.sp_teammate_form f
   SET erru_points = forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points, f.mass_dimension_measurements)
 WHERE f.erru_points IS DISTINCT FROM forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points, f.mass_dimension_measurements);

UPDATE forms.tram_control_card f
   SET erru_points = forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points)
 WHERE f.erru_points IS DISTINCT FROM forms.derive_sp_erru_points(
           f.violations_561_2006, f.violations_165_2014, f.violations_2002_15,
           f.violations_593_2008, f.violations_2020_1057, f.cabotage_violations,
           f.erru_points);
