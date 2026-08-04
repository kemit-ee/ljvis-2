-- liquibase formatted sql
-- changeset ljvis:20260803150000 ignore:true
-- LJVIS2-72: vehicle/trailer technical roadworthiness check sub-forms (tehnonõuetele vastavus).
-- Two structurally identical tables (see wiki §0 Variandid) — one per sub-form variant.
CREATE SCHEMA IF NOT EXISTS forms;

CREATE SEQUENCE IF NOT EXISTS forms.seq_vehicle_technical_form_key START 1;
CREATE SEQUENCE IF NOT EXISTS forms.seq_trailer_technical_form_key START 1;

-- 1. vehicle_technical_form (INSERT-only snapshot — one row per sub-form state)
CREATE TABLE forms.vehicle_technical_form (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    vehicle_technical_form_key     BIGINT          NOT NULL,
    compound_form_key              BIGINT          NOT NULL,
    sub_form_number                VARCHAR(20)     NOT NULL,
    version                        INTEGER         NOT NULL DEFAULT 1,
    status                         VARCHAR(20)     NOT NULL,
    -- ── Osade ja sõlmede nimekiri ───────────────────────────
    parts_summary                  JSONB           NOT NULL DEFAULT '[]',
    parts_defects                  JSONB           NOT NULL DEFAULT '[]',
    -- ── Kontrolli tulemus ───────────────────────────────────
    result_type                    VARCHAR(30)     NOT NULL DEFAULT 'ok',
    result_transport_interruption  BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_regnr                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_vintin                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_axles                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_places                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_rebuilt                BOOLEAN         NOT NULL DEFAULT false,
    proceeding_type                VARCHAR(50),
    proceeding_reference_number    VARCHAR(50),
    -- ── EL määrusest tulenevad rikkumised ───────────────────
    violations                     JSONB           NOT NULL DEFAULT '[]',
    -- ── Märkused ─────────────────────────────────────────────
    notes                          TEXT,
    -- ── Failid ───────────────────────────────────────────────
    files                           JSONB           NOT NULL DEFAULT '[]',
    -- ── X-tee andmed (edit_locked-only after confirm) ───────
    extraordinary_inspection_date  DATE,
    enforcement_decision            TEXT,
    proceeding_closure_basis        TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                     VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_vehicle_technical_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.vehicle_technical_form IS 'INSERT-only snapshot of the vehicle technical-check sub-form (mootorsõiduki tehnonõuetele vastavuse kontrollvorm, LJVIS2-72). Current state = DISTINCT ON (vehicle_technical_form_key) ORDER BY vehicle_technical_form_key, created_at DESC. Lifecycle mirrors the parent compound_form (saved/confirmed/published); requires an existing compound_form_key.';
COMMENT ON COLUMN forms.vehicle_technical_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.vehicle_technical_form.vehicle_technical_form_key IS 'Stable logical identity (from forms.seq_vehicle_technical_form_key). All snapshot rows of one sub-form share this value. NOT unique.';
COMMENT ON COLUMN forms.vehicle_technical_form.compound_form_key IS 'Logical key of the parent koondvorm. Bare BIGINT; no enforceable FK across snapshot tables. Must reference an already-created compound_form.';
COMMENT ON COLUMN forms.vehicle_technical_form.sub_form_number IS 'Sub-form number core, format th-AAAA-NNNNN. Logically immutable across all snapshots; displayed to the user joined with version as th-AAAA-NNNNN/V (see version column) — never stores the /V suffix itself.';
COMMENT ON COLUMN forms.vehicle_technical_form.version IS 'Display version (the /V suffix). Starts at 1; incremented by 1 on every re-save. Computed server-side (never trusts client input).';
COMMENT ON COLUMN forms.vehicle_technical_form.status IS 'Lifecycle status: saved, confirmed, published. Mirrors the parent compound_form status at the time of save.';
COMMENT ON COLUMN forms.vehicle_technical_form.parts_summary IS 'JSONB array, one entry per TECHNICAL_CHECK level-1 part row: [{"partCode":"CAA_1","status":"not_checked"|"checked"|"non_compliant"}].';
COMMENT ON COLUMN forms.vehicle_technical_form.parts_defects IS 'JSONB array of selected defects (from the "Ei vasta nõuetele" modal): [{"partCode":"CAA_1","defectCode":...,"severity":"VO"|"OV"|"EOV"}]. Defect codes are TECHNICAL_CHECK level-2 classifier values, children of partCode.';
COMMENT ON COLUMN forms.vehicle_technical_form.result_type IS 'Kontrolli tulemus radio: ok (Tehniliselt korras), extraordinary_inspection (erakorralisele tehnoülevaatusele), extraordinary_inspection_ta (+ LR andmete täpsustamiseks Transpordiametis), driving_ban (Sõidukeeld). Auto-derived from parts_defects severities; may be manually escalated but not downgraded while triggering defects are active.';
COMMENT ON COLUMN forms.vehicle_technical_form.result_transport_interruption IS 'Autovedu on katkestatud checkbox (AVS § 51 lg 3 p 1), shown next to result=driving_ban. Existence of a linked transport-interruption sub-form is validated at compound-form confirm time (LJVIS2-74), not here.';
COMMENT ON COLUMN forms.vehicle_technical_form.era_yv_mnt_regnr IS 'Erakorraline ülevaatus TA täpsustus: Registreerimisnumber (A). Shown only when result=extraordinary_inspection_ta.';
COMMENT ON COLUMN forms.vehicle_technical_form.era_yv_mnt_vintin IS 'Erakorraline ülevaatus TA täpsustus: VIN-/TIN-kood (E).';
COMMENT ON COLUMN forms.vehicle_technical_form.era_yv_mnt_axles IS 'Erakorraline ülevaatus TA täpsustus: Telgede arv (L).';
COMMENT ON COLUMN forms.vehicle_technical_form.era_yv_mnt_places IS 'Erakorraline ülevaatus TA täpsustus: Istekohtade arv koos juhiga (S.1).';
COMMENT ON COLUMN forms.vehicle_technical_form.era_yv_mnt_rebuilt IS 'Erakorraline ülevaatus TA täpsustus: Sõiduk on omavoliliselt ümberehitatud.';
COMMENT ON COLUMN forms.vehicle_technical_form.proceeding_type IS 'Menetluse liik radio: summary (lühimenetlus), expedited (kiirmenetlus), general (üldmenetlus). No default. Shown only when result != ok.';
COMMENT ON COLUMN forms.vehicle_technical_form.proceeding_reference_number IS 'Menetluse viitenumber. Mandatory when proceeding_type is set.';
COMMENT ON COLUMN forms.vehicle_technical_form.violations IS 'JSONB array of EU_INFRINGEMENT classifier codes, e.g. ["MSI302"]. MSI302 auto-set when result=driving_ban; removable only with control_form.edit_locked while the triggering defect is inactive (business rule enforced client-side + advisory server check).';
COMMENT ON COLUMN forms.vehicle_technical_form.notes IS 'Free-text notes (märkused); auto-populated per selected defect, user-editable. Hard-limited to 2000 characters — the value cannot be transmitted onward to the Transpordiamet liiklusregister X-tee service otherwise.';
COMMENT ON COLUMN forms.vehicle_technical_form.files IS 'JSONB array of file metadata: [{"fileName":...,"contentType":...,"fileSizeBytes":...,"storageKey":...,"uploadedAt":...,"uploadedBy":...}].';
COMMENT ON COLUMN forms.vehicle_technical_form.extraordinary_inspection_date IS 'X-tee block: erakorralise tehnoülevaatuse läbimise kuupäev. Editable only via save-xroad-fields when status=confirmed and actor has control_form.edit_locked; does not bump version.';
COMMENT ON COLUMN forms.vehicle_technical_form.enforcement_decision IS 'X-tee block: jõustunud otsus. Same edit rules as extraordinary_inspection_date.';
COMMENT ON COLUMN forms.vehicle_technical_form.proceeding_closure_basis IS 'X-tee block: menetluse lõpetamise alus. Same edit rules as extraordinary_inspection_date.';
COMMENT ON COLUMN forms.vehicle_technical_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.vehicle_technical_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_vtf_key_ts       ON forms.vehicle_technical_form (vehicle_technical_form_key, created_at DESC);
CREATE INDEX idx_vtf_compound_key ON forms.vehicle_technical_form (compound_form_key);
CREATE INDEX idx_vtf_status       ON forms.vehicle_technical_form (status);
CREATE INDEX idx_vtf_defects_gin  ON forms.vehicle_technical_form USING GIN (parts_defects);
CREATE INDEX idx_vtf_violations_gin ON forms.vehicle_technical_form USING GIN (violations);

ALTER TABLE forms.vehicle_technical_form
    ADD CONSTRAINT chk_vtf_status CHECK (status IN ('saved', 'confirmed', 'published')),
    ADD CONSTRAINT chk_vtf_result_type CHECK (result_type IN ('ok', 'extraordinary_inspection', 'extraordinary_inspection_ta', 'driving_ban')),
    ADD CONSTRAINT chk_vtf_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
    ADD CONSTRAINT chk_vtf_version_positive CHECK (version >= 1);

CREATE UNIQUE INDEX uq_vtf_sub_form_number_version ON forms.vehicle_technical_form (sub_form_number, version);

-- 2. trailer_technical_form — structurally identical to vehicle_technical_form (see wiki §0 Variandid)
CREATE TABLE forms.trailer_technical_form (
    id                              BIGSERIAL       NOT NULL,
    trailer_technical_form_key     BIGINT          NOT NULL,
    compound_form_key              BIGINT          NOT NULL,
    sub_form_number                VARCHAR(20)     NOT NULL,
    version                        INTEGER         NOT NULL DEFAULT 1,
    status                         VARCHAR(20)     NOT NULL,
    parts_summary                  JSONB           NOT NULL DEFAULT '[]',
    parts_defects                  JSONB           NOT NULL DEFAULT '[]',
    result_type                    VARCHAR(30)     NOT NULL DEFAULT 'ok',
    result_transport_interruption  BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_regnr                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_vintin                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_axles                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_places                BOOLEAN         NOT NULL DEFAULT false,
    era_yv_mnt_rebuilt                BOOLEAN         NOT NULL DEFAULT false,
    proceeding_type                VARCHAR(50),
    proceeding_reference_number    VARCHAR(50),
    violations                     JSONB           NOT NULL DEFAULT '[]',
    notes                          TEXT,
    files                           JSONB           NOT NULL DEFAULT '[]',
    extraordinary_inspection_date  DATE,
    enforcement_decision            TEXT,
    proceeding_closure_basis        TEXT,
    created_at                     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                     VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_trailer_technical_form PRIMARY KEY (id)
);

COMMENT ON TABLE forms.trailer_technical_form IS 'INSERT-only snapshot of the trailer technical-check sub-form (haagise tehnonõuetele vastavuse kontrollvorm, LJVIS2-72). Structurally identical to forms.vehicle_technical_form — see that table''s column comments. Trailer-inapplicable part/defect/violation codes (CAA_2, CAA_3, CAA_7, CAA_9 and children; MSI203, MSI204, VSI847, SI926) are rejected at the Ruuter validation layer, not by a DB constraint (the classifier is shared between both variants).';

CREATE INDEX idx_ttf_key_ts       ON forms.trailer_technical_form (trailer_technical_form_key, created_at DESC);
CREATE INDEX idx_ttf_compound_key ON forms.trailer_technical_form (compound_form_key);
CREATE INDEX idx_ttf_status       ON forms.trailer_technical_form (status);
CREATE INDEX idx_ttf_defects_gin  ON forms.trailer_technical_form USING GIN (parts_defects);
CREATE INDEX idx_ttf_violations_gin ON forms.trailer_technical_form USING GIN (violations);

ALTER TABLE forms.trailer_technical_form
    ADD CONSTRAINT chk_ttf_status CHECK (status IN ('saved', 'confirmed', 'published')),
    ADD CONSTRAINT chk_ttf_result_type CHECK (result_type IN ('ok', 'extraordinary_inspection', 'extraordinary_inspection_ta', 'driving_ban')),
    ADD CONSTRAINT chk_ttf_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
    ADD CONSTRAINT chk_ttf_version_positive CHECK (version >= 1);

CREATE UNIQUE INDEX uq_ttf_sub_form_number_version ON forms.trailer_technical_form (sub_form_number, version);

-- 3. TECHNICAL_CHECK classifier — level 1 only (real part/assembly codes & names,
-- from LJVIS2-72 analysis document §4 "Osade read"). Level-2 defect codes are not
-- given by the source document (no authoritative EU Annex II item list was
-- provided) and are therefore seeded as a clearly-marked placeholder set in
-- DSL/Liquibase/test/, per .ai/coding_guidelines_and_lessons_learned.md
-- ("fabricated/placeholder data never in the production changelog").
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (
    nextval('classifier.seq_classifier_key'),
    'TECHNICAL_CHECK',
    'Sõiduki tehnonõuetele vastavuse kontrollitavad osad ja sõlmed',
    'EL direktiivi 2014/47/EL Lisa II kohased osade/sõlmede grupid (1. tase) ja nende rikked (2. tase). Kasutatakse mootorsõiduki ja haagise tehnovormil (LJVIS2-72); haagise vormil filtreeritakse kliendipoolel välja CAA_2, CAA_3, CAA_7, CAA_9.',
    'system'
);

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1),
    t.code,
    t.name,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
    ('CAA_0',  'identifitseerimine'),
    ('CAA_1',  'pidurisüsteem'),
    ('CAA_2',  'rooliseade'),
    ('CAA_3',  'nähtavus'),
    ('CAA_4',  'valgustusseadmed ja elektrisüsteem'),
    ('CAA_5',  'teljed, veljed, rehvid, vedrustus'),
    ('CAA_6',  'šassii ja selle kinnitused'),
    ('CAA_7',  'muu varustus, sh sõidumeerik ja kiiruspiirik'),
    ('CAA_8',  'saasted, sh heitgaasid ning kütuse- ja/või õlilekked'),
    ('CAA_9',  'täiendavad kontrollitavad sõlmed reisijateveoks kasutatavale M2 ja M3 kategooria mootorsõidukile'),
    ('CAA_11', 'veose kinnitamine'),
    ('CAA_10', 'muu')
) AS t(code, name);
