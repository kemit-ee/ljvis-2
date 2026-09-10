-- liquibase formatted sql
-- changeset ljvis:20261116100000 ignore:true splitStatements:false
CREATE SCHEMA IF NOT EXISTS erru;

CREATE SEQUENCE IF NOT EXISTS erru.seq_nu_message_key START 1;
CREATE SEQUENCE IF NOT EXISTS erru.seq_nu_business_case_no START 1;

COMMENT ON SEQUENCE erru.seq_nu_message_key IS 'Allocates the stable logical identity (nu_message_key) of a NU (NotifyUnfitness) sobimatusteade. Consumed once per message, by both directions.';
COMMENT ON SEQUENCE erru.seq_nu_business_case_no IS 'Allocates the running number of the human-readable business_case_id (NU-EE-AAAA-NNNNN) for OUTGOING messages only, mirroring erru.seq_cgr_business_case_no.';
CREATE TABLE erru.nu_message (
    id                              BIGSERIAL       NOT NULL,
    nu_message_key                  BIGINT          NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    direction                       VARCHAR(10)     NOT NULL,
    status                          VARCHAR(20)     NOT NULL,
    business_case_id                VARCHAR(36)     NOT NULL,
    technical_id                    UUID,
    workflow_id                     UUID,
    sent_at                         TIMESTAMPTZ,
    received_at                     TIMESTAMPTZ,
    nu_from                         CHAR(2),
    nu_to                           VARCHAR(2),
    originating_authority           VARCHAR(50),
    request_source                  VARCHAR(30),
    request_purpose                 VARCHAR(30),
    source_good_repute_form_key     BIGINT,
    tm_first_name                   VARCHAR(100),
    tm_family_name                  VARCHAR(100),
    tm_date_of_birth                DATE,
    tm_place_of_birth               VARCHAR(200),
    tm_first_name_search_key        VARCHAR(20),
    tm_family_name_search_key       VARCHAR(20),
    certificate_number              VARCHAR(100),
    certificate_issue_date          DATE,
    certificate_issue_country       CHAR(2),
    unfit_start_date                DATE,
    member_states                   JSONB,
    handler_personal_code           VARCHAR(20),
    handler_name                    VARCHAR(200),
    error_message                   TEXT,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_nu_message PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.nu_message IS 'INSERT-only snapshot of an ERRU NU (NotifyUnfitness / Sobimatusteade) message.';
COMMENT ON COLUMN erru.nu_message.id IS 'Per-row physical primary key. Also serves as the tiebreaker for latest-snapshot resolution (see table comment).';
COMMENT ON COLUMN erru.nu_message.nu_message_key IS 'Stable logical identity of the message (from erru.seq_nu_message_key). All snapshot rows of one message share this value. NOT unique.';
COMMENT ON COLUMN erru.nu_message.version IS 'Snapshot ordinal. Starts at 1; incremented by 1 on every appended snapshot.';
COMMENT ON COLUMN erru.nu_message.direction IS 'outgoing = Estonia notifies other member state(s); incoming = another member state notifies Estonia.';
COMMENT ON COLUMN erru.nu_message.status IS 'Lifecycle status.';
COMMENT ON COLUMN erru.nu_message.business_case_id IS 'ERRU business case identifier, max 36 chars.';
COMMENT ON COLUMN erru.nu_message.technical_id IS 'globalHeaderType/@technicalId. Used for inbound idempotency via uq_nu_inbound_technical_id.';
COMMENT ON COLUMN erru.nu_message.workflow_id IS 'globalHeaderType/@workflowId.';
COMMENT ON COLUMN erru.nu_message.sent_at IS 'globalHeaderType/@sentAt. Set once on the outgoing send transition. Empty on an unsent outgoing draft and on incoming messages.';
COMMENT ON COLUMN erru.nu_message.received_at IS 'Local timestamp of first receipt for an INCOMING message.';
COMMENT ON COLUMN erru.nu_message.nu_from IS 'globalHeaderType/@from (ISO 3166-1 alpha-2).';
COMMENT ON COLUMN erru.nu_message.nu_to IS 'globalHeaderType/@to.';
COMMENT ON COLUMN erru.nu_message.originating_authority IS 'globalBodyRequestType/@originatingAuthority. Value from the COMPETENT_AUTHORITY classifier (shared with CGR/CTUD).';
COMMENT ON COLUMN erru.nu_message.request_source IS 'globalSourcePurposeGroup/@requestSource.';
COMMENT ON COLUMN erru.nu_message.request_purpose IS 'globalSourcePurposeGroup/@requestPurpose.';
COMMENT ON COLUMN erru.nu_message.source_good_repute_form_key IS 'Logical key (forms.good_repute_form.good_repute_form_key) of the local unfitness declaration this outgoing NU is based on.';
COMMENT ON COLUMN erru.nu_message.tm_first_name IS 'Transport manager first name (7A block).';
COMMENT ON COLUMN erru.nu_message.tm_family_name IS 'Transport manager family name (7A block).';
COMMENT ON COLUMN erru.nu_message.tm_date_of_birth IS 'Transport manager date of birth (7A block).';
COMMENT ON COLUMN erru.nu_message.tm_place_of_birth IS 'Transport manager place of birth (7A block). Optional even when the name block is used.';
COMMENT ON COLUMN erru.nu_message.tm_first_name_search_key IS 'NYSIIS phonetic key of tm_first_name, computed server-side via the existing TEMPLATES/erru/cgr/nysiis-key.yml sidecar before the outgoing message is sent.';
COMMENT ON COLUMN erru.nu_message.tm_family_name_search_key IS 'NYSIIS phonetic key of tm_family_name. See tm_first_name_search_key.';
COMMENT ON COLUMN erru.nu_message.certificate_number IS 'Certificate of professional competence number (7B block). XSD choice: this block or the name block (7A) must be complete.';
COMMENT ON COLUMN erru.nu_message.certificate_issue_date IS 'Certificate issue date (7B block).';
COMMENT ON COLUMN erru.nu_message.certificate_issue_country IS 'Certificate issuing country (7B block). Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.nu_message.unfit_start_date IS 'Start of the period of unfitness (globalTransportManagerFitnessStartDateType/@unfitStartDate).';
COMMENT ON COLUMN erru.nu_message.member_states IS 'One entry per responding member state (outgoing only).';
COMMENT ON COLUMN erru.nu_message.handler_personal_code IS 'Personal code of the sending official; empty for incoming messages.';
COMMENT ON COLUMN erru.nu_message.handler_name IS 'Display name of the sending official. See handler_personal_code.';
COMMENT ON COLUMN erru.nu_message.error_message IS 'Diagnostic text for status = error.';
COMMENT ON COLUMN erru.nu_message.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution (see table comment re: id tiebreaker).';
COMMENT ON COLUMN erru.nu_message.created_by IS 'Personal code (isikukood) of the actor, or a system identifier string for automated transitions.';

CREATE INDEX idx_nu_key_ts                ON erru.nu_message (nu_message_key, created_at DESC, id DESC);
CREATE INDEX idx_nu_business_case_id      ON erru.nu_message (business_case_id);
CREATE INDEX idx_nu_status                ON erru.nu_message (status);
CREATE INDEX idx_nu_direction             ON erru.nu_message (direction);
CREATE INDEX idx_nu_technical_id          ON erru.nu_message (technical_id);
CREATE INDEX idx_nu_workflow_id           ON erru.nu_message (workflow_id);
CREATE INDEX idx_nu_sent_at               ON erru.nu_message (sent_at DESC);
CREATE INDEX idx_nu_received_at           ON erru.nu_message (received_at DESC);
CREATE INDEX idx_nu_handler_personal_code ON erru.nu_message (handler_personal_code);
CREATE INDEX idx_nu_tm_first_name         ON erru.nu_message (tm_first_name);
CREATE INDEX idx_nu_tm_family_name        ON erru.nu_message (tm_family_name);
CREATE INDEX idx_nu_source_good_repute_form_key ON erru.nu_message (source_good_repute_form_key);
CREATE INDEX idx_nu_member_states_gin     ON erru.nu_message USING GIN (member_states);

COMMENT ON INDEX erru.idx_nu_key_ts IS 'Serves the latest-snapshot-per-key resolution used by every read path (DISTINCT ON / ORDER BY created_at DESC, id DESC LIMIT 1).';

ALTER TABLE erru.nu_message
    ADD CONSTRAINT chk_nu_direction CHECK (direction IN ('outgoing', 'incoming')),
    ADD CONSTRAINT chk_nu_status CHECK (status IN ('initiated', 'sent', 'received', 'acknowledged', 'error')),
    ADD CONSTRAINT chk_nu_status_matches_direction CHECK (
        status = 'error'
        OR (direction = 'outgoing' AND status IN ('initiated', 'sent'))
        OR (direction = 'incoming' AND status IN ('received', 'acknowledged'))
    ),
    ADD CONSTRAINT chk_nu_business_case_id_not_blank CHECK (btrim(business_case_id) <> ''),
    ADD CONSTRAINT chk_nu_version_positive CHECK (version >= 1),
    ADD CONSTRAINT chk_nu_nu_to_format CHECK (nu_to IS NULL OR nu_to ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT chk_nu_search_choice CHECK (
        (
            COALESCE(btrim(tm_family_name), '') <> ''
            AND COALESCE(btrim(tm_first_name), '') <> ''
            AND tm_date_of_birth IS NOT NULL
        )
        OR
        (
            COALESCE(btrim(certificate_number), '') <> ''
            AND certificate_issue_date IS NOT NULL
            AND COALESCE(btrim(certificate_issue_country), '') <> ''
        )
    );

COMMENT ON CONSTRAINT chk_nu_status_matches_direction ON erru.nu_message IS 'Restricts statuses by message direction.';
COMMENT ON CONSTRAINT chk_nu_search_choice ON erru.nu_message IS 'Requires transport-manager name and birth date, certificate details, or both.';

CREATE UNIQUE INDEX uq_nu_inbound_technical_id
    ON erru.nu_message (technical_id)
    WHERE direction = 'incoming' AND status = 'received';

COMMENT ON INDEX erru.uq_nu_inbound_technical_id IS 'Inbound idempotency.';
