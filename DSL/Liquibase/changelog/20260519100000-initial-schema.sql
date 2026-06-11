-- liquibase formatted sql
-- changeset ljvis:20260519100000 ignore:true
-- v2 schema for LJVIS-2 EPIC_02 — User Management (all-denormalized INSERT-only snapshots)
-- Replaces the v1 normalized model (user_account + *_state + *_latest + junction tables).

CREATE SCHEMA IF NOT EXISTS ljvis2;

-- Logical entity key sequences
CREATE SEQUENCE ljvis2.seq_user_account_key START 1;
CREATE SEQUENCE ljvis2.seq_user_group_key   START 1;

-- 1. organisation (flat catalogue — unchanged from v1)
CREATE TABLE ljvis2.organisation (
    id          BIGSERIAL       NOT NULL,
    name        VARCHAR(500)    NOT NULL,
    code        VARCHAR(50)     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by  VARCHAR(100)    NOT NULL,
    CONSTRAINT pk_organisation PRIMARY KEY (id),
    CONSTRAINT uq_organisation_code UNIQUE (code)
);

COMMENT ON TABLE  ljvis2.organisation IS 'Organisations (agencies) registered in the system';
COMMENT ON COLUMN ljvis2.organisation.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.organisation.name IS 'Official name of the organisation';
COMMENT ON COLUMN ljvis2.organisation.code IS 'Unique registry code of the organisation';
COMMENT ON COLUMN ljvis2.organisation.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.organisation.created_by IS 'User or process that created the row';

CREATE INDEX idx_organisation_name ON ljvis2.organisation (name);

-- 2. permission (flat catalogue — unchanged from v1)
CREATE TABLE ljvis2.permission (
    id          BIGSERIAL       NOT NULL,
    code        VARCHAR(100)    NOT NULL,
    description VARCHAR(500)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by  VARCHAR(100)    NOT NULL,
    CONSTRAINT pk_permission PRIMARY KEY (id),
    CONSTRAINT uq_permission_code UNIQUE (code)
);

COMMENT ON TABLE  ljvis2.permission IS 'Fixed catalogue of system permissions (resource.action codes). Dev-managed; code is the stable natural key used in guards.';
COMMENT ON COLUMN ljvis2.permission.code IS 'Unique permission code (e.g. user.edit.admin)';
COMMENT ON COLUMN ljvis2.permission.description IS 'Human-readable description';

CREATE INDEX idx_permission_code ON ljvis2.permission (code);

-- 3. user_group (INSERT-only denormalized snapshot)
-- Every change (rename, org change, permission change) appends a full new row.
-- Current state = latest row per user_group_key (DISTINCT ON user_group_key ORDER BY created_at DESC).
-- covers_all_organisations is NOT stored — computed at read time:
-- CARDINALITY(organisations) = (SELECT COUNT(*) FROM ljvis2.organisation)
-- members are NOT stored — queried via GIN index on user_account.user_groups.
CREATE TABLE ljvis2.user_group (
    id              BIGSERIAL       NOT NULL,
    user_group_key  BIGINT          NOT NULL,
    name            VARCHAR(50)     NOT NULL,
    organisations   BIGINT[]        NOT NULL DEFAULT '{}',
    permissions     TEXT[]          NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_user_group PRIMARY KEY (id)
);

COMMENT ON TABLE  ljvis2.user_group IS 'INSERT-only denormalized snapshot of a user group. Every mutation appends a new full row. Current state = latest row for user_group_key. Replaces v1 user_group + user_group_name_state + all junction/state tables + user_group_latest.';
COMMENT ON COLUMN ljvis2.user_group.id IS 'Per-row physical primary key';
COMMENT ON COLUMN ljvis2.user_group.user_group_key IS 'Stable logical identity from seq_user_group_key. All snapshot rows for one group share this value.';
COMMENT ON COLUMN ljvis2.user_group.name IS 'Group display name at snapshot time';
COMMENT ON COLUMN ljvis2.user_group.organisations IS 'BIGINT[] of organisation IDs at snapshot time. Empty array = no org-level restriction. Names resolved at read time via JOIN to organisation table.';
COMMENT ON COLUMN ljvis2.user_group.permissions IS 'TEXT[] of permission codes at snapshot time, e.g. {"user.edit.admin","user.read.admin"}.';
COMMENT ON COLUMN ljvis2.user_group.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.user_group.created_by IS 'Personal code (or system identifier) of the actor who triggered this snapshot';

CREATE INDEX idx_ug_key_ts   ON ljvis2.user_group (user_group_key, created_at DESC);
CREATE INDEX idx_ug_name     ON ljvis2.user_group (name);
CREATE INDEX idx_ug_orgs_gin ON ljvis2.user_group USING GIN (organisations);
CREATE INDEX idx_ug_perm_gin ON ljvis2.user_group USING GIN (permissions);

-- 4. user_account (INSERT-only denormalized snapshot)
-- Every change (data edit, status change, group membership change) appends a full new row.
-- Current state = latest row per user_account_key (DISTINCT ON user_account_key ORDER BY created_at DESC).
-- personal_code uniqueness is enforced at the orchestration layer (no DB UNIQUE constraint —
-- multiple rows exist per user, only the latest row per user_account_key counts).
CREATE TABLE ljvis2.user_account (
    id                  BIGSERIAL       NOT NULL,
    user_account_key    BIGINT          NOT NULL,
    personal_code       VARCHAR(20)     NOT NULL,
    first_name          VARCHAR(200)    NOT NULL,
    last_name           VARCHAR(200)    NOT NULL,
    organisation_id     BIGINT          NOT NULL,
    organisation_name   VARCHAR(500)    NOT NULL,
    structural_unit     VARCHAR(100)    NOT NULL,
    job_title           VARCHAR(100)    NOT NULL,
    email               VARCHAR(320)    NOT NULL,
    phone               VARCHAR(50),
    access_start        DATE            NOT NULL,
    access_end          DATE,
    status              VARCHAR(50)     NOT NULL,
    user_groups         BIGINT[]        NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT fk_ua_organisation FOREIGN KEY (organisation_id) REFERENCES ljvis2.organisation (id)
);

COMMENT ON TABLE  ljvis2.user_account IS 'INSERT-only denormalized snapshot of a user. Every mutation appends a new full row. Current state = latest row for user_account_key. Replaces v1 user_account + user_account_data_state + user_account_state + user_account_user_group(+_state) + user_account_latest.';
COMMENT ON COLUMN ljvis2.user_account.id IS 'Per-row physical primary key';
COMMENT ON COLUMN ljvis2.user_account.user_account_key IS 'Stable logical identity from seq_user_account_key. All snapshot rows for one user share this value.';
COMMENT ON COLUMN ljvis2.user_account.personal_code IS 'Estonian personal identification code. Logically immutable; uniqueness enforced at orchestration layer only.';
COMMENT ON COLUMN ljvis2.user_account.status IS 'Lifecycle status: active, deactivating, inactive';
COMMENT ON COLUMN ljvis2.user_account.user_groups IS 'BIGINT[] of user_group_key values the user belongs to: {42,17}. Names resolved at read time via JOIN. GIN-indexed for reverse lookup (find all members of a group).';
COMMENT ON COLUMN ljvis2.user_account.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.user_account.created_by IS 'Personal code (or system identifier) of the actor who triggered this snapshot';

CREATE INDEX idx_ua_key_ts     ON ljvis2.user_account (user_account_key, created_at DESC);
CREATE INDEX idx_ua_pcode      ON ljvis2.user_account (personal_code);
CREATE INDEX idx_ua_org_id     ON ljvis2.user_account (organisation_id);
CREATE INDEX idx_ua_status     ON ljvis2.user_account (status);
CREATE INDEX idx_ua_fname      ON ljvis2.user_account (first_name);
CREATE INDEX idx_ua_lname      ON ljvis2.user_account (last_name);
CREATE INDEX idx_ua_groups_gin ON ljvis2.user_account USING GIN (user_groups);
