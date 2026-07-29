-- liquibase formatted sql
-- changeset ljvis:20260728130000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;

CREATE SEQUENCE IF NOT EXISTS forms.seq_labour_inspection_form_key START 1;

-- labour_inspection_form (INSERT-only snapshot — one row per act state)
CREATE TABLE forms.labour_inspection_form (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    labour_inspection_form_key     BIGINT          NOT NULL,
    form_number                    VARCHAR(20)     NOT NULL,
    version                        INTEGER         NOT NULL DEFAULT 1,
    status                         VARCHAR(50)     NOT NULL,
    -- ── Kontrolli põhiandmed ────────────────────────────────
                                      inspector_name                  VARCHAR(200)    NOT NULL,
                                      inspection_date                 DATE            NOT NULL,
                                      external_inspection_id          VARCHAR(100),
                                      inspection_type                 VARCHAR(20)     NOT NULL,
                                      company_name                    VARCHAR(300)    NOT NULL,
                                      company_reg_code                VARCHAR(20)     NOT NULL,
    -- ── Kontrollimised ──────────────────────────────────────
                                      vehicle_count                   INTEGER,
                                      total_drivers_count              INTEGER,
                                      controls_matrix                 JSONB           NOT NULL DEFAULT '[]',
    -- ── Koostatud ettekirjutus ──────────────────────────────
                                      prescription_composed           BOOLEAN         NOT NULL DEFAULT false,
    -- ── Väärteomenetlus ─────────────────────────────────────
                                      punished_person_id_code         VARCHAR(20),
                                      punished_person_first_name      VARCHAR(100),
                                      punished_person_last_name       VARCHAR(100),
                                      proceeding_reference_number     VARCHAR(50),
    -- ── E-toimiku päring (X-tee, loetav ainult) ─────────────
    -- NOTE: populated only by the (out-of-scope, future) nightly
    -- e-toimik integration job. Never written by this feature.
                                      enforcement_decision            TEXT,
                                      proceeding_closure_basis        TEXT,
    -- ── Rikkumised ──────────────────────────────────────────
                                      violations                      JSONB           NOT NULL DEFAULT '[]',
    -- ── Audit ───────────────────────────────────────────────
                                      created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                      created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
                                      CONSTRAINT pk_labour_inspection_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.labour_inspection_form IS 'INSERT-only snapshot of a Labour Inspectorate control act (Tööinspektsiooni kontrollakt). Every change appends a complete new row. Current state = DISTINCT ON (labour_inspection_form_key) ORDER BY labour_inspection_form_key, created_at DESC. Independent form — no parent compound form is created or referenced.';
COMMENT ON COLUMN forms.labour_inspection_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.labour_inspection_form.labour_inspection_form_key IS 'Stable logical identity of the act (from forms.seq_labour_inspection_form_key). All snapshot rows of one act share this value. NOT unique.';
COMMENT ON COLUMN forms.labour_inspection_form.form_number IS 'Act number core, format ti-AAAA-NNNNN. Logically immutable across all snapshots of the act; uniqueness enforced at orchestration layer. Displayed to the user joined with version as ti-AAAA-NNNNN/V (see version column) — never stores the /V suffix itself.';
COMMENT ON COLUMN forms.labour_inspection_form.version IS 'Display version (the /V suffix of the act number). Starts at 1; increments by 1 on every re-save after the act reaches status=confirmed. Carried forward unchanged on every other re-save.';
COMMENT ON COLUMN forms.labour_inspection_form.status IS 'Lifecycle status: saved, confirmed, deleted. deleted is a final, irreversible soft-delete; deleted rows are hidden from search/view and retained for audit only.';
COMMENT ON COLUMN forms.labour_inspection_form.inspector_name IS 'Name of the inspector who performed the control (kontrolli läbiviimise eest vastutav isik); free text, max 200 characters.';
COMMENT ON COLUMN forms.labour_inspection_form.inspection_date IS 'Date the inspection was performed; must not be in the future (validated FE and backend).';
COMMENT ON COLUMN forms.labour_inspection_form.external_inspection_id IS 'Source-system inspection reference (Tööinspektsiooni infosüsteemi kontrollimise ID). Populated only via X-tee import (out of scope for this task — column reserved); not editable once set.';
COMMENT ON COLUMN forms.labour_inspection_form.inspection_type IS 'Determines the act variant: passenger (Sõitjate vedu) or cargo (Veose vedu).';
COMMENT ON COLUMN forms.labour_inspection_form.company_name IS 'Inspected employer/carrier name; max 300 characters.';
COMMENT ON COLUMN forms.labour_inspection_form.company_reg_code IS 'Inspected employer/carrier registry code; max 20 characters.';
COMMENT ON COLUMN forms.labour_inspection_form.vehicle_count IS 'Number of vehicles at the inspected company; whole numbers only.';
COMMENT ON COLUMN forms.labour_inspection_form.total_drivers_count IS 'Total number of drivers checked; whole numbers only.';
COMMENT ON COLUMN forms.labour_inspection_form.controls_matrix IS 'JSONB array, one row per Transpordiliigid classifier value: [{"transportClass":<classifier value key>,"analogRecorderDrivers":0,"digitalRecorderDrivers":0,"smartRecorderDrivers":0,"analogRecorderWorkDays":0,"digitalRecorderWorkDays":0,"smartRecorderWorkDays":0}].';
COMMENT ON COLUMN forms.labour_inspection_form.prescription_composed IS 'Whether a prescription (ettekirjutus) was composed for this control.';
COMMENT ON COLUMN forms.labour_inspection_form.punished_person_id_code IS 'Personal ID code of the punished natural person; max 20 characters; trimmed on save.';
COMMENT ON COLUMN forms.labour_inspection_form.punished_person_first_name IS 'First name of the punished person; max 100 characters; trimmed on save.';
COMMENT ON COLUMN forms.labour_inspection_form.punished_person_last_name IS 'Last name of the punished person; max 100 characters; trimmed on save.';
COMMENT ON COLUMN forms.labour_inspection_form.proceeding_reference_number IS 'Misdemeanor proceeding reference number; max 50 characters.';
COMMENT ON COLUMN forms.labour_inspection_form.enforcement_decision IS 'Enforcement decision point(s) (jõustunud otsus). Read-only; populated only by the nightly e-toimik integration job (out of scope for this task).';
COMMENT ON COLUMN forms.labour_inspection_form.proceeding_closure_basis IS 'Basis for proceeding closure (menetluse lõpetamise alus). Read-only; populated only by the nightly e-toimik integration job (out of scope for this task).';
COMMENT ON COLUMN forms.labour_inspection_form.violations IS 'JSONB array of violations: [{"level1ValueKey":...,"level2ValueKey":...,"level3ValueKey":...,"quantity":1}]. References classifier.classifier_value rows of the DRIVING_VIOLATION classifier (level3ValueKey NULL for leaf-less level2 entries).';
COMMENT ON COLUMN forms.labour_inspection_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.labour_inspection_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_lif_key_ts                ON forms.labour_inspection_form (labour_inspection_form_key, created_at DESC);
CREATE INDEX idx_lif_form_number           ON forms.labour_inspection_form (form_number);
CREATE INDEX idx_lif_status                ON forms.labour_inspection_form (status);
CREATE INDEX idx_lif_company_reg_code      ON forms.labour_inspection_form (company_reg_code);
CREATE INDEX idx_lif_company_name          ON forms.labour_inspection_form (company_name);
CREATE INDEX idx_lif_punished_person_id    ON forms.labour_inspection_form (punished_person_id_code);
CREATE INDEX idx_lif_controls_matrix_gin   ON forms.labour_inspection_form USING GIN (controls_matrix);
CREATE INDEX idx_lif_violations_gin        ON forms.labour_inspection_form USING GIN (violations);
