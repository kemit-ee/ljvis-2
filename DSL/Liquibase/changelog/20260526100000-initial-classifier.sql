-- liquibase formatted sql
-- changeset ljvis:20260526100000 ignore:true

-- 1. classifier
CREATE TABLE ljvis2.classifier (
                            id              BIGSERIAL       NOT NULL,
                            code            VARCHAR(50)     NOT NULL,
                            created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                            created_by      BIGINT          NOT NULL,
                            CONSTRAINT pk_classifier PRIMARY KEY (id),
                            CONSTRAINT uq_classifier_code UNIQUE (code),
                            CONSTRAINT fk_c_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier IS 'Classifier header \u2014 immutable business code. Name and description live in classifier_name_state.';
COMMENT ON COLUMN ljvis2.classifier.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier.code IS 'Stable business code of the classifier (e.g. RTK). Immutable after creation (NFR-SEC-05).';
COMMENT ON COLUMN ljvis2.classifier.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.classifier.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user who created the classifier';

CREATE INDEX idx_classifier_code ON ljvis2.classifier (code);

-- 2. classifier_name_state
CREATE TABLE ljvis2.classifier_name_state (
                                       id              BIGSERIAL       NOT NULL,
                                       classifier_id   BIGINT          NOT NULL,
                                       name            VARCHAR(100)    NOT NULL,
                                       description     VARCHAR(250),
                                       created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                       created_by      BIGINT          NOT NULL,
                                       CONSTRAINT pk_classifier_name_state PRIMARY KEY (id),
                                       CONSTRAINT fk_cns_classifier FOREIGN KEY (classifier_id) REFERENCES ljvis2.classifier (id),
                                       CONSTRAINT fk_cns_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier_name_state IS 'INSERT-only version history of a classifier name and description. Latest row = current.';
COMMENT ON COLUMN ljvis2.classifier_name_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier_name_state.classifier_id IS 'FK to classifier';
COMMENT ON COLUMN ljvis2.classifier_name_state.name IS 'Human-readable classifier name (e.g. "Riikide ja territooriumide klassifikaator"); max 100 characters';
COMMENT ON COLUMN ljvis2.classifier_name_state.description IS 'Free-text explanation of the classifier; optional; max 250 characters';
COMMENT ON COLUMN ljvis2.classifier_name_state.created_at IS 'Row creation timestamp; ordering key for deriving the current version';
COMMENT ON COLUMN ljvis2.classifier_name_state.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user who created this version row';

CREATE INDEX idx_cns_classifier_id_created_at ON ljvis2.classifier_name_state (classifier_id, created_at DESC);
CREATE INDEX idx_cns_name ON ljvis2.classifier_name_state (name);

-- 3. classifier_value
CREATE TABLE ljvis2.classifier_value (
                                  id              BIGSERIAL       NOT NULL,
                                  classifier_id   BIGINT          NOT NULL,
                                  code            VARCHAR(100)    NOT NULL,
                                  name            VARCHAR(500)    NOT NULL,
                                  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                  created_by      BIGINT          NOT NULL,
                                  CONSTRAINT pk_classifier_value PRIMARY KEY (id),
                                  CONSTRAINT fk_cv_classifier FOREIGN KEY (classifier_id) REFERENCES ljvis2.classifier (id),
                                  CONSTRAINT uq_classifier_value_code UNIQUE (classifier_id, code),
                                  CONSTRAINT fk_cv_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier_value IS 'A single value belonging to a classifier. Carries the value''s immutable code and name; validity lives in classifier_value_validity_state.';
COMMENT ON COLUMN ljvis2.classifier_value.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier_value.classifier_id IS 'FK to classifier \u2014 the owning classifier';
COMMENT ON COLUMN ljvis2.classifier_value.code IS 'Business code of the value within the classifier (e.g. EE). Unique per classifier. Immutable (NFR-SEC-05).';
COMMENT ON COLUMN ljvis2.classifier_value.name IS 'Human-readable name of the value (e.g. Eesti). Immutable \u2014 to rename, end the value and add a new one.';
COMMENT ON COLUMN ljvis2.classifier_value.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN ljvis2.classifier_value.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user who created the value';

CREATE INDEX idx_cv_classifier_id ON ljvis2.classifier_value (classifier_id);
CREATE INDEX idx_cv_code ON ljvis2.classifier_value (code);
CREATE INDEX idx_cv_name ON ljvis2.classifier_value (name);

-- 4. classifier_value_validity_state
CREATE TABLE ljvis2.classifier_value_validity_state (
                                                 id                      BIGSERIAL       NOT NULL,
                                                 classifier_value_id     BIGINT          NOT NULL,
                                                 valid_from              DATE            NOT NULL,
                                                 valid_until             DATE,
                                                 created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                                 created_by              BIGINT    NOT NULL,
                                                 CONSTRAINT pk_classifier_value_validity_state PRIMARY KEY (id),
                                                 CONSTRAINT fk_cvvs_value FOREIGN KEY (classifier_value_id) REFERENCES ljvis2.classifier_value (id),
                                                 CONSTRAINT ck_cvvs_period CHECK (valid_until IS NULL OR valid_until > valid_from),
                                                 CONSTRAINT fk_cvvs_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier_value_validity_state IS 'INSERT-only state history of a classifier value''s validity period. Latest row = current validity. Validity changes (ending, extending, re-opening) = INSERT with updated valid_from and/or valid_until.';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.classifier_value_id IS 'FK to classifier_value';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.valid_from IS 'Start date of validity (inclusive)';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.valid_until IS 'End date of validity (exclusive \u2014 value is NOT valid on this date); NULL = no end date / currently open-ended';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.created_at IS 'Row creation timestamp; ordering key for deriving the current validity';
COMMENT ON COLUMN ljvis2.classifier_value_validity_state.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user who created this validity state row';

CREATE INDEX idx_cvvs_value_id_created_at ON ljvis2.classifier_value_validity_state (classifier_value_id, created_at DESC);
CREATE INDEX idx_cvvs_valid_until ON ljvis2.classifier_value_validity_state (valid_until);

-- 5. classifier_latest (INSERT-only denormalized read-optimised snapshot)
CREATE TABLE ljvis2.classifier_latest (
                                   id              BIGSERIAL       NOT NULL,
                                   classifier_id   BIGINT          NOT NULL,
                                   code            VARCHAR(50)     NOT NULL,
                                   name            VARCHAR(100)    NOT NULL,
                                   description     VARCHAR(250),
                                   created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                   created_by      BIGINT          NOT NULL,
                                   CONSTRAINT pk_classifier_latest PRIMARY KEY (id),
                                   CONSTRAINT fk_cl_classifier FOREIGN KEY (classifier_id) REFERENCES ljvis2.classifier (id),
                                   CONSTRAINT fk_cl_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier_latest IS 'INSERT-only denormalized snapshot of the current classifier state for all read views. Latest row per classifier_id (ORDER BY created_at DESC LIMIT 1) gives fully assembled data without sub-queries at read time. Rebuilt by a Ruuter RESQL rebuild endpoint after every write operation that changes classifier data.';
COMMENT ON COLUMN ljvis2.classifier_latest.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier_latest.classifier_id IS 'FK to classifier; identifies which classifier this snapshot belongs to';
COMMENT ON COLUMN ljvis2.classifier_latest.code IS 'Denormalized from classifier.code';
COMMENT ON COLUMN ljvis2.classifier_latest.name IS 'Denormalized from latest classifier_name_state row';
COMMENT ON COLUMN ljvis2.classifier_latest.description IS 'Denormalized from latest classifier_name_state row; NULL = not provided';
COMMENT ON COLUMN ljvis2.classifier_latest.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.classifier_latest.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user whose action triggered this snapshot rebuild';

CREATE INDEX idx_cl_classifier_id_created_at ON ljvis2.classifier_latest (classifier_id, created_at DESC);
CREATE INDEX idx_cl_code ON ljvis2.classifier_latest (code);
CREATE INDEX idx_cl_name_lower ON ljvis2.classifier_latest (LOWER(name));

-- 6. classifier_value_latest (INSERT-only denormalized read-optimised snapshot)
CREATE TABLE ljvis2.classifier_value_latest (
                                         id                  BIGSERIAL       NOT NULL,
                                         classifier_value_id BIGINT          NOT NULL,
                                         classifier_id       BIGINT          NOT NULL,
                                         classifier_code     VARCHAR(50)     NOT NULL,
                                         code                VARCHAR(100)    NOT NULL,
                                         name                VARCHAR(500)    NOT NULL,
                                         valid_from          DATE            NOT NULL,
                                         valid_until         DATE,
                                         is_valid            BOOLEAN         NOT NULL DEFAULT true,
                                         created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                                         created_by          BIGINT    NOT NULL,
                                         CONSTRAINT pk_classifier_value_latest PRIMARY KEY (id),
                                         CONSTRAINT fk_cvl_classifier_value FOREIGN KEY (classifier_value_id) REFERENCES ljvis2.classifier_value (id),
                                         CONSTRAINT fk_cvl_created_by FOREIGN KEY (created_by) REFERENCES ljvis2.user_account (id)
);

COMMENT ON TABLE  ljvis2.classifier_value_latest IS 'INSERT-only denormalized snapshot of the current classifier value state for all read views. Latest row per classifier_value_id (ORDER BY created_at DESC LIMIT 1) gives fully assembled data without sub-queries at read time. Rebuilt by a Ruuter RESQL rebuild endpoint after every write operation that changes value data.';
COMMENT ON COLUMN ljvis2.classifier_value_latest.id IS 'Primary key';
COMMENT ON COLUMN ljvis2.classifier_value_latest.classifier_value_id IS 'FK to classifier_value; identifies which value this snapshot belongs to';
COMMENT ON COLUMN ljvis2.classifier_value_latest.classifier_id IS 'Denormalized from classifier_value.classifier_id; enables filtering values by classifier without sub-query';
COMMENT ON COLUMN ljvis2.classifier_value_latest.classifier_code IS 'Denormalized from classifier.code; enables filtering values by classifier code without sub-query';
COMMENT ON COLUMN ljvis2.classifier_value_latest.code IS 'Denormalized from classifier_value.code';
COMMENT ON COLUMN ljvis2.classifier_value_latest.name IS 'Denormalized from classifier_value.name';
COMMENT ON COLUMN ljvis2.classifier_value_latest.valid_from IS 'Denormalized from latest classifier_value_validity_state row; start date of validity (inclusive)';
COMMENT ON COLUMN ljvis2.classifier_value_latest.valid_until IS 'Denormalized from latest classifier_value_validity_state row; end date of validity (exclusive \u2014 value is NOT valid on this date); NULL = no end date';
COMMENT ON COLUMN ljvis2.classifier_value_latest.is_valid IS 'Computed at snapshot time: valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until > CURRENT_DATE). Stored to avoid re-computation at read time.';
COMMENT ON COLUMN ljvis2.classifier_value_latest.created_at IS 'Row creation timestamp; ordering key for latest-snapshot resolution';
COMMENT ON COLUMN ljvis2.classifier_value_latest.created_by IS 'FK to user_account.id (EPIC 02) \u2014 internal user whose action triggered this snapshot rebuild';

CREATE INDEX idx_cvl_classifier_value_id_created_at ON ljvis2.classifier_value_latest (classifier_value_id, created_at DESC);
CREATE INDEX idx_cvl_classifier_id ON ljvis2.classifier_value_latest (classifier_id);
CREATE INDEX idx_cvl_classifier_code ON ljvis2.classifier_value_latest (classifier_code);
CREATE INDEX idx_cvl_code ON ljvis2.classifier_value_latest (code);
CREATE INDEX idx_cvl_is_valid ON ljvis2.classifier_value_latest (is_valid);