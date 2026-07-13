-- liquibase formatted sql
-- changeset ljvis:20260713100000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;
-- 1. compound_form
CREATE SEQUENCE forms.seq_compound_form_key START 1;
CREATE SEQUENCE forms.seq_sp_driver_form_key START 1;
CREATE SEQUENCE forms.seq_sp_teammate_form_key START 1;
CREATE SEQUENCE forms.seq_administrative_proceeding_key START 1;

-- 1. compound_form (INSERT-only snapshot — one row per case state)
CREATE TABLE forms.compound_form (
    -- ── Identity & lifecycle ────────────────────────────────
                                      id                                  BIGSERIAL       NOT NULL,
                                      compound_form_key                   BIGINT          NOT NULL,
                                      form_number                         VARCHAR(30)     NOT NULL,
                                      control_year                        INTEGER         NOT NULL,
                                      template_version                    INTEGER         NOT NULL,
                                      status                              VARCHAR(50)     NOT NULL,
    -- ── General section (üldosa) ────────────────────────────
                                      control_date                        DATE            NOT NULL,
                                      control_time                        TIME            NOT NULL,
                                      control_country_code                VARCHAR(3)      NOT NULL,
                                      county                              VARCHAR(100),
                                      city                                VARCHAR(50),
                                      road                                VARCHAR(200),
                                      road_other                          VARCHAR(200),
                                      kilometer                           SMALLINT,
                                      address                             VARCHAR(300),
                                      road_type                           VARCHAR(50),
                                      general_notes                       TEXT,
    -- ── Road usage tax (teekasutustasu) ────────────────────
                                      road_tax_status                     VARCHAR(30),
                                      road_tax_notes                      TEXT,
    -- ── Inspector block (ametiisik) ───────────────────────
                                      inspector_first_name                VARCHAR(100)    NOT NULL,
                                      inspector_last_name                 VARCHAR(100)    NOT NULL,
                                      inspector_organisation_id           VARCHAR(20)     NOT NULL,
                                      inspector_unit                      VARCHAR(100)    NOT NULL,
                                      inspector_profession                VARCHAR(150)    NOT NULL,
    -- ── Vehicle block (mootorsõiduk) ────────────────────────
                                      vehicle_reg_nr                      VARCHAR(20),
                                      vehicle_country_code                VARCHAR(3),
                                      vehicle_make                        VARCHAR(100),
                                      vehicle_model                       VARCHAR(100),
                                      vehicle_vin                         VARCHAR(17),
                                      vehicle_first_registration          DATE,
                                      vehicle_body_type                   VARCHAR(50),
                                      vehicle_category_code               VARCHAR(20),
                                      vehicle_category_other              VARCHAR(100),
                                      vehicle_mileage                     INTEGER,
    -- ── Trailer block (haagis) ──────────────────────────────
                                      trailers                            JSONB           NOT NULL DEFAULT '[]',
    -- ── Company block (vedaja) ──────────────────────────────
                                      company_reg_code                    VARCHAR(20),
                                      company_name                        VARCHAR(300),
                                      company_country_code                VARCHAR(3),
                                      company_county                      VARCHAR(100),
                                      company_city                        VARCHAR(50),
                                      company_address                     VARCHAR(300),
                                      company_postal_code                 VARCHAR(20),
                                      company_owner_first_name            VARCHAR(100),
                                      company_owner_last_name             VARCHAR(100),
                                      company_activity_licence_copy_number VARCHAR(100),
    -- ── JSONB embedded collections ──────────────────────────
    -- NOTE: highest_severity, sub_form_types, driver_personal_code,
    -- driver_name are NOT stored — computed at read time. See §4
    -- Computed fields.
                                      drivers                             JSONB           NOT NULL DEFAULT '[]',
                                      files                               JSONB           NOT NULL DEFAULT '[]',
                                      extra_data                          JSONB,
    -- ── Audit ───────────────────────────────────────────────
                                      created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                      created_by                          VARCHAR(100)    NOT NULL DEFAULT 'system',
                                      CONSTRAINT pk_compound_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.compound_form IS 'INSERT-only snapshot of a control case (koondvorm). Every compound-form-level change appends a complete new row. Current state = DISTINCT ON (compound_form_key) ORDER BY compound_form_key, created_at DESC. Sub-form data lives in separate per-type snapshot tables. Replaces v1 compound_form + all _state + driver_block_state + control_result_state + control_file + control_form_latest tables.';
COMMENT ON COLUMN forms.compound_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.compound_form.compound_form_key IS 'Stable logical identity of the control case (from ljvis2.seq_compound_form_key). All snapshot rows of one case share this value. NOT unique.';
COMMENT ON COLUMN forms.compound_form.form_number IS 'Compound-form number, format koond-AAAA-NNNNN. Logically immutable across snapshots; uniqueness enforced at orchestration layer.';
COMMENT ON COLUMN forms.compound_form.control_year IS 'Year used in form_number generation (AAAA segment). Immutable; carried forward on every snapshot.';
COMMENT ON COLUMN forms.compound_form.template_version IS 'Legal form-template version in force at creation. Immutable; carried forward on every snapshot.';
COMMENT ON COLUMN forms.compound_form.status IS 'Lifecycle status: saved, confirmed, published, deleted. deleted is a final, irreversible admin soft-delete (control_form.delete) of the whole case; deleted rows are hidden from all searches/views and retained for audit only. Independent of sub-form status. See §6.';
COMMENT ON COLUMN forms.compound_form.control_date IS 'Date of control; must not be in the future (validated FE and backend).';
COMMENT ON COLUMN forms.compound_form.control_time IS 'Time of control, format HH:MM (stored as TIME).';
COMMENT ON COLUMN forms.compound_form.control_country_code IS 'ISO country code of control location; default EE. Value code of country classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.county IS 'County (maakond) of control location; dropdown from county classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.city IS 'City or rural municipality (linn/vald) of control location; free text, max 50 characters.';
COMMENT ON COLUMN forms.compound_form.road IS 'Road (maantee) free text; used with kilometer.';
COMMENT ON COLUMN forms.compound_form.road_other IS 'Free-text road name (muu tee); populated only when road = MUU TEE.';
COMMENT ON COLUMN forms.compound_form.kilometer IS 'Kilometer marker on the road; whole number, max 3 digits (0–999). Used together with road.';
COMMENT ON COLUMN forms.compound_form.address IS 'ADS address when address variant is used (mutually exclusive with road+kilometer).';
COMMENT ON COLUMN forms.compound_form.road_type IS 'Road type (tee liik), auto-filled from the chosen location variant; not mandatory.';
COMMENT ON COLUMN forms.compound_form.inspector_first_name IS 'Inspector first name (eesnimi); prefilled from user profile.';
COMMENT ON COLUMN forms.compound_form.inspector_last_name IS 'Inspector last name (perenimi); prefilled from user profile.';
COMMENT ON COLUMN forms.compound_form.inspector_organisation_id IS 'Inspector organisation identifier (asutus); prefilled from user profile. References Organisation classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.inspector_unit IS 'Inspector structural unit (struktuuriüksus); prefilled from user profile.';
COMMENT ON COLUMN forms.compound_form.inspector_profession IS 'Inspector profession/title (ametinimetus); prefilled from user profile.';
COMMENT ON COLUMN forms.compound_form.general_notes IS 'General-section free-text notes (üldosa märkused).';
COMMENT ON COLUMN forms.compound_form.road_tax_status IS 'Road usage tax status (veoauto teekasutustasu): not_applicable (ei kohaldu, default), unpaid (tasumata), underpaid (tasutud väiksemas määras). NULL treated as not_applicable.';
COMMENT ON COLUMN forms.compound_form.road_tax_notes IS 'Road usage tax free-text note (märkus).';
COMMENT ON COLUMN forms.compound_form.vehicle_reg_nr IS 'Motor vehicle registration number (registreerimismärk); leaving the field triggers X-road query. Stored trimmed.';
COMMENT ON COLUMN forms.compound_form.vehicle_country_code IS 'Vehicle country code (riigi tunnusmärk); auto for EE vehicles, manual for foreign. Value code of country classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.vehicle_make IS 'Vehicle make; prefilled from X-road, editable.';
COMMENT ON COLUMN forms.compound_form.vehicle_model IS 'Vehicle commercial name/model; prefilled from X-road, editable.';
COMMENT ON COLUMN forms.compound_form.vehicle_vin IS 'Vehicle identification number; 17 characters (format validated FE-only); prefilled from X-road.';
COMMENT ON COLUMN forms.compound_form.vehicle_first_registration IS 'Date of first registration; prefilled from X-road.';
COMMENT ON COLUMN forms.compound_form.vehicle_body_type IS 'Vehicle body type (keretüüp); free text, max 50 characters.';
COMMENT ON COLUMN forms.compound_form.vehicle_category_code IS 'Vehicle category (e.g. N2, N3, M2, M3, O3, O4, T-series, muu). Value code of vehicle-category classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.vehicle_category_other IS 'Free-text category specification; populated only when vehicle_category_code = muu.';
COMMENT ON COLUMN forms.compound_form.vehicle_mileage IS 'Odometer reading (läbisõidumõõdiku näit) in km; digits only.';
COMMENT ON COLUMN forms.compound_form.trailers IS 'JSONB array of trailer data: [{"trailer_index":1,"reg_nr":...,"country_code":...,"make":...,"model":...,"vin":...,"first_registration":...,"body_type":...,"category_code":...,"category_other":...}]. Max 3 entries. trailer_index (1–3) discriminates trailers.';
COMMENT ON COLUMN forms.compound_form.company_reg_code IS 'Carrier registry code (registrikood); Estonian = 8 digits, triggers Business Register X-road query.';
COMMENT ON COLUMN forms.compound_form.company_name IS 'Carrier name; prefilled from Business Register, editable.';
COMMENT ON COLUMN forms.compound_form.company_country_code IS 'Carrier country; auto for EE companies. Value code of country classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.company_county IS 'Carrier county (maakond); dropdown from county classifier (EPIC_04).';
COMMENT ON COLUMN forms.compound_form.company_city IS 'Carrier city or rural municipality (linn/vald); free text, max 50 characters.';
COMMENT ON COLUMN forms.compound_form.company_address IS 'Street, house and apartment number/farm name of carrier address.';
COMMENT ON COLUMN forms.compound_form.company_postal_code IS 'Carrier postal code (sihtnumber).';
COMMENT ON COLUMN forms.compound_form.company_owner_first_name IS 'Vehicle owner first name (sõiduki omaniku eesnimi); used when owner is a natural person, not a company.';
COMMENT ON COLUMN forms.compound_form.company_owner_last_name IS 'Vehicle owner last name (sõiduki omaniku perenimi); used when owner is a natural person, not a company.';
COMMENT ON COLUMN forms.compound_form.company_activity_licence_copy_number IS 'Community licence certified-copy number; queried from MTR by business reg code, manual for foreign carriers.';
COMMENT ON COLUMN forms.compound_form.drivers IS 'JSONB array of driver data: [{"driver_role":"primary"|"second","personal_code_ee":...,"personal_code_foreign":...,"first_name":...,"last_name":...,"citizenship_code":...,"birth_date":...}]. Max 2 entries. driverPersonalCode and driverName are NOT stored columns — computed at read time from this array.';
COMMENT ON COLUMN forms.compound_form.files IS 'JSONB array of file metadata: [{"file_name":...,"content_type":...,"file_size_bytes":...,"storage_key":...,"uploaded_at":...,"uploaded_by":...}]. Binaries in external storage. Full array re-copied on every compound_form snapshot.';
COMMENT ON COLUMN forms.compound_form.extra_data IS 'JSONB escape hatch for version-specific or legacy fields. On migrated rows stores unmapped LJVIS-1 EAV fields and MetaData blob. NULL when not needed.';
COMMENT ON COLUMN forms.compound_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.compound_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_cf_key_ts                    ON forms.compound_form (compound_form_key, created_at DESC);
CREATE INDEX idx_cf_form_number               ON forms.compound_form (form_number);
CREATE INDEX idx_cf_control_date              ON forms.compound_form (control_date);
CREATE INDEX idx_cf_county                    ON forms.compound_form (county);
CREATE INDEX idx_cf_status                    ON forms.compound_form (status);
CREATE INDEX idx_cf_vehicle_reg_nr            ON forms.compound_form (vehicle_reg_nr);
CREATE INDEX idx_cf_vehicle_vin               ON forms.compound_form (vehicle_vin);
CREATE INDEX idx_cf_trailers_gin              ON forms.compound_form USING GIN (trailers);
CREATE INDEX idx_cf_company_reg_code          ON forms.compound_form (company_reg_code);
CREATE INDEX idx_cf_company_name              ON forms.compound_form (company_name);
CREATE INDEX idx_cf_drivers_gin               ON forms.compound_form USING GIN (drivers);
CREATE INDEX idx_cf_files_gin                 ON forms.compound_form USING GIN (files);