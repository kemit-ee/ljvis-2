\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE points JSONB;
BEGIN
  points := forms.derive_sp_erru_points(
    '[{"level3Code":"VSI800","severity":"VSI"},{"level3Code":"MI","severity":"MI"}]',
    '[{"violationCode":"MSI600","severityCode":"MSI"}]',
    '[{"level3Code":"SI901","severity":"SI"},{"level3Code":"VSI800","severity":"VSI"}]',
    '[{"level3Code":"VSI874","severity":"VSI"}]',
    '[{"level3Code":"SI951","severity":"SI"}]',
    '[{"erru_code":"OLD","severity_category":"VSI","source_type":"auto_from_violation"},
      {"erru_code":"MANUAL","severity_category":"SI","source_type":"manual"}]'
  );
  IF jsonb_array_length(points) <> 6 THEN
    RAISE EXCEPTION 'All five groups and manual points must contribute; duplicate and MI must not: %', points;
  END IF;
  IF points @> '[{"erru_code":"MI"}]' OR points @> '[{"erru_code":"OLD"}]' THEN
    RAISE EXCEPTION 'MI and removed automatic infringements must not be sent to ERRU: %', points;
  END IF;
  IF NOT points @> '[{"erru_code":"VSI800","severity_category":"VSI","source_type":"auto_from_violation"}]' THEN
    RAISE EXCEPTION 'Selected violation did not become an ERRU infringement: %', points;
  END IF;
  IF forms.derive_sp_erru_points(NULL,NULL,NULL,NULL,NULL) <> '[]'::JSONB THEN
    RAISE EXCEPTION 'A form without infringements must have no automatic ERRU points';
  END IF;
END $$;
ROLLBACK;
\echo SP ERRU point derivation checks passed
