-- liquibase formatted sql
-- changeset ljvis:20260805100000-rollback ignore:true

CREATE UNIQUE INDEX uq_lif_form_number_version
    ON forms.labour_inspection_form (form_number, version)
    WHERE status <> 'deleted';

COMMENT ON INDEX forms.uq_lif_form_number_version IS 'Guards against duplicate (form_number, version) pairs among non-deleted snapshots. Deleted tombstones are excluded since delete.sql intentionally reuses the version of the snapshot it soft-deletes.';
