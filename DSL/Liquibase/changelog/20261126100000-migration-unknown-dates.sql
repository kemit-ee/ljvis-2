-- liquibase formatted sql
-- changeset ljvis:20261126100000 ignore:true splitStatements:false
-- Owner decision 2026-10-19 P08/P13: unknown historical dates are NULL.
-- New application forms retain their required dates. The API never accepts
-- legacy_import from a client; subsequent snapshots inherit it from the DB.
ALTER TABLE forms.good_repute_form ADD COLUMN legacy_import boolean NOT NULL DEFAULT false;
ALTER TABLE forms.good_repute_form ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE forms.good_repute_form ALTER COLUMN certificate_issue_date DROP NOT NULL;
ALTER TABLE forms.good_repute_form ADD CONSTRAINT chk_grf_known_dates
    CHECK (legacy_import OR (date_of_birth IS NOT NULL AND certificate_issue_date IS NOT NULL));
ALTER TABLE forms.good_repute_form DROP CONSTRAINT chk_grf_unfit_dates_required;
ALTER TABLE forms.good_repute_form ADD CONSTRAINT chk_grf_unfit_dates_required
    CHECK (legacy_import OR fitness_status <> 'unfit' OR
           (unfit_from_date IS NOT NULL AND unfit_until_date IS NOT NULL));
COMMENT ON COLUMN forms.good_repute_form.legacy_import IS
    'Imported LJVIS1 form: unknown source dates may stay NULL. Not writable through API.';
