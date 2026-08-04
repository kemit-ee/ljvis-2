-- liquibase formatted sql
-- changeset ljvis:20260804160000 ignore:true
-- LJVIS2-141: ADR (ohtlik veos) kontrollvormi alamvorm (uus).
-- INSERT-only snapshot table; one row per save. Current state = latest row per adr_form_key.
CREATE SCHEMA IF NOT EXISTS forms;

CREATE SEQUENCE IF NOT EXISTS forms.seq_adr_form_key START 1;

CREATE TABLE forms.adr_form (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    adr_form_key                    BIGINT          NOT NULL,
    compound_form_key               BIGINT          NOT NULL,
    sub_form_number                 VARCHAR(20)     NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    status                          VARCHAR(20)     NOT NULL,
    -- ── §4.3 Autojuhi abi andmed ───────────────────────────
    driver_assistant                JSONB,
    -- ── §4.4 ADR koolitustunnistuse numbrid ────────────────
    driver_adr_certificate_number   VARCHAR(100),
    crew_adr_certificate_number     VARCHAR(100),
    assistant_adr_certificate_number VARCHAR(100),
    -- ── §4.5 Viimase peale-/mahalaadimise aadress ──────────
    last_load_address               JSONB,
    last_load_date                  DATE,
    -- ── §4.6 Järgmise peale-/mahalaadimise aadress ─────────
    next_load_address               JSONB,
    -- ── §4.7 Ohtlike kaupade andmed ────────────────────────
    dangerous_goods                 JSONB           NOT NULL DEFAULT '[]',
    -- ── §4.8 Erandi kohaldamine ────────────────────────────
    exemption_applied               BOOLEAN         NOT NULL DEFAULT false,
    exemption_adr_provision         VARCHAR(200),
    -- ── §4.9 Mahutid ───────────────────────────────────────
    container_type                  VARCHAR(20),
    -- ── §4.10 Rikkumised ───────────────────────────────────
    infringements                   JSONB           NOT NULL DEFAULT '[]',
    other_violations                TEXT,
    -- ── §4.11 Tulemus ──────────────────────────────────────
    result_type                     VARCHAR(80)     NOT NULL DEFAULT 'ok',
    proceeding_type                 VARCHAR(50),
    proceeding_reference_number     VARCHAR(50),
    corrective_measures             JSONB           NOT NULL DEFAULT '[]',
    seal_opened                     BOOLEAN         NOT NULL DEFAULT false,
    seal_opened_date                DATE,
    seal_installed_date             DATE,
    -- ── §4.12 Märkused ─────────────────────────────────────
    notes                           TEXT,
    -- ── §4.14 X-tee andmed (edit_locked-only after confirm) ─
    enforcement_decision            TEXT,
    proceeding_closure_basis        TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_adr_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.adr_form IS 'INSERT-only snapshot of the ADR (ohtlik veos) control sub-form (LJVIS2-141). Current state = latest row per adr_form_key (ORDER BY created_at DESC LIMIT 1). Requires an existing compound_form_key.';
COMMENT ON COLUMN forms.adr_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.adr_form.adr_form_key IS 'Stable logical identity (from forms.seq_adr_form_key). All snapshot rows of one ADR sub-form share this value. NOT unique.';
COMMENT ON COLUMN forms.adr_form.compound_form_key IS 'Logical key of the parent koondvorm. Bare BIGINT; no enforceable FK across snapshot tables.';
COMMENT ON COLUMN forms.adr_form.sub_form_number IS 'Sub-form number core, format ov-AAAA-NNNNN. Logically immutable across all snapshots; displayed as ov-AAAA-NNNNN/V (version not stored in this column).';
COMMENT ON COLUMN forms.adr_form.version IS 'Display version (/V suffix). Starts at 1; incremented server-side on every re-save.';
COMMENT ON COLUMN forms.adr_form.status IS 'Lifecycle status: saved, confirmed, published.';
COMMENT ON COLUMN forms.adr_form.driver_assistant IS 'JSONB object: {"personalCodeEe":...,"firstName":...,"lastName":...,"citizenshipCode":...,"personalCodeForeign":...,"birthDate":...}. Nullable — filled only when relevant per §4.3.';
COMMENT ON COLUMN forms.adr_form.driver_adr_certificate_number IS 'Autojuhi ADR koolitustunnistuse number. Max 100 chars.';
COMMENT ON COLUMN forms.adr_form.crew_adr_certificate_number IS 'Meeskonnaliikme ADR koolitustunnistuse number. Max 100 chars.';
COMMENT ON COLUMN forms.adr_form.assistant_adr_certificate_number IS 'Autojuhi abi ADR koolitustunnistuse number. Max 100 chars.';
COMMENT ON COLUMN forms.adr_form.last_load_address IS 'JSONB object: {"countryCode":...,"county":...,"city":...,"street":...,"postalCode":...}. Nullable.';
COMMENT ON COLUMN forms.adr_form.last_load_date IS 'Viimase peale-/mahalaadimise kuupäev. Must not be in the future.';
COMMENT ON COLUMN forms.adr_form.next_load_address IS 'Same structure as last_load_address. Nullable.';
COMMENT ON COLUMN forms.adr_form.dangerous_goods IS 'JSONB array: [{"unNumber":...,"packagingGroup":...,"quantity":...,"unitCode":...}]. Min 0 entries.';
COMMENT ON COLUMN forms.adr_form.exemption_applied IS 'Kas kohaldatakse erandit (§4.8). Default false.';
COMMENT ON COLUMN forms.adr_form.exemption_adr_provision IS 'ADRi punkt kui exemption_applied=true. Max 200 chars.';
COMMENT ON COLUMN forms.adr_form.container_type IS 'Mahuti tüüp: mahtlast, paak, pakend, MEMU. Nullable.';
COMMENT ON COLUMN forms.adr_form.infringements IS 'JSONB array of checked infringement rows (empty-selection rows omitted): [{"classifierValueKey":...,"checkStatus":...,"riskCategory":...,"adrProvision":...,"notes":...}].';
COMMENT ON COLUMN forms.adr_form.other_violations IS 'Muud rikkumised free-text. Max 4000 chars.';
COMMENT ON COLUMN forms.adr_form.result_type IS 'Kontrolli tulemus: ok, misdemeanor_proceedings, warning, driving_ban_art5, transport_interruption. Default ok.';
COMMENT ON COLUMN forms.adr_form.proceeding_type IS 'Menetluse liik: expedited (kiirmenetlus), general (üldmenetlus). Shown only when result_type != ok.';
COMMENT ON COLUMN forms.adr_form.proceeding_reference_number IS 'Menetluse viitenumber. Mandatory when proceeding_type is set.';
COMMENT ON COLUMN forms.adr_form.corrective_measures IS 'JSONB array of selected corrective measures: ["on_spot","before_journey_end","at_premises"].';
COMMENT ON COLUMN forms.adr_form.seal_opened IS 'Plomm avatud kontrolli käigus. Default false.';
COMMENT ON COLUMN forms.adr_form.seal_opened_date IS 'Plommi avamise kuupäev. Shown only when seal_opened=true.';
COMMENT ON COLUMN forms.adr_form.seal_installed_date IS 'Plommi paigaldamise kuupäev. Shown only when seal_opened=true.';
COMMENT ON COLUMN forms.adr_form.notes IS 'Märkused vabatekst. Max 4000 chars.';
COMMENT ON COLUMN forms.adr_form.enforcement_decision IS 'X-tee: Jõustunud otsus. Editable only via save-xroad-fields when status=confirmed and actor has control_form.edit_locked. Max 700 chars.';
COMMENT ON COLUMN forms.adr_form.proceeding_closure_basis IS 'X-tee: Menetluse lõpetamise alus. Same edit rules. Max 700 chars.';
COMMENT ON COLUMN forms.adr_form.created_at IS 'Snapshot creation timestamp; ordering key.';
COMMENT ON COLUMN forms.adr_form.created_by IS 'Personal code of the actor. Loose audit reference; no FK.';

CREATE INDEX idx_adr_key_ts          ON forms.adr_form (adr_form_key, created_at DESC);
CREATE INDEX idx_adr_compound_key    ON forms.adr_form (compound_form_key);
CREATE INDEX idx_adr_status          ON forms.adr_form (status);
CREATE INDEX idx_adr_goods_gin       ON forms.adr_form USING GIN (dangerous_goods);
CREATE INDEX idx_adr_infringements_gin ON forms.adr_form USING GIN (infringements);

ALTER TABLE forms.adr_form
    ADD CONSTRAINT chk_adr_status CHECK (status IN ('saved', 'confirmed', 'published')),
    ADD CONSTRAINT chk_adr_result_type CHECK (result_type IN ('ok', 'misdemeanor_proceedings', 'warning', 'driving_ban_art5', 'transport_interruption')),
    ADD CONSTRAINT chk_adr_notes_length CHECK (notes IS NULL OR char_length(notes) <= 4000),
    ADD CONSTRAINT chk_adr_other_violations_length CHECK (other_violations IS NULL OR char_length(other_violations) <= 4000),
    ADD CONSTRAINT chk_adr_version_positive CHECK (version >= 1);

CREATE UNIQUE INDEX uq_adr_sub_form_number_version ON forms.adr_form (sub_form_number, version);
