-- liquibase formatted sql
-- changeset ljvis:20260805100000 ignore:true
-- Code review fix: align labour_inspection_form version-bump semantics with the
-- canonical "Koondvormi elutsükkel" rule (version does not bump on repeat saves
-- while status='saved'; it only bumps when an edit_locked admin re-saves already
-- confirmed data). This means multiple 'saved' snapshots can now legitimately
-- share the same (form_number, version) pair, which uq_lif_form_number_version
-- would reject — same conflict that was already resolved for good_repute_form.

DROP INDEX IF EXISTS forms.uq_lif_form_number_version;
