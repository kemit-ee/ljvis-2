-- EPIC 02 guarded schema migration
-- Creates the user management schema with guarded DDL so the migration can be rerun safely.
-- Base entities are created first, followed by append-only state tables and latest snapshot tables.
CREATE TABLE IF NOT EXISTS organisation (
    id BIGSERIAL NOT NULL,
    name VARCHAR(500) NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_organisation PRIMARY KEY (id),
    CONSTRAINT uq_organisation_code UNIQUE (code)
);
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS name VARCHAR(500);
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account (
    id BIGSERIAL NOT NULL,
    personal_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uq_user_account_personal_code UNIQUE (personal_code)
);
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS personal_code VARCHAR(20);
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group (
    id BIGSERIAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_group PRIMARY KEY (id)
);
ALTER TABLE user_group ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS permission (
    id BIGSERIAL NOT NULL,
    code VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_permission PRIMARY KEY (id),
    CONSTRAINT uq_permission_code UNIQUE (code)
);
ALTER TABLE permission ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE permission ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE permission ADD COLUMN IF NOT EXISTS description VARCHAR(500);
ALTER TABLE permission ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE permission ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account_data_state (
    id BIGSERIAL NOT NULL,
    user_account_id BIGINT NOT NULL,
    first_name VARCHAR(200) NOT NULL,
    last_name VARCHAR(200) NOT NULL,
    organisation_id BIGINT NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(50),
    structural_unit VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    access_start DATE NOT NULL,
    access_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_account_data_state PRIMARY KEY (id)
);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS user_account_id BIGINT;
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS first_name VARCHAR(200);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS last_name VARCHAR(200);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS structural_unit VARCHAR(100);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS access_start DATE;
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS access_end DATE;
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account_data_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account_state (
    id BIGSERIAL NOT NULL,
    user_account_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_account_state PRIMARY KEY (id)
);
ALTER TABLE user_account_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account_state ADD COLUMN IF NOT EXISTS user_account_id BIGINT;
ALTER TABLE user_account_state ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE user_account_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_name_state (
    id BIGSERIAL NOT NULL,
    user_group_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_group_name_state PRIMARY KEY (id)
);
ALTER TABLE user_group_name_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_name_state ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
ALTER TABLE user_group_name_state ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE user_group_name_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_name_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account_user_group (
    id BIGSERIAL NOT NULL,
    user_account_id BIGINT NOT NULL,
    user_group_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_account_user_group PRIMARY KEY (id)
);
ALTER TABLE user_account_user_group ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account_user_group ADD COLUMN IF NOT EXISTS user_account_id BIGINT;
ALTER TABLE user_account_user_group ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
ALTER TABLE user_account_user_group ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account_user_group ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account_user_group_state (
    id BIGSERIAL NOT NULL,
    user_account_user_group_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_uaug_state PRIMARY KEY (id)
);
ALTER TABLE user_account_user_group_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account_user_group_state ADD COLUMN IF NOT EXISTS user_account_user_group_id BIGINT;
ALTER TABLE user_account_user_group_state ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE user_account_user_group_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account_user_group_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_organisation (
    id BIGSERIAL NOT NULL,
    user_group_id BIGINT NOT NULL,
    organisation_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_group_organisation PRIMARY KEY (id)
);
ALTER TABLE user_group_organisation ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_organisation ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
ALTER TABLE user_group_organisation ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
ALTER TABLE user_group_organisation ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_organisation ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_organisation_state (
    id BIGSERIAL NOT NULL,
    user_group_organisation_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_ugo_state PRIMARY KEY (id)
);
ALTER TABLE user_group_organisation_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_organisation_state ADD COLUMN IF NOT EXISTS user_group_organisation_id BIGINT;
ALTER TABLE user_group_organisation_state ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE user_group_organisation_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_organisation_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_permission (
    id BIGSERIAL NOT NULL,
    user_group_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_group_permission PRIMARY KEY (id)
);
ALTER TABLE user_group_permission ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_permission ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
ALTER TABLE user_group_permission ADD COLUMN IF NOT EXISTS permission_id BIGINT;
ALTER TABLE user_group_permission ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_permission ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_permission_state (
    id BIGSERIAL NOT NULL,
    user_group_permission_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_ugp_state PRIMARY KEY (id)
);
ALTER TABLE user_group_permission_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_permission_state ADD COLUMN IF NOT EXISTS user_group_permission_id BIGINT;
ALTER TABLE user_group_permission_state ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE user_group_permission_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_permission_state ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_account_latest (
    id BIGSERIAL NOT NULL,
    user_account_id BIGINT NOT NULL,
    personal_code VARCHAR(20) NOT NULL,
    first_name VARCHAR(200) NOT NULL,
    last_name VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(50),
    structural_unit VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    organisation_id BIGINT NOT NULL,
    organisation_name VARCHAR(500) NOT NULL,
    access_start DATE NOT NULL,
    access_end DATE,
    status VARCHAR(50) NOT NULL,
    user_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_account_latest PRIMARY KEY (id)
);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS user_account_id BIGINT;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS personal_code VARCHAR(20);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS first_name VARCHAR(200);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS last_name VARCHAR(200);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS structural_unit VARCHAR(100);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS organisation_name VARCHAR(500);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS access_start DATE;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS access_end DATE;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS user_groups JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_account_latest ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_group_latest (
    id BIGSERIAL NOT NULL,
    user_group_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    organisations JSONB NOT NULL DEFAULT '[]'::jsonb,
    covers_all_organisations BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(100) NOT NULL,
    CONSTRAINT pk_user_group_latest PRIMARY KEY (id)
);
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS user_group_id BIGINT;
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS organisations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS covers_all_organisations BOOLEAN DEFAULT false;
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_group_latest ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uads_user_account') THEN ALTER TABLE user_account_data_state ADD CONSTRAINT fk_uads_user_account FOREIGN KEY (user_account_id) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uads_organisation') THEN ALTER TABLE user_account_data_state ADD CONSTRAINT fk_uads_organisation FOREIGN KEY (organisation_id) REFERENCES organisation (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_account_state_ua') THEN ALTER TABLE user_account_state ADD CONSTRAINT fk_user_account_state_ua FOREIGN KEY (user_account_id) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugns_user_group') THEN ALTER TABLE user_group_name_state ADD CONSTRAINT fk_ugns_user_group FOREIGN KEY (user_group_id) REFERENCES user_group (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uaug_user_account') THEN ALTER TABLE user_account_user_group ADD CONSTRAINT fk_uaug_user_account FOREIGN KEY (user_account_id) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uaug_user_group') THEN ALTER TABLE user_account_user_group ADD CONSTRAINT fk_uaug_user_group FOREIGN KEY (user_group_id) REFERENCES user_group (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uaug_state_uaug') THEN ALTER TABLE user_account_user_group_state ADD CONSTRAINT fk_uaug_state_uaug FOREIGN KEY (user_account_user_group_id) REFERENCES user_account_user_group (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugo_user_group') THEN ALTER TABLE user_group_organisation ADD CONSTRAINT fk_ugo_user_group FOREIGN KEY (user_group_id) REFERENCES user_group (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugo_organisation') THEN ALTER TABLE user_group_organisation ADD CONSTRAINT fk_ugo_organisation FOREIGN KEY (organisation_id) REFERENCES organisation (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugo_state_ugo') THEN ALTER TABLE user_group_organisation_state ADD CONSTRAINT fk_ugo_state_ugo FOREIGN KEY (user_group_organisation_id) REFERENCES user_group_organisation (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugp_user_group') THEN ALTER TABLE user_group_permission ADD CONSTRAINT fk_ugp_user_group FOREIGN KEY (user_group_id) REFERENCES user_group (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugp_permission') THEN ALTER TABLE user_group_permission ADD CONSTRAINT fk_ugp_permission FOREIGN KEY (permission_id) REFERENCES permission (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugp_state_ugp') THEN ALTER TABLE user_group_permission_state ADD CONSTRAINT fk_ugp_state_ugp FOREIGN KEY (user_group_permission_id) REFERENCES user_group_permission (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ual_user_account') THEN ALTER TABLE user_account_latest ADD CONSTRAINT fk_ual_user_account FOREIGN KEY (user_account_id) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ugl_user_group') THEN ALTER TABLE user_group_latest ADD CONSTRAINT fk_ugl_user_group FOREIGN KEY (user_group_id) REFERENCES user_group (id); END IF; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organisation_code ON organisation (code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_account_personal_code ON user_account (personal_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_permission_code ON permission (code);
CREATE INDEX IF NOT EXISTS idx_organisation_name ON organisation (name);
CREATE INDEX IF NOT EXISTS idx_user_account_personal_code ON user_account (personal_code);
CREATE INDEX IF NOT EXISTS idx_uads_user_account_id_created_at ON user_account_data_state (user_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uads_organisation_id ON user_account_data_state (organisation_id);
CREATE INDEX IF NOT EXISTS idx_uads_first_name ON user_account_data_state (first_name);
CREATE INDEX IF NOT EXISTS idx_uads_last_name ON user_account_data_state (last_name);
CREATE INDEX IF NOT EXISTS idx_uads_access_end ON user_account_data_state (access_end);
CREATE INDEX IF NOT EXISTS idx_user_account_state_ua_id ON user_account_state (user_account_id);
CREATE INDEX IF NOT EXISTS idx_user_account_state_created_at ON user_account_state (created_at);
CREATE INDEX IF NOT EXISTS idx_user_account_state_ua_id_created_at ON user_account_state (user_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugns_user_group_id_created_at ON user_group_name_state (user_group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugns_name_lower ON user_group_name_state (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_permission_code ON permission (code);
CREATE INDEX IF NOT EXISTS idx_uaug_user_account_id ON user_account_user_group (user_account_id);
CREATE INDEX IF NOT EXISTS idx_uaug_user_group_id ON user_account_user_group (user_group_id);
CREATE INDEX IF NOT EXISTS idx_uaug_state_uaug_id ON user_account_user_group_state (user_account_user_group_id);
CREATE INDEX IF NOT EXISTS idx_uaug_state_created_at ON user_account_user_group_state (created_at);
CREATE INDEX IF NOT EXISTS idx_uaug_state_uaug_id_created_at ON user_account_user_group_state (user_account_user_group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugo_user_group_id ON user_group_organisation (user_group_id);
CREATE INDEX IF NOT EXISTS idx_ugo_organisation_id ON user_group_organisation (organisation_id);
CREATE INDEX IF NOT EXISTS idx_ugo_state_ugo_id ON user_group_organisation_state (user_group_organisation_id);
CREATE INDEX IF NOT EXISTS idx_ugo_state_created_at ON user_group_organisation_state (created_at);
CREATE INDEX IF NOT EXISTS idx_ugp_user_group_id ON user_group_permission (user_group_id);
CREATE INDEX IF NOT EXISTS idx_ugp_permission_id ON user_group_permission (permission_id);
CREATE INDEX IF NOT EXISTS idx_ugp_state_ugp_id ON user_group_permission_state (user_group_permission_id);
CREATE INDEX IF NOT EXISTS idx_ugp_state_created_at ON user_group_permission_state (created_at);
CREATE INDEX IF NOT EXISTS idx_ual_user_account_id_created_at ON user_account_latest (user_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_first_name_lower ON user_account_latest (LOWER(first_name));
CREATE INDEX IF NOT EXISTS idx_ual_last_name_lower ON user_account_latest (LOWER(last_name));
CREATE INDEX IF NOT EXISTS idx_ual_organisation_id ON user_account_latest (organisation_id);
CREATE INDEX IF NOT EXISTS idx_ual_status ON user_account_latest (status);
CREATE INDEX IF NOT EXISTS idx_ual_user_groups_gin ON user_account_latest USING GIN (user_groups);
CREATE INDEX IF NOT EXISTS idx_ugl_user_group_id_created_at ON user_group_latest (user_group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugl_name_lower ON user_group_latest (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_ugl_organisations_gin ON user_group_latest USING GIN (organisations);
