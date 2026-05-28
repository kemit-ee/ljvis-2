-- EPIC 09 guarded schema migration
-- Creates the classifier management schema with guarded DDL so the migration can be rerun safely.
-- Base entities are created first, followed by append-only state tables and latest snapshot tables.
SET search_path TO ljvis2;
CREATE TABLE IF NOT EXISTS classifier (
    id BIGSERIAL NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier PRIMARY KEY (id),
    CONSTRAINT uq_classifier_code UNIQUE (code)
);
ALTER TABLE classifier ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE classifier ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE TABLE IF NOT EXISTS classifier_name_state (
    id BIGSERIAL NOT NULL,
    classifier_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier_name_state PRIMARY KEY (id)
);
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS classifier_id BIGINT;
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS description VARCHAR(250);
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier_name_state ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE TABLE IF NOT EXISTS classifier_value (
    id BIGSERIAL NOT NULL,
    classifier_id BIGINT NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier_value PRIMARY KEY (id)
);
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS classifier_id BIGINT;
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS name VARCHAR(500);
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier_value ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE TABLE IF NOT EXISTS classifier_value_validity_state (
    id BIGSERIAL NOT NULL,
    classifier_value_id BIGINT NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier_value_validity_state PRIMARY KEY (id)
);
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS classifier_value_id BIGINT;
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier_value_validity_state ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE TABLE IF NOT EXISTS classifier_latest (
    id BIGSERIAL NOT NULL,
    classifier_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier_latest PRIMARY KEY (id)
);
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS classifier_id BIGINT;
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS description VARCHAR(250);
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier_latest ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE TABLE IF NOT EXISTS classifier_value_latest (
    id BIGSERIAL NOT NULL,
    classifier_value_id BIGINT NOT NULL,
    classifier_id BIGINT NOT NULL,
    classifier_code VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NOT NULL,
    CONSTRAINT pk_classifier_value_latest PRIMARY KEY (id)
);
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS classifier_value_id BIGINT;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS classifier_id BIGINT;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS classifier_code VARCHAR(50);
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS name VARCHAR(500);
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true;
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classifier_value_latest ADD COLUMN IF NOT EXISTS created_by BIGINT;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_c_created_by') THEN ALTER TABLE classifier ADD CONSTRAINT fk_c_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cns_classifier') THEN ALTER TABLE classifier_name_state ADD CONSTRAINT fk_cns_classifier FOREIGN KEY (classifier_id) REFERENCES classifier (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cns_created_by') THEN ALTER TABLE classifier_name_state ADD CONSTRAINT fk_cns_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cv_classifier') THEN ALTER TABLE classifier_value ADD CONSTRAINT fk_cv_classifier FOREIGN KEY (classifier_id) REFERENCES classifier (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cv_created_by') THEN ALTER TABLE classifier_value ADD CONSTRAINT fk_cv_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_classifier_value_code') THEN ALTER TABLE classifier_value ADD CONSTRAINT uq_classifier_value_code UNIQUE (classifier_id, code); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cvvs_value') THEN ALTER TABLE classifier_value_validity_state ADD CONSTRAINT fk_cvvs_value FOREIGN KEY (classifier_value_id) REFERENCES classifier_value (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cvvs_created_by') THEN ALTER TABLE classifier_value_validity_state ADD CONSTRAINT fk_cvvs_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cvvs_period') THEN ALTER TABLE classifier_value_validity_state ADD CONSTRAINT ck_cvvs_period CHECK (valid_until IS NULL OR valid_until > valid_from); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cl_classifier') THEN ALTER TABLE classifier_latest ADD CONSTRAINT fk_cl_classifier FOREIGN KEY (classifier_id) REFERENCES classifier (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cl_created_by') THEN ALTER TABLE classifier_latest ADD CONSTRAINT fk_cl_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cvl_classifier_value') THEN ALTER TABLE classifier_value_latest ADD CONSTRAINT fk_cvl_classifier_value FOREIGN KEY (classifier_value_id) REFERENCES classifier_value (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cvl_created_by') THEN ALTER TABLE classifier_value_latest ADD CONSTRAINT fk_cvl_created_by FOREIGN KEY (created_by) REFERENCES user_account (id); END IF; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_classifier_code ON classifier (code);
CREATE INDEX IF NOT EXISTS idx_classifier_code ON classifier (code);
CREATE INDEX IF NOT EXISTS idx_cns_classifier_id_created_at ON classifier_name_state (classifier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cns_name ON classifier_name_state (name);
CREATE INDEX IF NOT EXISTS idx_cv_classifier_id ON classifier_value (classifier_id);
CREATE INDEX IF NOT EXISTS idx_cv_code ON classifier_value (code);
CREATE INDEX IF NOT EXISTS idx_cv_name ON classifier_value (name);
CREATE INDEX IF NOT EXISTS idx_cvvs_value_id_created_at ON classifier_value_validity_state (classifier_value_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvvs_valid_until ON classifier_value_validity_state (valid_until);
CREATE INDEX IF NOT EXISTS idx_cl_classifier_id_created_at ON classifier_latest (classifier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cl_code ON classifier_latest (code);
CREATE INDEX IF NOT EXISTS idx_cl_name_lower ON classifier_latest (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_cvl_classifier_value_id_created_at ON classifier_value_latest (classifier_value_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvl_classifier_id ON classifier_value_latest (classifier_id);
CREATE INDEX IF NOT EXISTS idx_cvl_classifier_code ON classifier_value_latest (classifier_code);
CREATE INDEX IF NOT EXISTS idx_cvl_code ON classifier_value_latest (code);
CREATE INDEX IF NOT EXISTS idx_cvl_is_valid ON classifier_value_latest (is_valid);

RESET search_path;
