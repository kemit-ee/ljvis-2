-- liquibase formatted sql
-- changeset ljvis:20260703100000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;
-- 1. foreign_violation_form
CREATE SEQUENCE forms.seq_foreign_violation_form_key START 1;

CREATE TABLE forms.foreign_violation_form (
    -- ── Identity & lifecycle ────────────────────────────────────────
                                               id                                  BIGSERIAL       NOT NULL,
                                               foreign_violation_form_key          BIGINT          NOT NULL,
                                               form_number                         VARCHAR(30)     NOT NULL,
                                               template_version                    INTEGER         NOT NULL,
                                               status                              VARCHAR(50)     NOT NULL,
    -- ── Creation provenance ──────────────────────────────────────
                                               erru_message_id                     VARCHAR(100),
                                               source_police_form_key              BIGINT,
    -- ── Data entry date ─────────────────────────────────────────
                                               data_entry_date                     DATE            NOT NULL,
    -- ── Inspector block (andmete sisestaja) ─────────────────────
                                               inspector_first_name                VARCHAR(100)    NOT NULL,
                                               inspector_last_name                 VARCHAR(100)    NOT NULL,
                                               inspector_organisation_id           VARCHAR(20)     NOT NULL,
                                               inspector_unit                      VARCHAR(100)    NOT NULL,
                                               inspector_profession                VARCHAR(150)    NOT NULL,
    -- ── Reporting country & authority ────────────────────────────
                                               reporting_country_code              VARCHAR(3)      NOT NULL,
                                               reporting_authority_name             VARCHAR(600)    NOT NULL,
    -- ── Inspection date/time/location ────────────────────────────
                                               inspection_date                     DATE            NOT NULL,
                                               inspection_time                     TIME,
                                               inspection_address_line1            VARCHAR(300),
                                               inspection_address_line2            VARCHAR(300),
                                               inspection_city                     VARCHAR(100),
                                               inspection_region                   VARCHAR(100),
                                               inspection_country_code             VARCHAR(3),
    -- ── Vehicle block ────────────────────────────────────────────
                                               vehicle_reg_nr                      VARCHAR(20),
                                               vehicle_country_code                VARCHAR(3),
                                               vehicle_make                        VARCHAR(100),
                                               vehicle_model                       VARCHAR(100),
                                               vehicle_vin                         VARCHAR(17),
                                               vehicle_first_registration          DATE,
                                               vehicle_body_type                   VARCHAR(50),
    -- ── Company block (vedaja) ──────────────────────────────────
                                               company_reg_code                    VARCHAR(20),
                                               company_name                        VARCHAR(300),
                                               company_country_code                VARCHAR(3),
                                               company_address_line1               VARCHAR(300),
                                               company_address_line2               VARCHAR(300),
                                               company_city                        VARCHAR(100),
                                               company_region                      VARCHAR(100),
                                               company_postal_code                 VARCHAR(20),
    -- ── Driver ──────────────────────────────────────────────────
                                               driver_first_name                   VARCHAR(100),
                                               driver_last_name                    VARCHAR(100),
    -- ── Community licence ───────────────────────────────────────
                                               licence_copy_number                 VARCHAR(100),
    -- ── Violation description & counts ──────────────────────────
                                               violation_description               TEXT,
                                               minor_violations_count              INTEGER,
    -- ── Sanction ────────────────────────────────────────────────
                                               sanction_code                       VARCHAR(50)     NOT NULL DEFAULT 'KORRAS',
                                               sanction_notes                      TEXT,
    -- ── Violations (EU 1071/2009) ───────────────────────────────
                                               violations                          JSONB           NOT NULL DEFAULT '[]',
    -- ── Recommended measures ────────────────────────────────────
                                               recommended_measure_code            VARCHAR(50)     NOT NULL DEFAULT 'PUUDUVAD',
                                               recommended_measure_notes           TEXT,
    -- ── Notes ───────────────────────────────────────────────────
                                               notes                               TEXT,
    -- ── Files ───────────────────────────────────────────────────
                                               files                               JSONB           NOT NULL DEFAULT '[]',
    -- ── Audit ───────────────────────────────────────────────────
                                               created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                               created_by                          VARCHAR(100)    NOT NULL DEFAULT 'system',
                                               CONSTRAINT pk_foreign_violation_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.foreign_violation_form IS 'INSERT-only snapshot of the foreign violation form (välisriigi rikkumise andmevorm). Standalone form — no compound_form parent. Created from ERRU NCR message (erru_message_id), existing police form (source_police_form_key), or manually. Current state = DISTINCT ON (foreign_violation_form_key) ORDER BY foreign_violation_form_key, created_at DESC.';
COMMENT ON COLUMN forms.foreign_violation_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.foreign_violation_form.foreign_violation_form_key IS 'Stable logical identity (from ljvis2.seq_foreign_violation_form_key). All snapshot rows of one form share this value. NOT unique.';
COMMENT ON COLUMN forms.foreign_violation_form.form_number IS 'Form number, format vr-AAAA-NNNNN. Logically immutable; uniqueness enforced at orchestration layer.';
COMMENT ON COLUMN forms.foreign_violation_form.template_version IS 'Form template version; immutable, carried forward on every snapshot.';
COMMENT ON COLUMN forms.foreign_violation_form.status IS 'Lifecycle status: saved, confirmed, published. See §6.';
COMMENT ON COLUMN forms.foreign_violation_form.erru_message_id IS 'Reference to the originating ERRU inbound message (Mode 1 creation). Immutable after creation. Loose text reference — ERRU message table owned by ERRU module (cross-epic).';
COMMENT ON COLUMN forms.foreign_violation_form.source_police_form_key IS 'Reference to the police control form this was created from (Mode 2 creation). Immutable after creation. Bare BIGINT; loose reference to compound_form_key. NULL for ERRU and manual creation.';
COMMENT ON COLUMN forms.foreign_violation_form.data_entry_date IS 'Andmete sisestamise kuupäev; defaults to today, editable.';
COMMENT ON COLUMN forms.foreign_violation_form.inspector_first_name IS 'Data-entry officer first name; prefilled from user profile, read-only.';
COMMENT ON COLUMN forms.foreign_violation_form.inspector_last_name IS 'Data-entry officer last name; prefilled from user profile, read-only.';
COMMENT ON COLUMN forms.foreign_violation_form.inspector_organisation_id IS 'Data-entry officer organisation; references Organisation classifier (EPIC_04).';
COMMENT ON COLUMN forms.foreign_violation_form.inspector_unit IS 'Data-entry officer structural unit.';
COMMENT ON COLUMN forms.foreign_violation_form.inspector_profession IS 'Data-entry officer profession/title.';
COMMENT ON COLUMN forms.foreign_violation_form.reporting_country_code IS 'Teate saatnud riik; classifier countries, excludes Estonia. Value code of country classifier (EPIC_04).';
COMMENT ON COLUMN forms.foreign_violation_form.reporting_authority_name IS 'Teate saatnud pädeva asutuse nimetus; max 600 chars.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_date IS 'Kontrolli kuupäev; cannot be in the future.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_time IS 'Kontrolli kellaaeg (HH:MM); optional.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_address_line1 IS 'Asula / Tänav / Maja nr.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_address_line2 IS 'Maantee / Parkla.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_city IS 'Linn / Vald.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_region IS 'Maakond.';
COMMENT ON COLUMN forms.foreign_violation_form.inspection_country_code IS 'Inspection country; value code of country classifier (EPIC_04).';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_reg_nr IS 'Vehicle registration number; X-tee Liiklusregister lookup available.';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_country_code IS 'Vehicle country code (EPIC_04).';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_make IS 'Vehicle make; auto-filled from X-tee for EE vehicles.';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_model IS 'Vehicle model; auto-filled from X-tee for EE vehicles.';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_vin IS 'Vehicle identification number; max 17 chars, format validated FE-only.';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_first_registration IS 'Vehicle first registration date; auto-filled from X-tee.';
COMMENT ON COLUMN forms.foreign_violation_form.vehicle_body_type IS 'Vehicle body type (keretüüp); auto-filled from X-tee.';
COMMENT ON COLUMN forms.foreign_violation_form.company_reg_code IS 'Carrier registry code; X-tee Äriregister lookup available for Estonian codes.';
COMMENT ON COLUMN forms.foreign_violation_form.company_name IS 'Carrier name; auto-filled from X-tee for EE companies.';
COMMENT ON COLUMN forms.foreign_violation_form.company_country_code IS 'Carrier country (EPIC_04).';
COMMENT ON COLUMN forms.foreign_violation_form.company_address_line1 IS 'Carrier address line 1.';
COMMENT ON COLUMN forms.foreign_violation_form.company_address_line2 IS 'Carrier address line 2.';
COMMENT ON COLUMN forms.foreign_violation_form.company_city IS 'Carrier city.';
COMMENT ON COLUMN forms.foreign_violation_form.company_region IS 'Carrier region.';
COMMENT ON COLUMN forms.foreign_violation_form.company_postal_code IS 'Carrier postal code.';
COMMENT ON COLUMN forms.foreign_violation_form.driver_first_name IS 'Driver first name.';
COMMENT ON COLUMN forms.foreign_violation_form.driver_last_name IS 'Driver last name.';
COMMENT ON COLUMN forms.foreign_violation_form.licence_copy_number IS 'Ühenduse tegevusloa kinnitatud ärakirja number; X-tee MTR lookup available for EE carriers.';
COMMENT ON COLUMN forms.foreign_violation_form.violation_description IS 'Rikkumise kirjeldus — free-text violation description.';
COMMENT ON COLUMN forms.foreign_violation_form.minor_violations_count IS 'Kontrolli käigus avastatud kergemate rikkumiste arv.';
COMMENT ON COLUMN forms.foreign_violation_form.sanction_code IS 'Rakendatud sanktsioon; classifier sanctions. Default KORRAS.';
COMMENT ON COLUMN forms.foreign_violation_form.sanction_notes IS 'Sanktsiooni märkused; shown when sanction is not KORRAS.';
COMMENT ON COLUMN forms.foreign_violation_form.violations IS 'JSONB plain string array of detected EU 1071/2009 violation codes: ["MSI101", "VSI800"]. Front-end groups by severity using classifier. Three checkbox groups: MSI, VSI, SI.';
COMMENT ON COLUMN forms.foreign_violation_form.recommended_measure_code IS 'Teise riigi soovitatud meetmed; classifier recommended-measures. Default PUUDUVAD.';
COMMENT ON COLUMN forms.foreign_violation_form.recommended_measure_notes IS 'Soovitatud meetme täpsustus; mandatory when code = MUU.';
COMMENT ON COLUMN forms.foreign_violation_form.notes IS 'Free-text notes (märkused).';
COMMENT ON COLUMN forms.foreign_violation_form.files IS 'JSONB array of file metadata: [{file_name, content_type, file_size_bytes, storage_key, uploaded_at, uploaded_by}]. Binaries in S3.';
COMMENT ON COLUMN forms.foreign_violation_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.foreign_violation_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_fvf_key_ts         ON forms.foreign_violation_form (foreign_violation_form_key, created_at DESC);
CREATE INDEX idx_fvf_status         ON forms.foreign_violation_form (status);
CREATE INDEX idx_fvf_erru_msg       ON forms.foreign_violation_form (erru_message_id);
CREATE INDEX idx_fvf_company_reg    ON forms.foreign_violation_form (company_reg_code);
CREATE INDEX idx_fvf_vehicle_reg    ON forms.foreign_violation_form (vehicle_reg_nr);
CREATE INDEX idx_fvf_violations_gin ON forms.foreign_violation_form USING GIN (violations);
