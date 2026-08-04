-- liquibase formatted sql
-- changeset ljvis:20260804120000 ignore:true
-- LJVIS2-74: autoveo katkestamise kontrollvorm (transport-interruption), kv_form.
CREATE SCHEMA IF NOT EXISTS forms;

CREATE SEQUENCE IF NOT EXISTS forms.seq_kv_form_key START 1;

-- kv_form (INSERT-only snapshot — one row per sub-form state)
CREATE TABLE forms.kv_form (
    -- ── Identity & lifecycle ────────────────────────────────
    id                          BIGSERIAL       NOT NULL,
    kv_form_key                 BIGINT          NOT NULL,
    compound_form_key           BIGINT          NOT NULL,
    sub_form_number             VARCHAR(20)     NOT NULL,
    version                     INTEGER         NOT NULL DEFAULT 1,
    status                      VARCHAR(20)     NOT NULL,
    -- ── Päis ─────────────────────────────────────────────────
    header_text                 TEXT,
    -- ── Elukoht ──────────────────────────────────────────────
    residence_country           VARCHAR(2)      DEFAULT 'EE',
    residence_region            VARCHAR(100),
    residence_city               VARCHAR(100),
    residence_address_line      VARCHAR(300),
    residence_postal_code       VARCHAR(10),
    -- ── Kontrolli tulemus: katkestamise põhjus ja alused ────
    interruption_reason         TEXT,
    legal_bases                 JSONB           NOT NULL DEFAULT '[]',
    -- ── Autoveo katkestamise lõppemise tingimus ─────────────
    termination_condition       TEXT            DEFAULT 'KUNI VEO KATKESTAMISE ALUSE ÄRALANGEMISENI.',
    -- ── Isiku taotlused ──────────────────────────────────────
    person_applications         TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                  VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_kv_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.kv_form IS 'INSERT-only snapshot of the transport-interruption sub-form (autoveo katkestamise kontrollvorm, LJVIS2-74). Current state = DISTINCT ON (kv_form_key) ORDER BY kv_form_key, created_at DESC. Lifecycle mirrors the parent compound_form (saved/confirmed/published); requires an existing compound_form_key.';
COMMENT ON COLUMN forms.kv_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.kv_form.kv_form_key IS 'Stable logical identity (from forms.seq_kv_form_key). All snapshot rows of one sub-form share this value. NOT unique.';
COMMENT ON COLUMN forms.kv_form.compound_form_key IS 'Logical key of the parent koondvorm. Bare BIGINT; no enforceable FK across snapshot tables. Must reference an already-created compound_form.';
COMMENT ON COLUMN forms.kv_form.sub_form_number IS 'Sub-form number core, format ko-AAAA-NNNNN. Logically immutable across all snapshots; displayed to the user joined with version as ko-AAAA-NNNNN/V (see version column) — never stores the /V suffix itself.';
COMMENT ON COLUMN forms.kv_form.version IS 'Display version (the /V suffix). Starts at 1; incremented by 1 on every re-save. Computed server-side (never trusts client input).';
COMMENT ON COLUMN forms.kv_form.status IS 'Lifecycle status: saved, confirmed, published. Mirrors the parent compound_form status at the time of save.';
COMMENT ON COLUMN forms.kv_form.header_text IS 'Päis — asutuse päise andmed. Pre-filled client-side from classifier PPA_STRUCTURE_UNIT_ADDRESS by the officer''s structural unit; left blank if no match. User-editable, uppercased on save.';
COMMENT ON COLUMN forms.kv_form.residence_country IS 'Elukoht: riik (Riik classifier code). Default EE.';
COMMENT ON COLUMN forms.kv_form.residence_region IS 'Elukoht: maakond (EHAK level-1 name, dropdown when country=EE, free text otherwise).';
COMMENT ON COLUMN forms.kv_form.residence_city IS 'Elukoht: linn/vald (EHAK level-2 name).';
COMMENT ON COLUMN forms.kv_form.residence_address_line IS 'Elukoht: asula/tänav/maja nr. Uppercased on save.';
COMMENT ON COLUMN forms.kv_form.residence_postal_code IS 'Elukoht: sihtnumber.';
COMMENT ON COLUMN forms.kv_form.interruption_reason IS 'Katkestamise põhjuse vaba kirjeldus ("Kuna:"). Uppercased on save.';
COMMENT ON COLUMN forms.kv_form.legal_bases IS 'JSONB array of INTERRUPTION_BASES classifier codes selected as legal grounds, e.g. ["autovs_51_lg3_p1"]. Multiple selection allowed.';
COMMENT ON COLUMN forms.kv_form.termination_condition IS 'Autoveo katkestamise lõppemise tingimus. Pre-filled with a default value; user-editable. Uppercased on save.';
COMMENT ON COLUMN forms.kv_form.person_applications IS 'Isiku taotlused — vaba tekst. Uppercased on save.';
-- Files: attached separately via forms.form_attachment, keyed by sub_form_number (see LJVIS-50 files templates). No column here.
COMMENT ON COLUMN forms.kv_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.kv_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_kv_key_ts       ON forms.kv_form (kv_form_key, created_at DESC);
CREATE INDEX idx_kv_compound_key ON forms.kv_form (compound_form_key);
CREATE INDEX idx_kv_status       ON forms.kv_form (status);
CREATE INDEX idx_kv_legal_bases_gin ON forms.kv_form USING GIN (legal_bases);

ALTER TABLE forms.kv_form
    ADD CONSTRAINT chk_kv_status CHECK (status IN ('saved', 'confirmed', 'published')),
    ADD CONSTRAINT chk_kv_version_positive CHECK (version >= 1);

CREATE UNIQUE INDEX uq_kv_sub_form_number_version ON forms.kv_form (sub_form_number, version);

-- INTERRUPTION_BASES classifier — 4 legal-basis codes (LJVIS2-74 §4 "Õiguslikud alused").
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (
    nextval('classifier.seq_classifier_key'),
    'INTERRUPTION_BASES',
    'Autoveo katkestamise õiguslikud alused',
    'AutoVS § 51 lg 3 punktide 1–4 kohased autoveo katkestamise õiguslikud alused (LJVIS2-74). Kasutatakse autoveo katkestamise kontrollvormil mitmikvalikuna.',
    'system'
);

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, description, valid_from, valid_until, created_by)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    (SELECT classifier_key FROM classifier.classifier WHERE code = 'INTERRUPTION_BASES' ORDER BY created_at DESC LIMIT 1),
    t.code,
    t.legal_reference,
    t.description,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
    ('autovs_51_lg3_p1', 'AutoVS § 51 lg 3 p 1', 'Veose paigutus või kinnitus ei vasta nõuetele ja tegemist on ohtliku raskusastmega rikkumisega.'),
    ('autovs_51_lg3_p2', 'AutoVS § 51 lg 3 p 2', 'Ohtliku veose autoveol veetakse keelatud ainet või kasutatakse nõuetele mittevastavat sõidukit.'),
    ('autovs_51_lg3_p3', 'AutoVS § 51 lg 3 p 3', 'Veoettevõtjal puudub kehtiv tegevusluba või autojuhil puudub kehtiv dokument.'),
    ('autovs_51_lg3_p4', 'AutoVS § 51 lg 3 p 4', 'Vedaja on andnud tegevusloa ärakirja üle isikule, kes ei tööta vedaja juures.')
) AS t(code, legal_reference, description);
