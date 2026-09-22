-- liquibase formatted sql
-- changeset ljvis:20261124130000 ignore:true splitStatements:false
--
-- NCR->välisriigi kontrollkaart andmeülekande testimise plaan, p.2 (analüütika,
-- kasutaja soovil täisulatuses): forms.foreign_violation_form.violations
-- muutus lamedast koodide massiivist objektide massiiviks, kus igal
-- rikkumisel on oma sanktsioon/soovitatud meede (vt 20261124110000). Praegune
-- tableau.form_overview kajastab ainult boolean has_violation + kaardi
-- tasemel vr_sanction_code — see vaade lisab rikkumisepõhise detailtaseme,
-- ühe rea per (kontrollkaart, rikkumine).
--
-- ADR-009 turvamudel: plain view (töötab OMANIKU õigustega, mitte päris
-- pärija õigustega — vt 20261121100000/20261121110000 kemit_andmelaadija
-- rolli kommentaari), GRANT ainult tableau skeemile, mitte forms.* peale.
--

CREATE VIEW tableau.foreign_violation_result AS
SELECT
  latest.foreign_violation_form_key                          AS form_key,
  latest.form_number,
  latest.status,
  (latest.status = 'published')                               AS is_published,
  latest.inspection_date,
  EXTRACT(YEAR FROM latest.inspection_date)::int              AS inspection_year,
  latest.reporting_country_code,
  latest.vehicle_country_code,
  latest.company_reg_code,
  latest.company_name,
  v.code                                                       AS violation_code,
  CASE
    WHEN v.code ~ '^MSI' THEN 'MSI'
    WHEN v.code ~ '^VSI' THEN 'VSI'
    WHEN v.code ~ '^SI'  THEN 'SI'
    ELSE NULL
  END                                                          AS severity_group,
  v.sanction_code,
  v.sanction_notes,
  v.recommended_measure_code,
  v.recommended_measure_notes,
  latest.created_at
FROM (
  SELECT DISTINCT ON (foreign_violation_form_key)
    foreign_violation_form_key,
    form_number,
    status,
    inspection_date,
    reporting_country_code,
    vehicle_country_code,
    company_reg_code,
    company_name,
    violations,
    created_at
  FROM forms.foreign_violation_form
  WHERE status <> 'deleted'
  ORDER BY foreign_violation_form_key, created_at DESC
) latest
CROSS JOIN LATERAL (
  SELECT
    (e ->> 'code')                       AS code,
    (e ->> 'sanctionCode')                AS sanction_code,
    (e ->> 'sanctionNotes')               AS sanction_notes,
    (e ->> 'recommendedMeasureCode')      AS recommended_measure_code,
    (e ->> 'recommendedMeasureNotes')     AS recommended_measure_notes
  FROM jsonb_array_elements(COALESCE(latest.violations, '[]'::JSONB)) e
) v;

COMMENT ON VIEW tableau.foreign_violation_result IS 'Rikkumisepõhine detailvaade forms.foreign_violation_form.violations JSONB-ist lahti keritud (üks rida per rikkumine). Aluseks form_key = tableau.form_overview.form_key (WHERE authority=''PPA'' vms). severity_group tuletatud violation_code prefiksist (MSI/VSI/SI). Kaarte, kus violations on tühi (pole rikkumisi), selles vaates ei kuvata — need on nähtavad tableau.form_overview kaudu (has_violation).';

CREATE INDEX IF NOT EXISTS idx_foreign_violation_form_violations_gin
  ON forms.foreign_violation_form USING GIN (violations)
  WHERE status <> 'deleted';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kemit_andmelaadija') THEN
    EXECUTE 'GRANT SELECT ON tableau.foreign_violation_result TO kemit_andmelaadija';
  END IF;
END $$;
