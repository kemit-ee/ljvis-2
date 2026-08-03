-- liquibase formatted sql
-- changeset ljvis:20260724200000 ignore:true
CREATE SCHEMA IF NOT EXISTS forms;

-- 1. sp_teammate_form (INSERT-only snapshot — one row per case state)
CREATE TABLE forms.sp_teammate_form (
    -- ── Identity & lifecycle ────────────────────────────────
                                         id                                  BIGSERIAL       NOT NULL,
                                         sp_teammate_form_key                BIGINT          NOT NULL,
                                         compound_form_key                   BIGINT          NOT NULL,
                                         sub_form_number                     VARCHAR(30)     NOT NULL,
                                         template_version                    INTEGER         NOT NULL,
                                         status                              VARCHAR(50)     NOT NULL,
                                         selection_status                    VARCHAR(20)     NOT NULL DEFAULT 'active',
    -- ── Transport type (Veoliik) ───────────────────────────
                                         transport_type                      VARCHAR(20)     NOT NULL,
                                         transport_empty_run                 BOOLEAN         NOT NULL DEFAULT false,
                                         transport_nature                    VARCHAR(20),
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
                                         CONSTRAINT pk_sp_teammate_form PRIMARY KEY (id)
);

COMMENT ON TABLE  forms.sp_teammate_form IS 'INSERT-only snapshot of the teammate SP sub-form (meeskonnaliikme sõidu- ja puhkeaja kontrollkaart). Identical schema to sp_driver_form. Transport type data auto-inherited from sp_driver_form at application layer. Current state = DISTINCT ON (sp_teammate_form_key) ORDER BY sp_teammate_form_key, created_at DESC. At most one active sp_teammate_form per compound_form_key (enforced at orchestration layer).';
COMMENT ON COLUMN forms.sp_teammate_form.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN forms.sp_teammate_form.sp_teammate_form_key IS 'Stable logical identity (from ljvis2.seq_sp_teammate_form_key). All snapshot rows share this value. NOT unique.';
COMMENT ON COLUMN forms.sp_teammate_form.compound_form_key IS 'Logical key of the parent control case. Bare BIGINT; no enforceable FK across snapshot tables.';
COMMENT ON COLUMN forms.sp_teammate_form.sub_form_number IS 'SP sub-form number, format sp-AAAA-NNNNN. Logically immutable; uniqueness enforced at orchestration layer.';
COMMENT ON COLUMN forms.sp_teammate_form.template_version IS 'SP form-template version. Immutable; carried forward on every snapshot.';
COMMENT ON COLUMN forms.sp_teammate_form.status IS 'Lifecycle status: saved, confirmed, published. Independent of compound_form.status. Case deletion (deleted) is recorded at the compound level only — sub-form rows are not written on delete. See §6.';
COMMENT ON COLUMN forms.sp_teammate_form.selection_status IS 'Whether this sub-form is active or removed. Values: active, removed. Default active.';
COMMENT ON COLUMN forms.sp_teammate_form.transport_type IS 'Veo põhiliik radio: passenger or goods. Auto-inherited from sp_driver_form on creation (editable afterwards).';
COMMENT ON COLUMN forms.sp_teammate_form.transport_empty_run IS 'Empty run. Auto-inherited from sp_driver_form on creation.';
COMMENT ON COLUMN forms.sp_teammate_form.transport_nature IS 'Veo laad radio: paid or own_account. Auto-inherited from sp_driver_form on creation. Nullable.';
COMMENT ON COLUMN forms.sp_teammate_form.transport_nature_exempt IS 'Nature of transport: exempt. Auto-inherited from sp_driver_form on creation.';
COMMENT ON COLUMN forms.sp_teammate_form.transport_classes IS 'Same structure as sp_driver_form.transport_classes. Auto-inherited on creation.';
COMMENT ON COLUMN forms.sp_teammate_form.cabotage_violations IS 'Same structure as sp_driver_form.cabotage_violations.';
COMMENT ON COLUMN forms.sp_teammate_form.result_type IS 'Kontrolli tulemus radio: ok, warning, precept, driving_ban, transport_interruption, arrest, misdemeanor_proceedings. Default ok.';
COMMENT ON COLUMN forms.sp_teammate_form.proceeding_type IS 'Menetlus: none, summary, expedited, general. Default none.';
COMMENT ON COLUMN forms.sp_teammate_form.proceeding_reference_number IS 'Menetluse viitenumber. Mandatory when proceeding_type != none.';
COMMENT ON COLUMN forms.sp_teammate_form.document_checks IS 'Same structure as sp_driver_form.document_checks.';
COMMENT ON COLUMN forms.sp_teammate_form.other_documents IS 'Same structure as sp_driver_form.other_documents.';
COMMENT ON COLUMN forms.sp_teammate_form.sp_applicability IS 'Same as sp_driver_form.sp_applicability.';
COMMENT ON COLUMN forms.sp_teammate_form.tachograph_type_code IS 'Same as sp_driver_form.tachograph_type_code.';
COMMENT ON COLUMN forms.sp_teammate_form.tachograph_data_not_downloaded IS 'Same as sp_driver_form.tachograph_data_not_downloaded.';
COMMENT ON COLUMN forms.sp_teammate_form.checked_days_count IS 'Kontrollitud päevade arv.';
COMMENT ON COLUMN forms.sp_teammate_form.work_days_count IS 'Nendest tööpäevi.';
COMMENT ON COLUMN forms.sp_teammate_form.other_activity_days_count IS 'Nendest päevade arv juhi muu tegevuse kohta.';
COMMENT ON COLUMN forms.sp_teammate_form.violations_561_2006 IS 'Same structure as sp_driver_form.violations_561_2006.';
COMMENT ON COLUMN forms.sp_teammate_form.violations_165_2014 IS 'Same structure as sp_driver_form.violations_165_2014.';
COMMENT ON COLUMN forms.sp_teammate_form.violations_2002_15 IS 'Same structure as sp_driver_form.violations_2002_15.';
COMMENT ON COLUMN forms.sp_teammate_form.violations_593_2008 IS 'Same structure as sp_driver_form.violations_593_2008.';
COMMENT ON COLUMN forms.sp_teammate_form.violations_2020_1057 IS 'Same structure as sp_driver_form.violations_2020_1057.';
COMMENT ON COLUMN forms.sp_teammate_form.mass_dimension_non_compliant IS 'Same as sp_driver_form.mass_dimension_non_compliant.';
COMMENT ON COLUMN forms.sp_teammate_form.mass_dimension_measurements IS 'Same structure as sp_driver_form.mass_dimension_measurements.';
COMMENT ON COLUMN forms.sp_teammate_form.atp_violation_found IS 'Same as sp_driver_form.atp_violation_found.';
COMMENT ON COLUMN forms.sp_teammate_form.atp_violation_description IS 'Same as sp_driver_form.atp_violation_description.';
COMMENT ON COLUMN forms.sp_teammate_form.erru_points IS 'Same structure as sp_driver_form.erru_points.';
COMMENT ON COLUMN forms.sp_teammate_form.files IS 'Same structure as sp_driver_form.files.';
COMMENT ON COLUMN forms.sp_teammate_form.enforcement_decision IS 'Same as sp_driver_form.enforcement_decision.';
COMMENT ON COLUMN forms.sp_teammate_form.proceeding_closure_basis IS 'Same as sp_driver_form.proceeding_closure_basis.';
COMMENT ON COLUMN forms.sp_teammate_form.notes IS 'SP form free-text notes (märkused).';
COMMENT ON COLUMN forms.sp_teammate_form.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN forms.sp_teammate_form.created_by IS 'Personal code (isikukood) of the actor or system identifier string. Loose audit reference; no FK.';

CREATE INDEX idx_spt_key_ts         ON forms.sp_teammate_form (sp_teammate_form_key, created_at DESC);
CREATE INDEX idx_spt_case_key       ON forms.sp_teammate_form (compound_form_key);
CREATE INDEX idx_spt_status         ON forms.sp_teammate_form (status);
CREATE INDEX idx_spt_selection      ON forms.sp_teammate_form (selection_status);
CREATE INDEX idx_spt_viol_561_gin   ON forms.sp_teammate_form USING GIN (violations_561_2006);
CREATE INDEX idx_spt_viol_165_gin   ON forms.sp_teammate_form USING GIN (violations_165_2014);
CREATE INDEX idx_spt_erru_gin       ON forms.sp_teammate_form USING GIN (erru_points);