-- liquibase formatted sql
-- changeset ljvis:20261116110000 ignore:true
--
-- ADR-014 / LJVIS2-51: märgib, millal archive.form_snapshot rea isikuandmed on
-- anonymize_confirmed.sql poolt eemaldatud (vt purge_confirmed.sql järel käivituv
-- samm archive-deleted-forms.yml / archive-aged-forms.yml-is). NULL = veel
-- anonümiseerimata; kasutatakse idempotentsuse kaitseks (rida ei töödelda teist korda).

ALTER TABLE archive.form_snapshot ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

COMMENT ON COLUMN archive.form_snapshot.anonymized_at IS 'ADR-014: isikuandmete eemaldamise ajatempel (NULL = veel anonümiseerimata).';

CREATE INDEX IF NOT EXISTS idx_form_snapshot_unanonymized
  ON archive.form_snapshot (archived_at)
  WHERE anonymized_at IS NULL;
