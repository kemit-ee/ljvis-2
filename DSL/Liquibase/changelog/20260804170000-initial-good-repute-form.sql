-- liquibase formatted sql
-- changeset ljvis:20260804170000 ignore:true
-- LJVIS2-136: Hea maine vorm (veokorraldusjuhi hea maine nõudele mittevastavus).
-- Independent form (no parent compound form). INSERT-only snapshot table;
-- one row per save. Current state = latest row per good_repute_form_key.
CREATE SCHEMA IF NOT EXISTS forms;

CREATE SEQUENCE IF NOT EXISTS forms.seq_good_repute_form_key START 1;

CREATE TABLE forms.good_repute_form (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    good_repute_form_key            BIGINT          NOT NULL,
    form_number                     VARCHAR(20)     NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    status                          VARCHAR(20)     NOT NULL,
    -- ── Veokorraldusjuhi andmed ─────────────────────────────
    personal_code                   VARCHAR(20)     NOT NULL,
    first_name                      VARCHAR(100)    NOT NULL,
    last_name                       VARCHAR(100)    NOT NULL,
    date_of_birth                   DATE            NOT NULL,
    place_of_birth                  VARCHAR(200),
    -- ── Ametialase pädevuse tunnistus ───────────────────────
    certificate_number               VARCHAR(100)    NOT NULL,
    certificate_issue_date           DATE            NOT NULL,
    certificate_country_code         VARCHAR(10)     NOT NULL,
    -- ── Sobivuse hinnang ────────────────────────────────────
    fitness_status                  VARCHAR(20)     NOT NULL,
    unfit_from_date                 DATE,
    unfit_until_date                DATE,
    -- ── Audit ───────────────────────────────────────────────
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_good_repute_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.good_repute_form IS 'INSERT-only snapshot of the hea maine (good repute) independent control form (LJVIS2-136). Current state = latest row per good_repute_form_key (ORDER BY created_at DESC LIMIT 1). Standalone form — no parent compound form.';
COMMENT ON COLUMN forms.good_repute_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.good_repute_form.good_repute_form_key IS 'Stable logical identity (from forms.seq_good_repute_form_key). All snapshot rows of one form share this value. NOT unique.';
COMMENT ON COLUMN forms.good_repute_form.form_number IS 'Form number core, format mv-AAAA-NNNNN (prefix mv). Logically immutable across all snapshots; displayed as mv-AAAA-NNNNN/V (version not stored in this column).';
COMMENT ON COLUMN forms.good_repute_form.version IS 'Display version (/V suffix). Starts at 1. Per LJVIS2-136: repeat saves while status=saved do NOT increment version; increments only when re-saving already-locked (confirmed) data.';
COMMENT ON COLUMN forms.good_repute_form.status IS 'Lifecycle status: saved, confirmed, deleted.';
COMMENT ON COLUMN forms.good_repute_form.personal_code IS 'Veokorraldusjuhi isikukood või välisriigi identifikaator. Max 20 characters. Uppercased on save.';
COMMENT ON COLUMN forms.good_repute_form.first_name IS 'Veokorraldusjuhi eesnimi. Max 100 characters. Uppercased on save.';
COMMENT ON COLUMN forms.good_repute_form.last_name IS 'Veokorraldusjuhi perekonnanimi. Max 100 characters. Uppercased on save.';
COMMENT ON COLUMN forms.good_repute_form.date_of_birth IS 'Veokorraldusjuhi sünniaeg. Must not be in the future.';
COMMENT ON COLUMN forms.good_repute_form.place_of_birth IS 'Veokorraldusjuhi sünnikoht. Max 200 characters. Optional. Uppercased on save.';
COMMENT ON COLUMN forms.good_repute_form.certificate_number IS 'Ametialase pädevuse tunnistuse number. Max 100 characters. Uppercased on save.';
COMMENT ON COLUMN forms.good_repute_form.certificate_issue_date IS 'Ametialase pädevuse tunnistuse väljaandmise kuupäev. Must not be in the future.';
COMMENT ON COLUMN forms.good_repute_form.certificate_country_code IS 'Tunnistuse väljastanud riik. Classifier RTK value code (e.g. EE).';
COMMENT ON COLUMN forms.good_repute_form.fitness_status IS 'Veokorraldusjuhi sobivuse hinnang: fit (Sobib) or unfit (Sobimatu).';
COMMENT ON COLUMN forms.good_repute_form.unfit_from_date IS 'Sobimatuks tunnistamise kuupäev. Required and only meaningful when fitness_status = unfit.';
COMMENT ON COLUMN forms.good_repute_form.unfit_until_date IS 'Sobimatuse lõppkuupäev. Required and only meaningful when fitness_status = unfit; must be later than unfit_from_date.';
COMMENT ON COLUMN forms.good_repute_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.good_repute_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_grf_key_ts              ON forms.good_repute_form (good_repute_form_key, created_at DESC);
CREATE INDEX idx_grf_form_number         ON forms.good_repute_form (form_number);
CREATE INDEX idx_grf_status              ON forms.good_repute_form (status);
CREATE INDEX idx_grf_personal_code       ON forms.good_repute_form (personal_code);

ALTER TABLE forms.good_repute_form
    ADD CONSTRAINT chk_grf_status CHECK (status IN ('saved', 'confirmed', 'deleted')),
    ADD CONSTRAINT chk_grf_fitness_status CHECK (fitness_status IN ('fit', 'unfit')),
    ADD CONSTRAINT chk_grf_personal_code_not_blank CHECK (btrim(personal_code) <> ''),
    ADD CONSTRAINT chk_grf_first_name_not_blank CHECK (btrim(first_name) <> ''),
    ADD CONSTRAINT chk_grf_last_name_not_blank CHECK (btrim(last_name) <> ''),
    ADD CONSTRAINT chk_grf_date_of_birth_not_future CHECK (date_of_birth <= CURRENT_DATE),
    ADD CONSTRAINT chk_grf_certificate_number_not_blank CHECK (btrim(certificate_number) <> ''),
    ADD CONSTRAINT chk_grf_certificate_issue_date_not_future CHECK (certificate_issue_date <= CURRENT_DATE),
    ADD CONSTRAINT chk_grf_certificate_country_code_not_blank CHECK (btrim(certificate_country_code) <> ''),
    ADD CONSTRAINT chk_grf_unfit_dates_required CHECK (
        fitness_status <> 'unfit' OR (unfit_from_date IS NOT NULL AND unfit_until_date IS NOT NULL)
    ),
    ADD CONSTRAINT chk_grf_unfit_until_after_from CHECK (
        unfit_from_date IS NULL OR unfit_until_date IS NULL OR unfit_until_date > unfit_from_date
    ),
    ADD CONSTRAINT chk_grf_version_positive CHECK (version >= 1);
