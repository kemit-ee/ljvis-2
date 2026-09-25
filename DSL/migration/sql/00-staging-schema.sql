-- LJVIS1 -> ljvis-2 migration: staging schema.
-- Run this against the TARGET Postgres database (the one ljvis-2's own Liquibase
-- changelog has already been applied to). See README.md for the full run order.

CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS migration;

-- ── 1:1 mirror of LJVIS1 SQL Server EAV tables ─────────────────────────────
-- Populated by extract/extract_mssql_to_staging.py. Column list matches
-- Ljvis.Domain.Entities.Forms.* / Ljvis.Domain/Blt/GenerateModels1.generated.cs.

CREATE TABLE IF NOT EXISTS staging.raw_control_form (
    id                  BIGINT          NOT NULL,
    form_type_name      VARCHAR(100)    NOT NULL,
    control_stage       VARCHAR(20)     NOT NULL,   -- Saved/Confirmed/Published/Deleted/ERROR
    form_code           VARCHAR(100),
    form_version         INTEGER,
    controlled_date      TIMESTAMP,
    -- NULLABLE on purpose: dbo.ControlForm.CreatedDate is nullable in the source.
    -- The migration range predicate is built on this column, so rows with NULL
    -- need an explicit decision -- see sql/99-verify.sql section 1 and README.md.
    created_date          TIMESTAMP,
    updated_date          TIMESTAMP,
    created_by_user_id     BIGINT,                    -- FK to staging.raw_user, may be dangling
    establishment_code    VARCHAR(100),
    metadata_json          TEXT,                        -- ControlForm.MetaData blob
    united_form_part      BOOLEAN,
    qualifications_received BOOLEAN,
    PRIMARY KEY (id)
);
COMMENT ON TABLE staging.raw_control_form IS 'Raw 1:1 copy of LJVIS1 dbo.ControlForm. No transformation applied.';

CREATE TABLE IF NOT EXISTS staging.raw_control_form_value (
    id                  BIGINT          NOT NULL,
    control_form_id     BIGINT          NOT NULL,
    classifier_name     VARCHAR(200)    NOT NULL,   -- dotted-path key, e.g. "Driver.FirstName"
    value                TEXT,
    date_value           TIMESTAMP,
    int_value            BIGINT,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_rcfv_control_form_id ON staging.raw_control_form_value (control_form_id);
CREATE INDEX IF NOT EXISTS idx_rcfv_classifier_name ON staging.raw_control_form_value (classifier_name);
COMMENT ON TABLE staging.raw_control_form_value IS 'Raw 1:1 copy of LJVIS1 dbo.ControlFormValue (EAV). No transformation applied. One (control_form_id, classifier_name) pair may legally have several rows -- see 99-verify.sql section 7.';

CREATE TABLE IF NOT EXISTS staging.raw_control (
    id                  BIGINT          NOT NULL,
    control_code        VARCHAR(16),
    -- Real column is dbo.Control.CreatedAt, NOT CreatedDate (confirmed against
    -- Ljvis.Domain/Blt/GenerateModels1.generated.cs) -- and it is NULLABLE, unlike
    -- what an earlier draft of this schema assumed.
    created_at            TIMESTAMP,
    created_by_user_id     BIGINT,
    PRIMARY KEY (id)
);
COMMENT ON TABLE staging.raw_control IS 'Raw copy of LJVIS1 dbo.Control (compound-control grouping header, "UnitedForm"). Column names verified against GenerateModels1.generated.cs.';

CREATE TABLE IF NOT EXISTS staging.raw_control_to_form_binding (
    id                  BIGINT          NOT NULL,
    control_id           BIGINT          NOT NULL,
    control_form_id       BIGINT          NOT NULL,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_rctfb_control_id ON staging.raw_control_to_form_binding (control_id);
COMMENT ON TABLE staging.raw_control_to_form_binding IS 'Raw copy of LJVIS1 dbo.ControlToFormBinding (which ControlForm rows belong to one compound Control).';

CREATE TABLE IF NOT EXISTS staging.raw_control_decision (
    id                  BIGINT          NOT NULL,
    -- dbo.ControlDecision has NO ControlForm_id column and no confirmed FK to
    -- ControlForm at all (verified against GenerateModels1.generated.cs -- see
    -- the table definition, it has none). An earlier draft of this schema
    -- invented one; that was wrong and made the gap invisible. The real link
    -- mechanism (if any) is an open question -- see README.md.
    -- The table is extracted anyway (small, and useful once the link is
    -- found), but sql/04/05/06-transform-*.sql do NOT join against it.
    decision_type         VARCHAR(255),
    decision_no           VARCHAR(255),
    procedure_type         VARCHAR(255),
    decision_date          TIMESTAMP,
    archive_no             VARCHAR(255),
    par_lgp                VARCHAR(255),
    decision_maker          VARCHAR(255),
    description             VARCHAR(255),
    updated_date            TIMESTAMP,
    created_date            TIMESTAMP,
    PRIMARY KEY (id)
);
COMMENT ON TABLE staging.raw_control_decision IS 'Raw copy of LJVIS1 dbo.ControlDecision (otsus). No FK to ControlForm exists in the real schema -- see column comment above and README.md.';

CREATE TABLE IF NOT EXISTS staging.raw_user (
    id                  BIGINT          NOT NULL,
    first_name           VARCHAR(255),
    last_name             VARCHAR(255),
    personal_code          VARCHAR(255),
    -- Real column is dbo.[User].Ametikoht (job title), not a text "position"
    -- field under another name. There is NO free-text "Establishment" column
    -- on User -- Establishment_id is a FK to dbo.Classifier, resolved by the
    -- extractor via a JOIN so this table already carries a display name
    -- (or NULL if the classifier row itself has none / the FK is dangling).
    ametikoht              VARCHAR(255),
    establishment_name      VARCHAR(768),  -- resolved from Classifier.Name at extract time
    PRIMARY KEY (id)
);
COMMENT ON TABLE staging.raw_user IS 'Raw copy of LJVIS1 dbo.[User] (+ Classifier.Name resolved for Establishment_id), used only to resolve created_by display name/personal code for the historical-snapshot audit fields. No login accounts are created from this table.';

CREATE TABLE IF NOT EXISTS staging.raw_versions (
    id                  BIGINT          NOT NULL,
    table_name           VARCHAR(255),
    row_id                BIGINT,
    updated_time           TIMESTAMP,
    user_name              VARCHAR(255),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_rv_table_row ON staging.raw_versions (table_name, row_id);
COMMENT ON TABLE staging.raw_versions IS 'Raw copy of LJVIS1 dbo.Versions, used only as author-resolution fallback level 3 (see README.md).';

-- ── RavenDB export target (JobInspection / JobInspectionV2) ─────────────────
-- Populated by extract/extract_ravendb_to_staging.py.
CREATE TABLE IF NOT EXISTS staging.raw_job_inspection (
    raven_id             TEXT            NOT NULL,   -- RavenDB document id (was InspectionId)
    schema_version        SMALLINT        NOT NULL,   -- 1 = JobInspection, 2 = JobInspectionV2
    document_json          JSONB           NOT NULL,
    last_modified_at        TIMESTAMPTZ,               -- from @metadata.@last-modified
    PRIMARY KEY (raven_id)
);
COMMENT ON TABLE staging.raw_job_inspection IS 'Raw RavenDB document export for JobInspection/JobInspectionV2.';

-- ── LJVIS1 <-> ljvis-2 concordance ──────────────────────────────────────────
-- Two jobs in one table: (1) ETL idempotency -- the PK makes a re-run after a
-- bug fix a no-op instead of a duplicate-creating disaster; (2) the permanent
-- answer to "which LJVIS1 form did this row come from?". forms.* is never
-- touched with a legacy_id column; the link lives here instead. This table is
-- NOT dropped after sign-off. It is invisible to the application: no DSL reads
-- schema migration, and it carries no grants for the app role.
CREATE TABLE IF NOT EXISTS migration.form_link (
    legacy_source       TEXT            NOT NULL,   -- 'ControlForm' | 'RavenDB.JobInspection' | 'RavenDB.JobInspectionV2'
    legacy_id           TEXT            NOT NULL,   -- ControlForm.Id or RavenDB document id
    legacy_form_code    TEXT,                       -- LJVIS1 human-readable number, if any
    legacy_form_type    TEXT            NOT NULL,   -- 'RoadControlCard2012', 'ForeignViolate', ...
    legacy_created_date TIMESTAMPTZ,                -- ControlForm.CreatedDate, already in Europe/Tallinn
    target_table        TEXT            NOT NULL,   -- 'forms.compound_form', ...
    target_key           BIGINT          NOT NULL,   -- *_form_key
    target_form_number  VARCHAR(30)     NOT NULL,   -- the number generated by the ETL
    migration_run_id    UUID            NOT NULL,
    migrated_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    -- target_table is PART OF THE KEY, not just an attribute: one LJVIS1
    -- ControlForm row can produce TWO ljvis-2 rows (a synthetic compound_form
    -- AND its sub-form, see sql/02/04/05/06-transform-*.sql). A PK on
    -- (legacy_source, legacy_id) alone would let the second INSERT silently
    -- collide with the first via ON CONFLICT DO NOTHING, which then makes the
    -- "already migrated" NOT EXISTS check in the transform miss that sub-form
    -- forever -- the next run would re-process the same source row and insert
    -- a duplicate, undetected because the guard itself was broken.
    PRIMARY KEY (legacy_source, legacy_id, target_table)
);
CREATE INDEX IF NOT EXISTS idx_form_link_target ON migration.form_link (target_table, target_key);
CREATE INDEX IF NOT EXISTS idx_form_link_number ON migration.form_link (target_form_number);
CREATE INDEX IF NOT EXISTS idx_form_link_run    ON migration.form_link (migration_run_id);
COMMENT ON TABLE migration.form_link IS 'Permanent LJVIS1 -> ljvis-2 concordance. Also the idempotency key for ETL re-runs (transactional INSERT under the migration lock). Not read by the application.';

-- ── Data-quality report ──────────────────────────────────────────────────────
-- Every time the ETL substitutes a default for a missing required value, or
-- fails to map a classifier, it records the fact here. Without this, "never
-- skip a row, substitute a safe default" silently degrades tens of thousands
-- of forms with no way to tell which ones. The post-run summary over this
-- table (sql/99-verify.sql section 3) is what a reviewer signs off on.
CREATE TABLE IF NOT EXISTS migration.quality_report (
    id                  BIGSERIAL       PRIMARY KEY,
    migration_run_id    UUID            NOT NULL,
    legacy_source       TEXT            NOT NULL,
    legacy_id           TEXT            NOT NULL,
    target_table        TEXT            NOT NULL,
    column_name         TEXT            NOT NULL,
    issue               TEXT            NOT NULL,   -- 'missing_required' | 'unmapped_classifier' | 'author_fallback' | 'date_out_of_range' | 'value_truncated' | 'excluded_null_created_date' | 'no_source_field' | 'compound_grouping_skipped' | 'fabricated_created_at' | 'unconfirmed_relation'
    applied_default     TEXT,                       -- what was written instead
    raw_value           TEXT,                       -- what the source held (NULL when absent)
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_run    ON migration.quality_report (migration_run_id);
CREATE INDEX IF NOT EXISTS idx_qr_column ON migration.quality_report (target_table, column_name);
CREATE INDEX IF NOT EXISTS idx_qr_issue  ON migration.quality_report (issue);
COMMENT ON TABLE migration.quality_report IS 'One row per default substitution / unmapped value during ETL. All substitutions require review; no percentage threshold hides individual lost values.';

-- ── Helper: safe country code normalisation ─────────────────────────────────
-- LJVIS1's InspectionAddress.Country / Vehicle.Country / Company.CompanyAddress.Country
-- etc. are free text (no classifier enforced at save time) -- real values seen
-- include "EE", "EST", "Eesti", full country names, and typos. ljvis-2 country
-- columns are VARCHAR(3); inserting anything longer crashes the whole batch,
-- not just that one row's country. This normalises the common cases and uses
-- an explicit unknown marker for anything else -- every fallback is expected to be logged
-- into migration.quality_report as 'value_truncated' by the calling transform.
CREATE OR REPLACE FUNCTION migration.safe_country_code(raw text, default_code text DEFAULT '-')
RETURNS varchar(3) LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN raw IS NULL OR btrim(raw) = '' THEN default_code
        WHEN upper(btrim(raw)) IN ('EE', 'EST', 'EESTI') THEN 'EE'
        WHEN upper(btrim(raw)) ~ '^[A-Z]{2,3}$' THEN upper(btrim(raw))
        ELSE default_code
    END;
$$;
COMMENT ON FUNCTION migration.safe_country_code IS 'Normalises free-text LJVIS1 country values to a VARCHAR(3)-safe code. See sql/0N-transform-*.sql for callers.';

-- ── Run log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migration.run (
    migration_run_id    UUID            PRIMARY KEY,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    finished_at          TIMESTAMPTZ,
    source_cutoff_from  DATE            NOT NULL,   -- lower bound applied to ControlForm.CreatedDate
    form_types          TEXT[]          NOT NULL,
    notes               TEXT
);
COMMENT ON COLUMN migration.run.source_cutoff_from IS 'Range is computed on ControlForm.CreatedDate, NOT ControlledDate -- the two differ by up to 1293 days on real LJVIS1 data.';

-- The generated LJVIS1 model allows NULLs and 255-character keys/stages.
ALTER TABLE staging.raw_control_form
    ALTER COLUMN form_type_name TYPE text, ALTER COLUMN form_type_name DROP NOT NULL,
    ALTER COLUMN control_stage TYPE text, ALTER COLUMN control_stage DROP NOT NULL,
    ALTER COLUMN form_code TYPE text;
ALTER TABLE staging.raw_control_form_value
    ALTER COLUMN classifier_name TYPE text, ALTER COLUMN classifier_name DROP NOT NULL,
    ALTER COLUMN control_form_id DROP NOT NULL;
ALTER TABLE staging.raw_control_to_form_binding
    ALTER COLUMN control_id DROP NOT NULL, ALTER COLUMN control_form_id DROP NOT NULL;
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS current_step text;
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS source_label text;
ALTER TABLE migration.run ADD COLUMN IF NOT EXISTS code_sha256 text;
ALTER TABLE migration.form_link ADD COLUMN IF NOT EXISTS source_fingerprint text;

-- Durable evidence: NEVER discard this with staging. Includes EAV arrays as
-- separate rows, so duplicate keys and NULLs survive without a lossy JSON pivot.
CREATE TABLE IF NOT EXISTS migration.source_snapshot (
    migration_run_id uuid NOT NULL REFERENCES migration.run,
    source_table text NOT NULL,
    source_key text NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (migration_run_id, source_table, source_key)
);
CREATE TABLE IF NOT EXISTS migration.finding (
    migration_run_id uuid NOT NULL REFERENCES migration.run,
    severity text NOT NULL CHECK (severity IN ('blocker','warning','info')),
    legacy_source text NOT NULL,
    legacy_id text NOT NULL,
    issue text NOT NULL,
    detail text NOT NULL
);
CREATE INDEX IF NOT EXISTS finding_run_idx ON migration.finding (migration_run_id);

CREATE OR REPLACE FUNCTION migration.safe_time(raw text)
RETURNS time LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF btrim(raw) !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN RETURN NULL; END IF;
    RETURN btrim(raw)::time;
END $$;
CREATE OR REPLACE FUNCTION migration.safe_nonnegative_int(raw text)
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF btrim(raw) !~ '^[0-9]+$' THEN RETURN NULL; END IF;
    RETURN btrim(raw)::integer;
EXCEPTION WHEN numeric_value_out_of_range THEN RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION migration.safe_timestamp(raw text)
RETURNS timestamp LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    -- ISO date/time or the exact dd.MM.yyyy format emitted by the old binder.
    IF raw ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$' THEN
        RETURN make_date(substring(raw,1,4)::int, substring(raw,6,2)::int, substring(raw,9,2)::int);
    END IF;
    IF raw ~ '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$' THEN
        RETURN make_date(substring(raw,7,4)::int, substring(raw,4,2)::int, substring(raw,1,2)::int);
    END IF;
    IF raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
        RETURN raw::timestamptz AT TIME ZONE 'Europe/Tallinn';
    END IF;
    IF raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?)?$' THEN RETURN NULL; END IF;
    RETURN raw::timestamp;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN NULL;
END $$;
-- Reject oversized strings instead of silently truncating evidence. Production
-- preflight also reports these; the transaction is rolled back on any missed case.
CREATE OR REPLACE FUNCTION migration.fit_text(raw text, max_length int)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF length(raw) > max_length THEN
        RAISE EXCEPTION 'Migration text exceeds target length % (actual %). See retained source snapshot.', max_length, length(raw);
    END IF;
    RETURN raw;
END $$;
CREATE OR REPLACE FUNCTION migration.number_suffix(n bigint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT lpad(n::text, greatest(5, length(n::text)), '0');
$$;

-- Direct, unambiguous radio-value mappings confirmed in legacy views.
-- Multiple outcomes require a domain decision; never pick a MAX value.
CREATE OR REPLACE FUNCTION migration.legacy_result(kind text, outcomes text[])
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN cardinality(outcomes)=1 THEN
      CASE kind
        WHEN 'technical' THEN ('{"ok":"ok","erakorraline_ylevaatus":"extraordinary_inspection","era_yv_mnt":"extraordinary_inspection_ta","liiklemise_keeld":"driving_ban"}'::jsonb)->>lower(outcomes[1])
        WHEN 'sp' THEN ('{"ok":"ok","hoiatus":"warning","ettekirjutus":"precept","liiklemise_keeld":"driving_ban","autovedu_katkestatud":"transport_interruption","arest":"arrest","alustati_menetlust":"misdemeanor_proceedings"}'::jsonb)->>lower(outcomes[1])
        WHEN 'adr' THEN ('{"ok":"ok","hoiatus":"warning","alustati_menetlust":"misdemeanor_proceedings"}'::jsonb)->>lower(outcomes[1])
      END
    END;
$$;

-- .NET DateTime.MinValue and Year < 1000 are empty dates in both Raven editors.
CREATE OR REPLACE FUNCTION migration.raven_scope_timestamp(raw text)
RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN extract(year FROM migration.safe_timestamp(raw)) >= 1000
                THEN migration.safe_timestamp(raw) END;
$$;

-- Validate using the real target column width and retain actionable row context.
CREATE OR REPLACE FUNCTION migration.target_text(raw text, target regclass, col name, source_id text)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE width int;
BEGIN
    SELECT atttypmod - 4 INTO width FROM pg_attribute
      WHERE attrelid=target AND attname=col AND atttypid IN ('varchar'::regtype,'bpchar'::regtype)
        AND atttypmod > 4 AND NOT attisdropped;
    IF length(raw) > width THEN
        RAISE EXCEPTION 'Source %: %.% exceeds target length % (actual %); original retained in source_snapshot',
          source_id, target, col, width, length(raw);
    END IF;
    RETURN raw;
END $$;

-- Owner approval 2026-09-23: missing text only. Never dates/results/classifiers.
ALTER TABLE migration.quality_report ADD COLUMN IF NOT EXISTS approval_basis text;
CREATE OR REPLACE FUNCTION migration.approved_text_default(target text, col text, issue text, applied text, raw text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
    SELECT coalesce(applied='-' AND (
      (issue='author_fallback' AND col='created_by' AND target IN
        ('forms.good_repute_form','forms.compound_form','forms.kv_form','forms.foreign_violation_form',
         'forms.vehicle_technical_form','forms.sp_driver_form','forms.adr_form','forms.labour_inspection_form'))
      OR (issue IN ('missing_required','no_source_field') AND nullif(btrim(raw),'') IS NULL AND (
        (target='forms.good_repute_form' AND col IN
          ('personal_code','first_name','last_name','certificate_number','certificate_country_code'))
        OR (target='forms.compound_form' AND col IN
          ('inspector_first_name','inspector_last_name','inspector_unit','inspector_profession','control_country_code'))
        OR (target='forms.foreign_violation_form' AND col IN
          ('inspector_first_name','inspector_last_name','inspector_unit','inspector_profession',
           'reporting_country_code','reporting_authority_name'))
        OR (target='forms.labour_inspection_form' AND col IN
          ('inspector_name','company_name','company_reg_code'))
      ))
    ),false);
$$;

-- A true marker is the confirmed encoding in the legacy United form templates.
-- Other present encodings are blocked by preflight rather than guessed.
CREATE OR REPLACE FUNCTION migration.is_subtype(form_id bigint, marker text)
RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM staging.raw_control_form_value
        WHERE control_form_id=form_id AND classifier_name=marker
          AND lower(btrim(value)) IN ('true','1'));
$$;
