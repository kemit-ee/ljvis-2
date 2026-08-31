-- liquibase formatted sql
-- changeset ljvis:20261015100000 ignore:true

-- audit.audit_event.organisation_id — actori asutus kirje kirjutamise hetkel.
-- Tuletatud metaandmed: log-audit-event.yml pärib selle actori isikukoodi järgi.
-- EI kuulu row_hash ahelasse (vt audit.chain() trigger) — ahela valem jääb
-- muutmata, et kõik olemasolevad read kehtima jääksid; asutuse-seos on
-- lugemis-skoobi (audit.read.local) jaoks, mitte võltsimiskindluse osa.
-- Idempotentne: ADD COLUMN IF NOT EXISTS.

ALTER TABLE audit.audit_event ADD COLUMN IF NOT EXISTS organisation_id BIGINT;

COMMENT ON COLUMN audit.audit_event.organisation_id IS 'Actori asutuse id (users.organisation.id) kirje kirjutamise hetkel, tuletatud actori isikukoodi jargi. NULL susteemiprotsessidel (CRON, e-toimik) ja vanadel ridadel mida ei saanud backfillida. Ei kuulu row_hash ahelasse. Kasutatakse auditilogi asutuse-pohiseks skoobiks (audit.read.local).';

CREATE INDEX IF NOT EXISTS idx_ae_organisation_id ON audit.audit_event (organisation_id);

-- Backfill: log_content->>'organisationId' kus olemas ja arvuline.
-- (JSONB '?' operaatorit vältida — JDBC loeb '?' bind-parameetriks.)
UPDATE audit.audit_event
SET organisation_id = (log_content ->> 'organisationId')::BIGINT
WHERE organisation_id IS NULL
  AND NULLIF(log_content ->> 'organisationId', '') ~ '^[0-9]+$';
