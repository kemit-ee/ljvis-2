-- liquibase formatted sql
-- changeset ljvis:20261112100000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;

-- Stable logical identity of a TRAM control card (all snapshot rows share one value).
CREATE SEQUENCE IF NOT EXISTS forms.seq_tram_control_card_key START 1;
-- Visible act-number counter (tram-AAAA-NNNNN). Separate from the key so the
-- displayed number stays gap-free even if a key is consumed without a card.
CREATE SEQUENCE IF NOT EXISTS forms.seq_tram_control_card_number START 1;

-- tram_control_card (INSERT-only snapshot — one row per card state)
-- Supersedes the two-entity model (forms.compound_form authority='TRAM'
-- + forms.sp_driver_form) described in ADR-001. See ADR-002.
CREATE TABLE forms.tram_control_card (
    -- ── Identity & lifecycle ────────────────────────────────
    id                                  BIGSERIAL       NOT NULL,
    tram_control_card_key               BIGINT          NOT NULL,
    form_number                         VARCHAR(20)     NOT NULL,
    control_year                        INTEGER         NOT NULL,
    version                             INTEGER         NOT NULL DEFAULT 1,
    status                              VARCHAR(50)     NOT NULL,
    -- ── Üldosa: kontrollikoht ───────────────────────────────
    control_date                        DATE            NOT NULL,
    control_time                        TIME,
    control_country_code                VARCHAR(3),
    county                              VARCHAR(100),
    city                                VARCHAR(100),
    road                                VARCHAR(100),
    road_other                          VARCHAR(200),
    kilometer                           INTEGER,
    address                             VARCHAR(300),
    road_type                           VARCHAR(30),
    road_tax_status                     VARCHAR(30),
    road_tax_notes                      TEXT,
    -- ── Üldosa: sõiduk ──────────────────────────────────────
    vehicle_reg_nr                      VARCHAR(20),
    vehicle_make                        VARCHAR(100),
    vehicle_model                       VARCHAR(100),
    vehicle_country_code                VARCHAR(3),
    vehicle_vin                         VARCHAR(30),
    vehicle_first_registration          DATE,
    vehicle_body_type                   VARCHAR(50),
    vehicle_category_code               VARCHAR(20),
    vehicle_category_other              VARCHAR(100),
    vehicle_mileage                     INTEGER,
    trailers                            JSONB           NOT NULL DEFAULT '[]',
    -- ── Üldosa: vedaja ──────────────────────────────────────
    company_reg_code                    VARCHAR(20),
    company_name                        VARCHAR(300),
    company_country_code                VARCHAR(3),
    company_county                      VARCHAR(100),
    company_city                        VARCHAR(100),
    company_address                     VARCHAR(300),
    company_postal_code                 VARCHAR(20),
    company_owner_first_name            VARCHAR(100),
    company_owner_last_name             VARCHAR(100),
    company_activity_licence_copy_number VARCHAR(50),
    -- ── Üldosa: ametiisik ───────────────────────────────────
    inspector_first_name                VARCHAR(100),
    inspector_last_name                 VARCHAR(100),
    inspector_organisation_id           VARCHAR(20),
    inspector_unit                      VARCHAR(200),
    inspector_profession                VARCHAR(200),
    -- ── Sõidukijuht ─────────────────────────────────────────
    drivers                             JSONB           NOT NULL DEFAULT '[]',
    driver_not_applicable               BOOLEAN         NOT NULL DEFAULT false,
    -- ── Juhi kontrolli sisu ─────────────────────────────────
    transport_type                      VARCHAR(20),
    transport_empty_run                 BOOLEAN         NOT NULL DEFAULT false,
    transport_nature                    VARCHAR(30),
    transport_nature_exempt             BOOLEAN,
    transport_classes                   JSONB           NOT NULL DEFAULT '[]',
    cabotage_violations                 JSONB           NOT NULL DEFAULT '[]',
    result_type                         VARCHAR(30)     NOT NULL DEFAULT 'ok',
    additional_measure                  VARCHAR(50),
    proceeding_type                     VARCHAR(50)     NOT NULL DEFAULT 'none',
    proceeding_reference_number         VARCHAR(50),
    document_checks                     JSONB           NOT NULL DEFAULT '[]',
    other_documents                     JSONB           NOT NULL DEFAULT '[]',
    sp_applicability                    VARCHAR(30)     NOT NULL DEFAULT 'not_checked',
    tachograph_type_code                VARCHAR(20),
    tachograph_data_not_downloaded      BOOLEAN         NOT NULL DEFAULT false,
    checked_days_count                  INTEGER,
    work_days_count                     INTEGER,
    other_activity_days_count           INTEGER,
    violations_561_2006                 JSONB           NOT NULL DEFAULT '[]',
    violations_165_2014                 JSONB           NOT NULL DEFAULT '[]',
    violations_2002_15                  JSONB           NOT NULL DEFAULT '[]',
    violations_593_2008                 JSONB           NOT NULL DEFAULT '[]',
    violations_2020_1057                JSONB           NOT NULL DEFAULT '[]',
    erru_points                         JSONB           NOT NULL DEFAULT '[]',
    liini_number                        VARCHAR(100),
    liini_nimetus                       VARCHAR(255),
    files                               JSONB           NOT NULL DEFAULT '[]',
    notes                               TEXT,
    -- ── E-toimiku päring (X-tee, kirjutab ainult öine cron) ─
    enforcement_decision                TEXT,
    proceeding_closure_basis            TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                          VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_tram_control_card PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.tram_control_card IS 'INSERT-only snapshot of a Transpordiameti (TRAM) control card. Every save/confirm/publish/delete appends a complete new row. Current state = DISTINCT ON (tram_control_card_key) ORDER BY tram_control_card_key, created_at DESC. Single self-contained entity: replaces the compound_form(authority=TRAM) + sp_driver_form pair (ADR-001 → superseded by ADR-002).';
COMMENT ON COLUMN forms.tram_control_card.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.tram_control_card.tram_control_card_key IS 'Stable logical identity of the card (from forms.seq_tram_control_card_key). All snapshot rows of one card share this value. NOT unique.';
COMMENT ON COLUMN forms.tram_control_card.form_number IS 'Card number core, format tram-AAAA-NNNNN. Logically immutable across all snapshots; displayed joined with version as tram-AAAA-NNNNN/V — never stores the /V suffix itself.';
COMMENT ON COLUMN forms.tram_control_card.version IS 'Display version (the /V suffix). Starts at 1; bumped by 1 only when re-saving already-locked (confirmed/published) data or on publish.';
COMMENT ON COLUMN forms.tram_control_card.status IS 'Lifecycle status: saved, confirmed, published, deleted. deleted is a final soft-delete (hidden from search/view, kept for audit).';
COMMENT ON COLUMN forms.tram_control_card.drivers IS 'JSONB array of driver identities: [{"firstName","lastName","personalCodeEe","personalCodeForeign","citizenship","birthDate"}]. When driver_not_applicable is true this may be empty or carry only birthDate.';
COMMENT ON COLUMN forms.tram_control_card.driver_not_applicable IS 'Inspector checkbox "Ei ole asjakohane" — makes driver first/last name optional (validated at orchestration layer).';
COMMENT ON COLUMN forms.tram_control_card.proceeding_reference_number IS 'Menetluse viitenumber. Mandatory when proceeding_type <> none. Used by the nightly e-toimik decision sync to look up an entered-into-force decision.';
COMMENT ON COLUMN forms.tram_control_card.enforcement_decision IS 'Jõustunud otsus (entered-into-force decision point[s]). Read-only for users; written only by the nightly e-toimik decision sync, which also auto-publishes the card.';
COMMENT ON COLUMN forms.tram_control_card.proceeding_closure_basis IS 'Menetluse lõpetamise alus. Read-only for users; written only by the nightly e-toimik decision sync.';
COMMENT ON COLUMN forms.tram_control_card.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.tram_control_card.created_by IS 'Personal code (isikukood) of the actor, or a system identifier string (e.g. e-toimik). Loose audit reference; no FK.';

CREATE INDEX idx_tcc_key_ts             ON forms.tram_control_card (tram_control_card_key, created_at DESC);
CREATE INDEX idx_tcc_form_number        ON forms.tram_control_card (form_number);
CREATE INDEX idx_tcc_status             ON forms.tram_control_card (status);
CREATE INDEX idx_tcc_company_reg_code   ON forms.tram_control_card (company_reg_code);
CREATE INDEX idx_tcc_company_name       ON forms.tram_control_card (company_name);
CREATE INDEX idx_tcc_vehicle_reg_nr     ON forms.tram_control_card (vehicle_reg_nr);
CREATE INDEX idx_tcc_proceeding_ref     ON forms.tram_control_card (proceeding_reference_number);
CREATE INDEX idx_tcc_drivers_gin        ON forms.tram_control_card USING GIN (drivers);
CREATE INDEX idx_tcc_viol_561_gin       ON forms.tram_control_card USING GIN (violations_561_2006);
CREATE INDEX idx_tcc_viol_165_gin       ON forms.tram_control_card USING GIN (violations_165_2014);
CREATE INDEX idx_tcc_erru_gin           ON forms.tram_control_card USING GIN (erru_points);

ALTER TABLE forms.tram_control_card
    ADD CONSTRAINT chk_tcc_status CHECK (status IN ('saved', 'confirmed', 'published', 'deleted')),
    ADD CONSTRAINT chk_tcc_version_positive CHECK (version >= 1),
    ADD CONSTRAINT chk_tcc_kilometer_non_negative CHECK (kilometer IS NULL OR kilometer >= 0),
    ADD CONSTRAINT chk_tcc_vehicle_mileage_non_negative CHECK (vehicle_mileage IS NULL OR vehicle_mileage >= 0),
    ADD CONSTRAINT chk_tcc_control_date_not_future CHECK (control_date <= CURRENT_DATE);

-- NB: no unique index on (form_number, version). Repeat saves while status='saved'
-- legitimately reuse the same (form_number, version) pair (canonical "Koondvormi
-- elutsükkel" rule), and delete reuses the version it tombstones — same reason
-- labour_inspection_form and good_repute_form carry no such index.
