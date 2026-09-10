-- liquibase formatted sql
-- changeset ljvis:20261116100000 ignore:true
--
-- ADR-010: kustutatud kontrollvormide arhiiv ERALDI andmebaasis
-- (dev/CI: ljvis_arhiiv_db, toodang: ljvis2_<env>_arhiiv). Ei mingit
-- postgres_fdw'd ega cross-DB SQL-i — kogu suhtlus käib Ruuteri + resql
-- (projekt "arhiiv") kaudu. Üks skeemistabiilne ümbrik-tabel: iga rida =
-- üks arhiveeritud snapshot, terve algne rida `payload` JSONB-is +
-- copy-ajal resolutsiooniga looja nimi/org (siin users.user_account puudub).
-- Vt docs/workingdocs/architecture-decisions.md (ADR-010).

CREATE SCHEMA IF NOT EXISTS archive;
COMMENT ON SCHEMA archive IS 'Kustutatud kontrollvormide snapshot-arhiiv (ADR-010). Cron archive-deleted-forms kolib siia forms.* deleted-olemid; töö-baasis toimub päris DELETE alles pärast siinset verifitseerimist.';

CREATE TABLE IF NOT EXISTS archive.form_snapshot (
  form_type        text        NOT NULL,
  id               bigint      NOT NULL,
  form_key         bigint      NOT NULL,
  form_number      text,
  version          integer,
  status           text,
  created_at       timestamptz,
  created_by       text,
  created_by_name  text,
  org_name         text,
  payload          jsonb       NOT NULL,
  archived_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_form_snapshot PRIMARY KEY (form_type, id)
);
COMMENT ON TABLE archive.form_snapshot IS 'Üks rida = üks arhiveeritud kontrollvormi snapshot. form_type = frontend/endpoint string (nt ''labour-inspection''), id = algne forms.<t>.id, payload = to_jsonb(rea *).';

CREATE INDEX IF NOT EXISTS idx_form_snapshot_key
  ON archive.form_snapshot (form_type, form_key, version);
CREATE INDEX IF NOT EXISTS idx_form_snapshot_number
  ON archive.form_snapshot (form_number);
CREATE INDEX IF NOT EXISTS idx_form_snapshot_archived_at
  ON archive.form_snapshot (archived_at);
