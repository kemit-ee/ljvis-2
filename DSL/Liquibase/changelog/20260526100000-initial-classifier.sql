-- liquibase formatted sql
-- changeset ljvis:20260526100000 ignore:true
-- v3 schema for LJVIS-2 EPIC_04 — Classifier Management (INSERT-only snapshots, typed-arrays)
-- Replaces v1 classifier + classifier_name_state + classifier_value + classifier_value_validity_state + *_latest.
-- is_valid computed at read time; classifier_code resolved via JOIN (not stored on classifier_value).

CREATE SEQUENCE ljvis2.seq_classifier_key       START 1;
CREATE SEQUENCE ljvis2.seq_classifier_value_key START 1;

-- 1. classifier (INSERT-only snapshot)
CREATE TABLE ljvis2.classifier (
    id              BIGSERIAL       NOT NULL,
    classifier_key  BIGINT          NOT NULL,
    code            VARCHAR(50)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    description     VARCHAR(250),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_classifier PRIMARY KEY (id)
);

COMMENT ON TABLE  ljvis2.classifier IS 'INSERT-only denormalized snapshot of a classifier. Every change (name/description edit) appends a complete new row. Current state = DISTINCT ON (classifier_key) ORDER BY classifier_key, created_at DESC.';
COMMENT ON COLUMN ljvis2.classifier.id             IS 'Per-row physical primary key';
COMMENT ON COLUMN ljvis2.classifier.classifier_key IS 'Stable logical identity from ljvis2.seq_classifier_key. All snapshot rows of one classifier share this value; not unique.';
COMMENT ON COLUMN ljvis2.classifier.code           IS 'Stable business code (e.g. RTK). Logically immutable across snapshots; uniqueness enforced at orchestration (Ruuter) layer, not DB.';
COMMENT ON COLUMN ljvis2.classifier.name           IS 'Human-readable classifier name as of this snapshot; max 100 characters';
COMMENT ON COLUMN ljvis2.classifier.description    IS 'Free-text explanation as of this snapshot; optional; max 250 characters';
COMMENT ON COLUMN ljvis2.classifier.created_at     IS 'Snapshot creation timestamp; ordering key for latest-row resolution';
COMMENT ON COLUMN ljvis2.classifier.created_by     IS 'Personal code (isikukood) of the actor or system identifier string. No FK constraint.';

CREATE INDEX idx_c_key_ts    ON ljvis2.classifier (classifier_key, created_at DESC);
CREATE INDEX idx_c_code      ON ljvis2.classifier (code);
CREATE INDEX idx_c_name_lower ON ljvis2.classifier (LOWER(name));

-- 2. classifier_value (INSERT-only snapshot)
CREATE TABLE ljvis2.classifier_value (
    id                    BIGSERIAL       NOT NULL,
    classifier_value_key  BIGINT          NOT NULL,
    classifier_key        BIGINT          NOT NULL,
    code                  VARCHAR(100)    NOT NULL,
    name                  VARCHAR(500)    NOT NULL,
    valid_from            DATE            NOT NULL,
    valid_until           DATE,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by            VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_classifier_value PRIMARY KEY (id),
    CONSTRAINT ck_cv_period CHECK (valid_until IS NULL OR valid_until > valid_from)
);

COMMENT ON TABLE  ljvis2.classifier_value IS 'INSERT-only denormalized snapshot of a classifier value. Every change (validity edit, name edit) appends a complete new row. Current state = DISTINCT ON (classifier_value_key) ORDER BY classifier_value_key, created_at DESC.';
COMMENT ON COLUMN ljvis2.classifier_value.id                   IS 'Per-row physical primary key';
COMMENT ON COLUMN ljvis2.classifier_value.classifier_value_key IS 'Stable logical identity from ljvis2.seq_classifier_value_key. All snapshot rows of one value share this value; not unique.';
COMMENT ON COLUMN ljvis2.classifier_value.classifier_key       IS 'Logical key of the owning classifier (ljvis2.classifier.classifier_key). Enables filtering values by classifier without a lookup. Bare BIGINT — no FK possible against a non-unique column.';
COMMENT ON COLUMN ljvis2.classifier_value.code                 IS 'Business code of the value within the classifier (e.g. EE). Logically immutable across snapshots; per-classifier uniqueness enforced at orchestration (Ruuter) layer.';
COMMENT ON COLUMN ljvis2.classifier_value.name                 IS 'Human-readable name of the value as of this snapshot (e.g. Eesti); max 500 characters';
COMMENT ON COLUMN ljvis2.classifier_value.valid_from           IS 'Start date of validity (inclusive) as of this snapshot';
COMMENT ON COLUMN ljvis2.classifier_value.valid_until          IS 'End date of validity (exclusive — value is NOT valid on this date) as of this snapshot; NULL = open-ended';
COMMENT ON COLUMN ljvis2.classifier_value.created_at           IS 'Snapshot creation timestamp; ordering key for latest-row resolution';
COMMENT ON COLUMN ljvis2.classifier_value.created_by           IS 'Personal code (isikukood) of the actor or system identifier string. No FK constraint.';

CREATE INDEX idx_cv_key_ts        ON ljvis2.classifier_value (classifier_value_key, created_at DESC);
CREATE INDEX idx_cv_classifier_key ON ljvis2.classifier_value (classifier_key);
CREATE INDEX idx_cv_code           ON ljvis2.classifier_value (code);