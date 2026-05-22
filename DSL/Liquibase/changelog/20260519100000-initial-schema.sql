-- liquibase formatted sql
-- changeset ljvis:20260519100000 ignore:true
-- Initial schema for LJVIS-2 User Management

CREATE SCHEMA IF NOT EXISTS ljvis2;

-- 1. organisation
CREATE TABLE ljvis2.organisation (
                              id              BIGSERIAL       NOT NULL,
                              name            VARCHAR(500)    NOT NULL,
                              code            VARCHAR(50)     NOT NULL,
                              created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                              created_by      VARCHAR(100)    NOT NULL,
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

-- NOTE: organisation has no state table. Organisations are a fixed list, not manageable
-- via the application UI; new organisations are added at development time based on a
-- request to Kliimaministeerium (confirmed on 21.04.2026 analysis meeting).

-- 2. user_account (immutable identity row)
CREATE TABLE ljvis2.user_account (
                              id              BIGSERIAL       NOT NULL,
                              personal_code   VARCHAR(20)     NOT NULL,
                              created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                              created_by      VARCHAR(100)    NOT NULL,
                              CONSTRAINT pk_user_account PRIMARY KEY (id),
                              CONSTRAINT uq_user_account_personal_code UNIQUE (personal_code)
);

COMMENT ON TABLE  ljvis2.user_account IS 'Immutable identity row for user accounts. Mutable fields (name, organisation, contact, access period) live in user_account_data_state (INSERT-only attribute-history snapshot; latest row wins).';
COMMENT ON COLUMN ljvis2.user_account.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account.personal_code IS 'Estonian personal identification code (isikukood); immutable identity field';
COMMENT ON COLUMN ljvis2.user_account.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_account.created_by IS 'User or process that created the row';

CREATE INDEX idx_user_account_personal_code ON ljvis2.user_account (personal_code);

-- INSERT-ONLY COMPLIANCE: mutable fields previously stored directly on user_account
-- (first_name, last_name, organisation_id, structural_unit, job_title, email, phone, access_start, access_end)
-- have been moved to user_account_data_state — INSERT-only attribute-history snapshot.
-- The latest row (ORDER BY created_at DESC LIMIT 1) gives the current values.
-- This brings user_account into compliance with HD4 Lisa 7 (only INSERT and SELECT;
-- UPDATE/DELETE/JOIN strictly forbidden) without a written deviation request.

-- 2b. user_account_data_state (INSERT-only attribute-history snapshot)
CREATE TABLE ljvis2.user_account_data_state (
                                         id              BIGSERIAL       NOT NULL,
                                         user_account_id BIGINT          NOT NULL,
                                         first_name      VARCHAR(200)    NOT NULL,
                                         last_name       VARCHAR(200)    NOT NULL,
                                         organisation_id BIGINT          NOT NULL,
                                         email           VARCHAR(320)    NOT NULL,
                                         phone           VARCHAR(50),
                                         structural_unit VARCHAR(100)    NOT NULL,
                                         job_title       VARCHAR(100)    NOT NULL,
                                         access_start    DATE            NOT NULL,
                                         access_end      DATE,
                                         created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                         created_by      VARCHAR(100)    NOT NULL,
                                         CONSTRAINT pk_user_account_data_state PRIMARY KEY (id),
                                         CONSTRAINT fk_uads_user_account FOREIGN KEY (user_account_id) REFERENCES ljvis2.user_account (id),
                                         CONSTRAINT fk_uads_organisation FOREIGN KEY (organisation_id) REFERENCES ljvis2.organisation (id)
);

COMMENT ON TABLE  ljvis2.user_account_data_state IS 'INSERT-only attribute-history snapshot of mutable user fields; latest row by created_at is the current version';
COMMENT ON COLUMN ljvis2.user_account_data_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account_data_state.user_account_id IS 'FK to user_account';
COMMENT ON COLUMN ljvis2.user_account_data_state.first_name IS 'First name of the user at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_account_data_state.last_name IS 'Last name (family name) of the user at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_account_data_state.organisation_id IS 'FK to the organisation the user belongs to at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_account_data_state.email IS 'E-mail address at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_account_data_state.phone IS 'Phone number at the time the row was inserted (optional, format: digits and spaces only; UI displays fixed +372 prefix not stored here)';
COMMENT ON COLUMN ljvis2.user_account_data_state.structural_unit IS 'Structural unit (subdivision) of the organisation at the time the row was inserted. Currently a hardcoded dropdown (LÕUNA PREFEKTUUR, IDA PREFEKTUUR, LÄÄNE PREFEKTUUR, PÕHJA PREFEKTUUR, KLIM, TRAM); will become an FK to a classifier table in a future EPIC';
COMMENT ON COLUMN ljvis2.user_account_data_state.job_title IS 'Job title of the user at the time the row was inserted (free text, max 100 chars)';
COMMENT ON COLUMN ljvis2.user_account_data_state.access_start IS 'Date from which access is granted (inclusive) at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_account_data_state.access_end IS 'Date until which access is granted (inclusive) at the time the row was inserted; NULL = no end date';
COMMENT ON COLUMN ljvis2.user_account_data_state.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.user_account_data_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_uads_user_account_id_created_at ON ljvis2.user_account_data_state (user_account_id, created_at DESC);
CREATE INDEX idx_uads_organisation_id ON ljvis2.user_account_data_state (organisation_id);
CREATE INDEX idx_uads_first_name ON ljvis2.user_account_data_state (first_name);
CREATE INDEX idx_uads_last_name ON ljvis2.user_account_data_state (last_name);
CREATE INDEX idx_uads_access_end ON ljvis2.user_account_data_state (access_end);

-- 2c. user_account_state
CREATE TABLE ljvis2.user_account_state (
                                    id              BIGSERIAL       NOT NULL,
                                    user_account_id BIGINT          NOT NULL,
                                    status          VARCHAR(50)     NOT NULL,
                                    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                    created_by      VARCHAR(100)    NOT NULL,
                                    CONSTRAINT pk_user_account_state PRIMARY KEY (id),
                                    CONSTRAINT fk_user_account_state_ua FOREIGN KEY (user_account_id) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.user_account_state IS 'INSERT-only state history for user accounts';
COMMENT ON COLUMN ljvis2.user_account_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account_state.user_account_id IS 'FK to user_account';
COMMENT ON COLUMN ljvis2.user_account_state.status IS 'State code: active, pending_deactivation, inactive';
COMMENT ON COLUMN ljvis2.user_account_state.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_account_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_user_account_state_ua_id ON ljvis2.user_account_state (user_account_id);
CREATE INDEX idx_user_account_state_created_at ON ljvis2.user_account_state (created_at);
CREATE INDEX idx_user_account_state_ua_id_created_at ON ljvis2.user_account_state (user_account_id, created_at DESC);

-- 3. user_group (immutable identity row)
CREATE TABLE ljvis2.user_group (
                            id          BIGSERIAL       NOT NULL,
                            created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
                            created_by  VARCHAR(100)    NOT NULL,
                            CONSTRAINT pk_user_group PRIMARY KEY (id)
);

COMMENT ON TABLE  ljvis2.user_group IS 'Named user groups that bundle permissions; identity row only. Display name lives in user_group_name_state (INSERT-only attribute history).';
COMMENT ON COLUMN ljvis2.user_group.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_group.created_by IS 'User or process that created the row';

-- NOTE: user_group has no status state table. User groups are never removed after
-- creation; temporary access is handled by adding/removing a user from a group via
-- user_account_user_group_state (confirmed on 21.04.2026 analysis meeting).
-- INSERT-ONLY COMPLIANCE: the previous mutable columns (name, covers_all_organisations)
-- have been removed in favour of:
--   * user_group_name_state — INSERT-only attribute history for the display name;
--     latest row (ORDER BY created_at DESC LIMIT 1) gives the current name.
--   * coversAllOrganisations is computed at read time as
--     ( count(active user_group_organisation rows for the group)
--       == count(*) FROM organisation ). It is no longer stored.
-- This brings user_group into compliance with HD4 Lisa 7 (only INSERT and SELECT;
-- UPDATE/DELETE/JOIN strictly forbidden) without a written deviation request.

-- 3b. user_group_name_state (INSERT-only attribute history)
CREATE TABLE ljvis2.user_group_name_state (
                                       id              BIGSERIAL       NOT NULL,
                                       user_group_id   BIGINT          NOT NULL,
                                       name            VARCHAR(50)     NOT NULL,
                                       created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                       created_by      VARCHAR(100)    NOT NULL,
                                       CONSTRAINT pk_user_group_name_state PRIMARY KEY (id),
                                       CONSTRAINT fk_ugns_user_group FOREIGN KEY (user_group_id) REFERENCES ljvis2.user_group (id)
);

COMMENT ON TABLE  ljvis2.user_group_name_state IS 'INSERT-only history of user_group display name changes; latest row by created_at is the current name';
COMMENT ON COLUMN ljvis2.user_group_name_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_name_state.user_group_id IS 'FK to user_group';
COMMENT ON COLUMN ljvis2.user_group_name_state.name IS 'Display name of the user group at the time the row was inserted';
COMMENT ON COLUMN ljvis2.user_group_name_state.created_at IS 'Row creation timestamp; ordering key for latest-name resolution';
COMMENT ON COLUMN ljvis2.user_group_name_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_ugns_user_group_id_created_at ON ljvis2.user_group_name_state (user_group_id, created_at DESC);
CREATE INDEX idx_ugns_name_lower ON ljvis2.user_group_name_state (LOWER(name));

-- 4. permission
CREATE TABLE ljvis2.permission (
                            id              BIGSERIAL       NOT NULL,
                            code            VARCHAR(100)    NOT NULL,
                            description     VARCHAR(500)    NOT NULL,
                            created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                            created_by      VARCHAR(100)    NOT NULL,
                            CONSTRAINT pk_permission PRIMARY KEY (id),
                            CONSTRAINT uq_permission_code UNIQUE (code)
);

COMMENT ON TABLE  ljvis2.permission IS 'Fixed catalogue of system permissions (resource.action codes)';
COMMENT ON COLUMN ljvis2.permission.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.permission.code IS 'Unique permission code (e.g. user.list.admin)';
COMMENT ON COLUMN ljvis2.permission.description IS 'Human-readable description of the permission';
COMMENT ON COLUMN ljvis2.permission.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.permission.created_by IS 'User or process that created the row';

CREATE INDEX idx_permission_code ON ljvis2.permission (code);

-- 5. user_account_user_group (many-to-many link)
CREATE TABLE ljvis2.user_account_user_group (
                                         id              BIGSERIAL       NOT NULL,
                                         user_account_id BIGINT          NOT NULL,
                                         user_group_id   BIGINT          NOT NULL,
                                         created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                         created_by      VARCHAR(100)    NOT NULL,
                                         CONSTRAINT pk_user_account_user_group PRIMARY KEY (id),
                                         CONSTRAINT fk_uaug_user_account FOREIGN KEY (user_account_id) REFERENCES ljvis2.user_account (id),
                                         CONSTRAINT fk_uaug_user_group FOREIGN KEY (user_group_id) REFERENCES ljvis2.user_group (id)
);

COMMENT ON TABLE  ljvis2.user_account_user_group IS 'Many-to-many link between users and user groups';
COMMENT ON COLUMN ljvis2.user_account_user_group.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account_user_group.user_account_id IS 'FK to user_account';
COMMENT ON COLUMN ljvis2.user_account_user_group.user_group_id IS 'FK to user_group';
COMMENT ON COLUMN ljvis2.user_account_user_group.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_account_user_group.created_by IS 'User or process that created the row';

CREATE INDEX idx_uaug_user_account_id ON ljvis2.user_account_user_group (user_account_id);
CREATE INDEX idx_uaug_user_group_id ON ljvis2.user_account_user_group (user_group_id);

-- 5b. user_account_user_group_state
CREATE TABLE ljvis2.user_account_user_group_state (
                                               id                          BIGSERIAL       NOT NULL,
                                               user_account_user_group_id  BIGINT          NOT NULL,
                                               status                      VARCHAR(50)     NOT NULL,
                                               created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                               created_by                  VARCHAR(100)    NOT NULL,
                                               CONSTRAINT pk_uaug_state PRIMARY KEY (id),
                                               CONSTRAINT fk_uaug_state_uaug FOREIGN KEY (user_account_user_group_id) REFERENCES ljvis2.user_account_user_group (id)
);

COMMENT ON TABLE  ljvis2.user_account_user_group_state IS 'INSERT-only state history for user–group membership';
COMMENT ON COLUMN ljvis2.user_account_user_group_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account_user_group_state.user_account_user_group_id IS 'FK to user_account_user_group';
COMMENT ON COLUMN ljvis2.user_account_user_group_state.status IS 'State code: active, removed';
COMMENT ON COLUMN ljvis2.user_account_user_group_state.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_account_user_group_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_uaug_state_uaug_id ON ljvis2.user_account_user_group_state (user_account_user_group_id);
CREATE INDEX idx_uaug_state_created_at ON ljvis2.user_account_user_group_state (created_at);
CREATE INDEX idx_uaug_state_uaug_id_created_at ON ljvis2.user_account_user_group_state (user_account_user_group_id, created_at DESC);

-- 6. user_group_organisation (many-to-many link)
CREATE TABLE ljvis2.user_group_organisation (
                                         id              BIGSERIAL       NOT NULL,
                                         user_group_id   BIGINT          NOT NULL,
                                         organisation_id BIGINT          NOT NULL,
                                         created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                         created_by      VARCHAR(100)    NOT NULL,
                                         CONSTRAINT pk_user_group_organisation PRIMARY KEY (id),
                                         CONSTRAINT fk_ugo_user_group FOREIGN KEY (user_group_id) REFERENCES ljvis2.user_group (id),
                                         CONSTRAINT fk_ugo_organisation FOREIGN KEY (organisation_id) REFERENCES ljvis2.organisation (id)
);

COMMENT ON TABLE  ljvis2.user_group_organisation IS 'Many-to-many link between user groups and organisations';
COMMENT ON COLUMN ljvis2.user_group_organisation.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_organisation.user_group_id IS 'FK to user_group';
COMMENT ON COLUMN ljvis2.user_group_organisation.organisation_id IS 'FK to organisation';
COMMENT ON COLUMN ljvis2.user_group_organisation.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_group_organisation.created_by IS 'User or process that created the row';

CREATE INDEX idx_ugo_user_group_id ON ljvis2.user_group_organisation (user_group_id);
CREATE INDEX idx_ugo_organisation_id ON ljvis2.user_group_organisation (organisation_id);

-- 6b. user_group_organisation_state
CREATE TABLE ljvis2.user_group_organisation_state (
                                               id                          BIGSERIAL       NOT NULL,
                                               user_group_organisation_id  BIGINT          NOT NULL,
                                               status                      VARCHAR(50)     NOT NULL,
                                               created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                               created_by                  VARCHAR(100)    NOT NULL,
                                               CONSTRAINT pk_ugo_state PRIMARY KEY (id),
                                               CONSTRAINT fk_ugo_state_ugo FOREIGN KEY (user_group_organisation_id) REFERENCES ljvis2.user_group_organisation (id)
);

COMMENT ON TABLE  ljvis2.user_group_organisation_state IS 'INSERT-only state history for group–organisation membership';
COMMENT ON COLUMN ljvis2.user_group_organisation_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_organisation_state.user_group_organisation_id IS 'FK to user_group_organisation';
COMMENT ON COLUMN ljvis2.user_group_organisation_state.status IS 'State code: active, removed';
COMMENT ON COLUMN ljvis2.user_group_organisation_state.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_group_organisation_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_ugo_state_ugo_id ON ljvis2.user_group_organisation_state (user_group_organisation_id);
CREATE INDEX idx_ugo_state_created_at ON ljvis2.user_group_organisation_state (created_at);

-- 7. user_group_permission (many-to-many link)
CREATE TABLE ljvis2.user_group_permission (
                                       id              BIGSERIAL       NOT NULL,
                                       user_group_id   BIGINT          NOT NULL,
                                       permission_id   BIGINT          NOT NULL,
                                       created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                       created_by      VARCHAR(100)    NOT NULL,
                                       CONSTRAINT pk_user_group_permission PRIMARY KEY (id),
                                       CONSTRAINT fk_ugp_user_group FOREIGN KEY (user_group_id) REFERENCES ljvis2.user_group (id),
                                       CONSTRAINT fk_ugp_permission FOREIGN KEY (permission_id) REFERENCES ljvis2.permission (id)
);

COMMENT ON TABLE  ljvis2.user_group_permission IS 'Many-to-many link between user groups and permissions';
COMMENT ON COLUMN ljvis2.user_group_permission.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_permission.user_group_id IS 'FK to user_group';
COMMENT ON COLUMN ljvis2.user_group_permission.permission_id IS 'FK to permission';
COMMENT ON COLUMN ljvis2.user_group_permission.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_group_permission.created_by IS 'User or process that created the row';

CREATE INDEX idx_ugp_user_group_id ON ljvis2.user_group_permission (user_group_id);
CREATE INDEX idx_ugp_permission_id ON ljvis2.user_group_permission (permission_id);

-- 7b. user_group_permission_state
CREATE TABLE ljvis2.user_group_permission_state (
                                             id                          BIGSERIAL       NOT NULL,
                                             user_group_permission_id    BIGINT          NOT NULL,
                                             status                      VARCHAR(50)     NOT NULL,
                                             created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                             created_by                  VARCHAR(100)    NOT NULL,
                                             CONSTRAINT pk_ugp_state PRIMARY KEY (id),
                                             CONSTRAINT fk_ugp_state_ugp FOREIGN KEY (user_group_permission_id) REFERENCES ljvis2.user_group_permission (id)
);

COMMENT ON TABLE  ljvis2.user_group_permission_state IS 'INSERT-only state history for group–permission membership';
COMMENT ON COLUMN ljvis2.user_group_permission_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_permission_state.user_group_permission_id IS 'FK to user_group_permission';
COMMENT ON COLUMN ljvis2.user_group_permission_state.status IS 'State code: active, removed';
COMMENT ON COLUMN ljvis2.user_group_permission_state.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.user_group_permission_state.created_by IS 'User or process that created the row';

CREATE INDEX idx_ugp_state_ugp_id ON ljvis2.user_group_permission_state (user_group_permission_id);
CREATE INDEX idx_ugp_state_created_at ON ljvis2.user_group_permission_state (created_at);

-- 8. user_account_latest (INSERT-only denormalized read-optimised snapshot)
CREATE TABLE ljvis2.user_account_latest (
                                     id                  BIGSERIAL       NOT NULL,
                                     user_account_id     BIGINT          NOT NULL,
                                     personal_code       VARCHAR(20)     NOT NULL,
                                     first_name          VARCHAR(200)    NOT NULL,
                                     last_name           VARCHAR(200)    NOT NULL,
                                     email               VARCHAR(320)    NOT NULL,
                                     phone               VARCHAR(50),
                                     structural_unit     VARCHAR(100)    NOT NULL,
                                     job_title           VARCHAR(100)    NOT NULL,
                                     organisation_id     BIGINT          NOT NULL,
                                     organisation_name   VARCHAR(500)    NOT NULL,
                                     access_start        DATE            NOT NULL,
                                     access_end          DATE,
                                     status              VARCHAR(50)     NOT NULL,
                                     user_groups         JSONB           NOT NULL DEFAULT '[]',
                                     created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                     created_by          VARCHAR(100)    NOT NULL,
                                     CONSTRAINT pk_user_account_latest PRIMARY KEY (id),
                                     CONSTRAINT fk_ual_user_account FOREIGN KEY (user_account_id) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.user_account_latest IS 'INSERT-only denormalized snapshot of the current user state for all read views. Latest row per user_account_id (ORDER BY created_at DESC LIMIT 1) gives fully assembled data without sub-queries at read time. Rebuilt by a Ruuter RESQL rebuild endpoint after every write operation that changes user data.';
COMMENT ON COLUMN ljvis2.user_account_latest.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_account_latest.user_account_id IS 'FK to user_account; identifies which user this snapshot belongs to';
COMMENT ON COLUMN ljvis2.user_account_latest.personal_code IS 'Denormalized from user_account.personal_code';
COMMENT ON COLUMN ljvis2.user_account_latest.first_name IS 'Denormalized from latest user_account_data_state row';
COMMENT ON COLUMN ljvis2.user_account_latest.last_name IS 'Denormalized from latest user_account_data_state row';
COMMENT ON COLUMN ljvis2.user_account_latest.email IS 'Denormalized from latest user_account_data_state row';
COMMENT ON COLUMN ljvis2.user_account_latest.phone IS 'Denormalized from latest user_account_data_state row; NULL = not provided';
COMMENT ON COLUMN ljvis2.user_account_latest.structural_unit IS 'Denormalized from latest user_account_data_state row; hardcoded dropdown value, future classifier FK';
COMMENT ON COLUMN ljvis2.user_account_latest.job_title IS 'Denormalized from latest user_account_data_state row; free text job title';
COMMENT ON COLUMN ljvis2.user_account_latest.organisation_id IS 'Denormalized from latest user_account_data_state row';
COMMENT ON COLUMN ljvis2.user_account_latest.organisation_name IS 'Denormalized from organisation.name at snapshot time';
COMMENT ON COLUMN ljvis2.user_account_latest.access_start IS 'Denormalized from latest user_account_data_state row';
COMMENT ON COLUMN ljvis2.user_account_latest.access_end IS 'Denormalized from latest user_account_data_state row; NULL = no end date';
COMMENT ON COLUMN ljvis2.user_account_latest.status IS 'Denormalized from latest user_account_state row; values: active, pending_deactivation, inactive';
COMMENT ON COLUMN ljvis2.user_account_latest.user_groups IS 'JSONB array of active group memberships with current names: [{id, name}, ...]. Assembled from user_account_user_group, user_account_user_group_state and user_group_name_state at snapshot time.';
COMMENT ON COLUMN ljvis2.user_account_latest.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.user_account_latest.created_by IS 'Ruuter flow or process that inserted this snapshot row (e.g. ruuter:user_account_data_state_create)';

CREATE INDEX idx_ual_user_account_id_created_at ON ljvis2.user_account_latest (user_account_id, created_at DESC);
CREATE INDEX idx_ual_first_name_lower ON ljvis2.user_account_latest (LOWER(first_name));
CREATE INDEX idx_ual_last_name_lower ON ljvis2.user_account_latest (LOWER(last_name));
CREATE INDEX idx_ual_organisation_id ON ljvis2.user_account_latest (organisation_id);
CREATE INDEX idx_ual_status ON ljvis2.user_account_latest (status);
CREATE INDEX idx_ual_user_groups_gin ON ljvis2.user_account_latest USING GIN (user_groups);

-- 9. user_group_latest (INSERT-only denormalized read-optimised snapshot)
CREATE TABLE ljvis2.user_group_latest (
                                   id                          BIGSERIAL       NOT NULL,
                                   user_group_id               BIGINT          NOT NULL,
                                   name                        VARCHAR(50)     NOT NULL,
                                   organisations               JSONB           NOT NULL DEFAULT '[]',
                                   covers_all_organisations    BOOLEAN         NOT NULL DEFAULT false,
                                   permissions                 JSONB           NOT NULL DEFAULT '[]',
                                   created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                   created_by                  VARCHAR(100)    NOT NULL,
                                   CONSTRAINT pk_user_group_latest PRIMARY KEY (id),
                                   CONSTRAINT fk_ugl_user_group FOREIGN KEY (user_group_id) REFERENCES ljvis2.user_group (id)
);

COMMENT ON TABLE  ljvis2.user_group_latest IS 'INSERT-only denormalized snapshot of the current user group state for all read views. Latest row per user_group_id (ORDER BY created_at DESC LIMIT 1) gives fully assembled data without sub-queries at read time. Rebuilt by a Ruuter RESQL rebuild endpoint after every write operation that changes group data.';
COMMENT ON COLUMN ljvis2.user_group_latest.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.user_group_latest.user_group_id IS 'FK to user_group; identifies which group this snapshot belongs to';
COMMENT ON COLUMN ljvis2.user_group_latest.name IS 'Denormalized from latest user_group_name_state row';
COMMENT ON COLUMN ljvis2.user_group_latest.organisations IS 'JSONB array of active organisation links: [{id, name}, ...]. Assembled from user_group_organisation, user_group_organisation_state and organisation at snapshot time.';
COMMENT ON COLUMN ljvis2.user_group_latest.covers_all_organisations IS 'Computed at snapshot time: count(active user_group_organisation rows for this group) == count(*) FROM organisation. Stored to avoid re-computation at read time.';
COMMENT ON COLUMN ljvis2.user_group_latest.permissions IS 'JSONB array of active permissions: [{id, code, description}, ...]. Assembled from user_group_permission, user_group_permission_state and permission at snapshot time.';
COMMENT ON COLUMN ljvis2.user_group_latest.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.user_group_latest.created_by IS 'Ruuter flow or process that inserted this snapshot row (e.g. ruuter:user_group_name_state_create)';

CREATE INDEX idx_ugl_user_group_id_created_at ON ljvis2.user_group_latest (user_group_id, created_at DESC);
CREATE INDEX idx_ugl_name_lower ON ljvis2.user_group_latest (LOWER(name));
CREATE INDEX idx_ugl_organisations_gin ON ljvis2.user_group_latest USING GIN (organisations);