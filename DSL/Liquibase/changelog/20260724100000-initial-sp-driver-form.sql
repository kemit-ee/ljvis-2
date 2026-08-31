-- liquibase formatted sql
-- changeset ljvis:20260724100000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;

-- 1. sp_driver_form (INSERT-only snapshot — one row per case state)
CREATE TABLE forms.sp_driver_form (
    -- ── Identity & lifecycle ────────────────────────────────
                                       id                                  BIGSERIAL       NOT NULL,
                                       sp_driver_form_key                  BIGINT          NOT NULL,
                                       compound_form_key                   BIGINT          NOT NULL,
                                       sub_form_number                     VARCHAR(30)     NOT NULL,
                                       template_version                    INTEGER         NOT NULL,
                                       status                              VARCHAR(50)     NOT NULL,
                                       selection_status                    VARCHAR(20)     NOT NULL DEFAULT 'active',
    -- ── Transport type (Veoliik) ───────────────────────────
                                       transport_type                      VARCHAR(20)     NOT NULL,
                                       transport_empty_run                 BOOLEAN         NOT NULL DEFAULT false,
                                       transport_nature                    VARCHAR(30),
                                       transport_nature_exempt             BOOLEAN,
                                       transport_classes                   JSONB           NOT NULL DEFAULT '[]',
                                       cabotage_violations                 JSONB           NOT NULL DEFAULT '[]',
    -- ── Control result (Kontrolli tulemus) ─────────────────
                                       result_type                         VARCHAR(30)     NOT NULL DEFAULT 'ok',
                                       proceeding_type                     VARCHAR(50)     NOT NULL DEFAULT 'none',
                                       proceeding_reference_number         VARCHAR(50),
    -- ── Document / right check (Dokumendi või õiguse kontroll) ──
                                       document_checks                     JSONB           NOT NULL DEFAULT '[]',
    -- ── Other documents (Muud dokumendid) ──────────────────
                                       other_documents                     JSONB           NOT NULL DEFAULT '[]',
    -- ── SP applicability (Sõidu- ja puhkeaja nõuete täitmine) ──
                                       sp_applicability                    VARCHAR(30),
                                       tachograph_type_code                VARCHAR(20),
                                       tachograph_data_not_downloaded      BOOLEAN         NOT NULL DEFAULT false,
                                       checked_days_count                  INTEGER,
                                       work_days_count                     INTEGER,
                                       other_activity_days_count           INTEGER,
    -- ── Violations by EU regulation ────────────────────────
                                       violations_561_2006                 JSONB           NOT NULL DEFAULT '[]',
                                       violations_165_2014                 JSONB           NOT NULL DEFAULT '[]',
                                       violations_2002_15                  JSONB           NOT NULL DEFAULT '[]',
                                       violations_593_2008                 JSONB           NOT NULL DEFAULT '[]',
                                       violations_2020_1057                JSONB           NOT NULL DEFAULT '[]',
    -- ── Mass/dimension & ATP ───────────────────────────────
                                       mass_dimension_non_compliant        BOOLEAN         NOT NULL DEFAULT false,
                                       mass_dimension_measurements         JSONB           NOT NULL DEFAULT '[]',
                                       atp_violation_found                 BOOLEAN         NOT NULL DEFAULT false,
                                       atp_violation_description           TEXT,
    -- ── ERRU points ────────────────────────────────────────
                                       erru_points                         JSONB           NOT NULL DEFAULT '[]',
    -- ── Files ──────────────────────────────────────────────
                                       files                               JSONB           NOT NULL DEFAULT '[]',
    -- ── X-road fields ──────────────────────────────────────
                                       enforcement_decision                TEXT,
                                       proceeding_closure_basis            TEXT,
    -- ── Notes ──────────────────────────────────────────────
                                       notes                               TEXT,
    -- ── Audit ───────────────────────────────────────────────
                                       created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                       created_by                          VARCHAR(100)    NOT NULL DEFAULT 'system',
                                       CONSTRAINT pk_sp_driver_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.sp_driver_form IS 'INSERT-only snapshot of the driver SP sub-form (autojuhi sõidu- ja puhkeaja kontrollkaart). Current state = DISTINCT ON (sp_driver_form_key) ORDER BY sp_driver_form_key, created_at DESC. Lifecycle is independent of compound_form. At most one active sp_driver_form per compound_form_key (enforced at orchestration layer).';
COMMENT ON COLUMN forms.sp_driver_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.sp_driver_form.sp_driver_form_key IS 'Stable logical identity (from ljvis2.seq_sp_driver_form_key). All snapshot rows of one driver SP sub-form share this value. NOT unique.';
COMMENT ON COLUMN forms.sp_driver_form.compound_form_key IS 'Logical key of the parent control case. Bare BIGINT; no enforceable FK across snapshot tables.';
COMMENT ON COLUMN forms.sp_driver_form.sub_form_number IS 'SP sub-form number, format sp-AAAA-NNNNN. Logically immutable; uniqueness enforced at orchestration layer.';
COMMENT ON COLUMN forms.sp_driver_form.template_version IS 'SP form-template version. Immutable; carried forward on every snapshot.';
COMMENT ON COLUMN forms.sp_driver_form.status IS 'Lifecycle status: saved, confirmed, published. Independent of compound_form.status. Case deletion (deleted) is recorded at the compound level only — sub-form rows are not written on delete. See §6.';
COMMENT ON COLUMN forms.sp_driver_form.selection_status IS 'Whether this sub-form is active or removed (deselected by inspector). Values: active, removed. Default active.';
COMMENT ON COLUMN forms.sp_driver_form.transport_type IS 'Veo põhiliik radio: passenger (sõitjatevedu) or goods (veosevedu). Exactly one must be selected.';
COMMENT ON COLUMN forms.sp_driver_form.transport_empty_run IS 'Empty run checkbox (tühisõit).';
COMMENT ON COLUMN forms.sp_driver_form.transport_nature IS 'Veo laad radio: paid (tasuline) or own_account (omal kulul). Nullable.';
COMMENT ON COLUMN forms.sp_driver_form.transport_nature_exempt IS 'Nature of transport: exempt — tegevusloa nõudest vabastatud vedu. Checkbox.';
COMMENT ON COLUMN forms.sp_driver_form.transport_classes IS 'JSONB array of transport class classifier codes: [{"class_code":...,"class_name":...}]. Selected from classifier via searchable dropdown. Removable after adding.';
COMMENT ON COLUMN forms.sp_driver_form.cabotage_violations IS 'JSONB array of cabotage violations: [{"violation_code":...,"severity_code":...}]. Shown only when transport_classes includes cabotage-triggering value. Value codes from classifier (EPIC_04).';
COMMENT ON COLUMN forms.sp_driver_form.result_type IS 'Kontrolli tulemus radio: ok, warning, precept, driving_ban, transport_interruption, arrest, misdemeanor_proceedings. Default ok.';
COMMENT ON COLUMN forms.sp_driver_form.proceeding_type IS 'Menetlus radio: none (menetlust ei alustatud), summary (lühimenetlus), expedited (kiirmenetlus), general (üldmenetlus). Default none.';
COMMENT ON COLUMN forms.sp_driver_form.proceeding_reference_number IS 'Menetluse viitenumber. Mandatory when proceeding_type != none.';
COMMENT ON COLUMN forms.sp_driver_form.document_checks IS 'JSONB array: [{"document_code":...,"document_name":...,"severity_code":"MSI"|"VSI"|"SI"|"MI","violation_code":...}]. Values from DOC_RIGHT_CHECK classifier (EPIC_04). Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.other_documents IS 'JSONB array: [{"document_code":...,"document_name":...,"result":...,"notes":...}]. Values from classifier (EPIC_04). Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.sp_applicability IS 'Sõidu- ja puhkeaja nõuete rakendamine: applied (rakendatakse), not_applied (ei rakendata), not_checked (ei kontrollitud). Controls tachograph and violation sections visibility.';
COMMENT ON COLUMN forms.sp_driver_form.tachograph_type_code IS 'Sõidumeerik type: analogue, digital, smart_1, smart_2, missing. Value code of tachograph-type classifier (EPIC_04). Shown only when sp_applicability = applied.';
COMMENT ON COLUMN forms.sp_driver_form.tachograph_data_not_downloaded IS 'Tachograph/driver card data not downloaded (PPA proposal 3.4). Triggers e-notification to TI on publish.';
COMMENT ON COLUMN forms.sp_driver_form.checked_days_count IS 'Kontrollitud päevade arv. Digits only.';
COMMENT ON COLUMN forms.sp_driver_form.work_days_count IS 'Nendest tööpäevi. Digits only.';
COMMENT ON COLUMN forms.sp_driver_form.other_activity_days_count IS 'Nendest päevade arv juhi muu tegevuse kohta. Digits only.';
COMMENT ON COLUMN forms.sp_driver_form.violations_561_2006 IS 'JSONB array: EÜ 561/2006 (sõidu- ja puhkeaeg) violations [{violation_code, severity_code, is_detected}]. Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.violations_165_2014 IS 'JSONB array: EL 165/2014 (sõidumeerik) violations [{violation_code, severity_code, is_detected}]. Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.violations_2002_15 IS 'JSONB array: 2002/15/EÜ (tööaja eeskirjad) violations [{violation_code, severity_code, is_detected}]. Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.violations_593_2008 IS 'JSONB array: EÜ 593/2008 (Rooma I) violations [{violation_code, severity_code, is_detected}]. Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.violations_2020_1057 IS 'JSONB array: EL 2020/1057 (autojuhi lähetamine) violations [{violation_code, severity_code, is_detected}]. Shown only when result != ok.';
COMMENT ON COLUMN forms.sp_driver_form.mass_dimension_non_compliant IS 'Mass ja/või mõõtmed ei vasta nõuetele — explicit flag. When true, measurements table is shown.';
COMMENT ON COLUMN forms.sp_driver_form.mass_dimension_measurements IS 'JSONB array: [{"measurement_type":"mass"|"axle_load"|"width"|"height"|"length","axle_number":...,"actual_value":...,"allowed_value":...,"excess_value":...}]. Shown only when mass_dimension_non_compliant = true.';
COMMENT ON COLUMN forms.sp_driver_form.atp_violation_found IS 'ATP kokkuleppe nõuetele vastavusel tuvastatud rikkumine (Jah/Ei radio). When true, description field is shown.';
COMMENT ON COLUMN forms.sp_driver_form.atp_violation_description IS 'ATP violation free-text description (märkus). Shown only when atp_violation_found = true.';
COMMENT ON COLUMN forms.sp_driver_form.erru_points IS 'JSONB array: [{"erru_code":...,"severity_category":"MSI"|"VSI"|"SI","source_type":"auto_from_violation"|"manual"}]. Auto-generated from violations or manually added.';
COMMENT ON COLUMN forms.sp_driver_form.files IS 'JSONB array of file metadata: [{"file_name":...,"content_type":...,"file_size_bytes":...,"storage_key":...,"uploaded_at":...,"uploaded_by":...}]. Sub-form-level attachments.';
COMMENT ON COLUMN forms.sp_driver_form.enforcement_decision IS 'Jõustunud otsus — populated from e-toimik X-road query result.';
COMMENT ON COLUMN forms.sp_driver_form.proceeding_closure_basis IS 'Menetluse lõpetamise alus — populated from e-toimik X-road query result.';
COMMENT ON COLUMN forms.sp_driver_form.notes IS 'SP form free-text notes (märkused).';
COMMENT ON COLUMN forms.sp_driver_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.sp_driver_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_spd_key_ts         ON forms.sp_driver_form (sp_driver_form_key, created_at DESC);
CREATE INDEX idx_spd_case_key       ON forms.sp_driver_form (compound_form_key);
CREATE INDEX idx_spd_status         ON forms.sp_driver_form (status);
CREATE INDEX idx_spd_selection      ON forms.sp_driver_form (selection_status);
CREATE INDEX idx_spd_viol_561_gin   ON forms.sp_driver_form USING GIN (violations_561_2006);
CREATE INDEX idx_spd_viol_165_gin   ON forms.sp_driver_form USING GIN (violations_165_2014);
CREATE INDEX idx_spd_erru_gin       ON forms.sp_driver_form USING GIN (erru_points);