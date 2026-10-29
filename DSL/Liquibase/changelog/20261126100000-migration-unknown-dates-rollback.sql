-- liquibase formatted sql
-- changeset ljvis:20261126100000-rollback ignore:true splitStatements:false
-- Never invent dates or remove historical data to make rollback succeed.
LOCK TABLE forms.good_repute_form IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM forms.good_repute_form WHERE date_of_birth IS NULL
        OR certificate_issue_date IS NULL OR (fitness_status='unfit'
          AND (unfit_from_date IS NULL OR unfit_until_date IS NULL))) THEN
        RAISE EXCEPTION 'Rollback refused: imported unknown dates exist. Restore the pre-migration backup or resolve them explicitly.';
    END IF;
END $$;
ALTER TABLE forms.good_repute_form DROP CONSTRAINT chk_grf_known_dates;
ALTER TABLE forms.good_repute_form DROP CONSTRAINT chk_grf_unfit_dates_required;
ALTER TABLE forms.good_repute_form ADD CONSTRAINT chk_grf_unfit_dates_required
    CHECK (fitness_status <> 'unfit' OR (unfit_from_date IS NOT NULL AND unfit_until_date IS NOT NULL));
ALTER TABLE forms.good_repute_form ALTER COLUMN date_of_birth SET NOT NULL;
ALTER TABLE forms.good_repute_form ALTER COLUMN certificate_issue_date SET NOT NULL;
ALTER TABLE forms.good_repute_form DROP COLUMN legacy_import;
