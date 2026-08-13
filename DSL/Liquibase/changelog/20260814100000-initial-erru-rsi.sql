-- liquibase formatted sql
-- changeset ljvis:20260814100000 ignore:true
-- Schema erru already exists (created by 20260801100000-initial-erru-ctud.sql).
CREATE SCHEMA IF NOT EXISTS erru;

CREATE SEQUENCE IF NOT EXISTS erru.seq_rsi_message_key START 1;
CREATE SEQUENCE IF NOT EXISTS erru.seq_rsi_business_case_no START 1;

COMMENT ON SEQUENCE erru.seq_rsi_message_key IS 'Allocates the stable logical identity (rsi_message_key) of an RSI message. Consumed once per message, by both directions. A retry of a failed (error) outgoing message allocates a NEW key — error has no outgoing transition, per LJVIS2-146.';
COMMENT ON SEQUENCE erru.seq_rsi_business_case_no IS 'Allocates the running number of the human-readable business_case_id (EE-RSI-AAAA-NNNNN) for OUTGOING messages only. Inbound messages carry the sender''s own identifier and do not consume this sequence.';

-- rsi_message (INSERT-only snapshot — one row per message state)
CREATE TABLE erru.rsi_message (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    rsi_message_key                 BIGINT          NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    direction                       VARCHAR(10)     NOT NULL,
    status                          VARCHAR(20)     NOT NULL,
    -- ── ERRU message envelope (globalHeaderType) ────────────
    business_case_id                VARCHAR(36)     NOT NULL,
    technical_id                    UUID,
    workflow_id                     UUID,
    sent_at                         TIMESTAMPTZ,
    rsi_from                        CHAR(2),
    rsi_to                          CHAR(2),
    originating_authority           VARCHAR(100),
    request_source                  VARCHAR(30),
    request_purpose                 VARCHAR(30),
    -- ── Vehicle ──────────────────────────────────────────────
    vehicle_category                VARCHAR(10),
    vehicle_registration_number     VARCHAR(50),
    vehicle_registration_country    CHAR(2),
    vehicle_identification_number   VARCHAR(20),
    odometer_reading                INTEGER,
    -- ── Driver (optional block) ──────────────────────────────
    driver_first_name               VARCHAR(100),
    driver_family_name              VARCHAR(100),
    driver_licence_number           VARCHAR(20),
    driver_licence_country          CHAR(2),
    -- ── Transport undertaking / owner (optional choice block) ─
    identification_details          JSONB,
    -- ── Inspection ────────────────────────────────────────────
    inspection_identifier           VARCHAR(50),
    inspection_location             VARCHAR(200),
    inspection_datetime             TIMESTAMPTZ,
    inspection_authority_or_name    VARCHAR(100),
    inspection_passed               BOOLEAN,
    pti_requested                   BOOLEAN,
    vehicle_prohibition_or_restriction BOOLEAN,
    -- ── Checked items (national form until sent, then ERRU codes) ──
    checked_items                   JSONB,
    -- ── Response — single member state, arrives asynchronously ──
    response_status_code            VARCHAR(20),
    response_status_message         TEXT,
    -- ── Handling & errors ───────────────────────────────────
    handler_personal_code           VARCHAR(20),
    handler_name                    VARCHAR(200),
    error_message                   TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_rsi_message PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.rsi_message IS 'INSERT-only snapshot of an ERRU RSI (RoadSideInspection / Tehnokontrolli teade) message. Serves BOTH directions, distinguished by the direction column. Every state change appends a complete new row carrying the unchanged fields forward. Current state = DISTINCT ON (rsi_message_key) ORDER BY rsi_message_key, created_at DESC. UPDATE and DELETE on this table are forbidden. Unlike CGR/CTUD, RSI is a single-country ASYNCHRONOUS exchange: the outgoing send only reaches "sent" — the response arrives later as a separately correlated message (workflow_id) and is stored in a second append. error has no outgoing transition (LJVIS2-146): a failed outgoing message is not retried, a brand-new message with a new rsi_message_key is composed instead.';
COMMENT ON COLUMN erru.rsi_message.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN erru.rsi_message.rsi_message_key IS 'Stable logical identity of the message (from erru.seq_rsi_message_key). All snapshot rows of one message share this value. NOT unique. A retry after error allocates a brand-new key.';
COMMENT ON COLUMN erru.rsi_message.version IS 'Snapshot ordinal. Starts at 1; incremented by 1 on every appended snapshot.';
COMMENT ON COLUMN erru.rsi_message.direction IS 'outgoing = Estonia notifies the vehicle''s registration member state; incoming = another member state notifies Estonia. Immutable across all snapshots of one message; determines which status chain applies.';
COMMENT ON COLUMN erru.rsi_message.status IS 'Lifecycle status. Outgoing: initiated -> sent -> responded. Incoming: received -> answered. Shared: error (terminal, no outgoing transition). Allowed transitions enforced in DSL/Resql/ljvis/POST/erru/rsi/append-transition.sql. Estonian display labels live in the RSI_REQUEST_STATUS classifier, never in this column.';
COMMENT ON COLUMN erru.rsi_message.business_case_id IS 'ERRU business case identifier, max 36 chars. Outgoing: generated by us as EE-RSI-AAAA-NNNNN. Incoming: stored verbatim as received.';
COMMENT ON COLUMN erru.rsi_message.technical_id IS 'globalHeaderType/@technicalId. Used for inbound idempotency via uq_rsi_inbound_technical_id.';
COMMENT ON COLUMN erru.rsi_message.workflow_id IS 'globalHeaderType/@workflowId. Correlation key between an outgoing message and its separately-arriving response (RSI is asynchronous — see inbound-response.yml).';
COMMENT ON COLUMN erru.rsi_message.sent_at IS 'globalHeaderType/@sentAt. Empty on an unsent outgoing draft.';
COMMENT ON COLUMN erru.rsi_message.rsi_from IS 'globalHeaderType/@from (ISO 3166-1 alpha-2). Always EE for outgoing. Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.rsi_message.rsi_to IS 'globalHeaderType/@to. Always a single member state (ISO 3166-1 alpha-2) — RSI has no broadcast marker, unlike CGR''s ZZ. Derived from vehicle_registration_country.';
COMMENT ON COLUMN erru.rsi_message.originating_authority IS 'globalBodyRequestType/@originatingAuthority. Free text, the inspecting authority/unit name — RSI does not use the COMPETENT_AUTHORITY classifier (LJVIS2-147 §Plokk "Teate andmed").';
COMMENT ON COLUMN erru.rsi_message.request_source IS 'globalSourcePurposeGroup/@requestSource. System-assigned constant (RSI) — see RSI_REQUEST_SOURCE classifier.';
COMMENT ON COLUMN erru.rsi_message.request_purpose IS 'globalSourcePurposeGroup/@requestPurpose. System-assigned constant (Control) — see RSI_REQUEST_PURPOSE classifier. RSI has no Heartbeat handling at all (LJVIS2-146 §Testimine).';
COMMENT ON COLUMN erru.rsi_message.vehicle_category IS 'rsiVehicleCategoryType (M1-3/N1-3/L1e-7e/O1-4/R/S/T...). Value from the RSI_VEHICLE_CATEGORY classifier. NULL when the national vehicle category has no ERRU equivalent — left for manual selection (LJVIS2-148 §4.1).';
COMMENT ON COLUMN erru.rsi_message.vehicle_registration_number IS 'Checked vehicle''s registration number.';
COMMENT ON COLUMN erru.rsi_message.vehicle_registration_country IS 'Checked vehicle''s registration country. Determines rsi_to for outgoing messages. Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.rsi_message.vehicle_identification_number IS 'VIN / chassis number. Optional.';
COMMENT ON COLUMN erru.rsi_message.odometer_reading IS 'Odometer reading at inspection time. Non-negative integer, optional.';
COMMENT ON COLUMN erru.rsi_message.driver_first_name IS 'Optional "Juhi andmed" block — NULL (not empty string) when the block was not opened on the form, per LJVIS2-147.';
COMMENT ON COLUMN erru.rsi_message.driver_family_name IS 'See driver_first_name.';
COMMENT ON COLUMN erru.rsi_message.driver_licence_number IS 'Optional even when the driver block is open.';
COMMENT ON COLUMN erru.rsi_message.driver_licence_country IS 'Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.rsi_message.identification_details IS 'Optional "Veoettevõtja või omaniku andmed" choice block. NULL when not opened. Shape: {"isVehicleHolder":"transport_undertaking"|"owner","isNaturalPerson":"company"|"natural_person" (owner only),"transportUndertakingName","communityLicenceNumber" (transport_undertaking),"companyName" (owner+company),"firstName","familyName" (owner+natural_person),"registrationCertificate","address":{"address","city","country","postCode"}}. See chk_rsi_identification_choice.';
COMMENT ON COLUMN erru.rsi_message.inspection_identifier IS 'Inspecting member state''s own inspection serial number. Optional.';
COMMENT ON COLUMN erru.rsi_message.inspection_location IS 'Coordinates, municipality or locality of the inspection.';
COMMENT ON COLUMN erru.rsi_message.inspection_datetime IS 'Combined inspection date+time, merged on save from the form''s separate date/time fields.';
COMMENT ON COLUMN erru.rsi_message.inspection_authority_or_name IS 'Inspecting authority or officer name.';
COMMENT ON COLUMN erru.rsi_message.inspection_passed IS 'Outgoing messages are always false — RSI notifies only negative results (LJVIS2-147). NULL only until first save.';
COMMENT ON COLUMN erru.rsi_message.pti_requested IS 'true = a periodic technical inspection (PTI) was requested as a result of the check.';
COMMENT ON COLUMN erru.rsi_message.vehicle_prohibition_or_restriction IS 'true = a prohibition or restriction on the vehicle''s circulation was imposed.';
COMMENT ON COLUMN erru.rsi_message.checked_items IS 'Array of checked TECHNICAL_CHECK-classifier parts. National shape until sent: [{"partCode","status":"not_checked"|"checked"|"non_compliant","defects":[{"defectCode","severity":"VO"|"OV"|"EOV"}]}]. CAA_10 is never present (no ERRU equivalent). Converted to ERRU rsiCheckedItemType codes only at send time (see POST/v1/erru/rsi/request/send.yml); incoming messages keep the ERRU shape as received, with no back-conversion (LJVIS2-147).';
COMMENT ON COLUMN erru.rsi_message.response_status_code IS 'OK (vehicle found in the registration country''s register) or NotFound. Single member state, single vehicle — unlike CGR''s member_states array. NULL until the separately-arriving response is stored (outgoing) or until answered (incoming, always set together with status=answered).';
COMMENT ON COLUMN erru.rsi_message.response_status_message IS 'Optional free-text detail accompanying response_status_code.';
COMMENT ON COLUMN erru.rsi_message.handler_personal_code IS 'Personal code (isikukood) of the official handling the message. Empty for platform-generated / inbound-served messages.';
COMMENT ON COLUMN erru.rsi_message.handler_name IS 'Display name of the handling official.';
COMMENT ON COLUMN erru.rsi_message.error_message IS 'Diagnostic text for status = error.';
COMMENT ON COLUMN erru.rsi_message.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN erru.rsi_message.created_by IS 'Personal code (isikukood) of the actor, or a system identifier string for automated transitions.';

CREATE INDEX idx_rsi_key_ts                ON erru.rsi_message (rsi_message_key, created_at DESC);
CREATE INDEX idx_rsi_business_case_id      ON erru.rsi_message (business_case_id);
CREATE INDEX idx_rsi_status                ON erru.rsi_message (status);
CREATE INDEX idx_rsi_direction             ON erru.rsi_message (direction);
CREATE INDEX idx_rsi_technical_id          ON erru.rsi_message (technical_id);
CREATE INDEX idx_rsi_workflow_id           ON erru.rsi_message (workflow_id);
CREATE INDEX idx_rsi_sent_at               ON erru.rsi_message (sent_at DESC);
CREATE INDEX idx_rsi_handler_personal_code ON erru.rsi_message (handler_personal_code);
CREATE INDEX idx_rsi_vehicle_reg_number    ON erru.rsi_message (vehicle_registration_number);
CREATE INDEX idx_rsi_checked_items_gin     ON erru.rsi_message USING GIN (checked_items);

COMMENT ON INDEX erru.idx_rsi_key_ts IS 'Serves the latest-snapshot-per-key resolution used by every read path (DISTINCT ON / ORDER BY created_at DESC LIMIT 1).';

ALTER TABLE erru.rsi_message
    ADD CONSTRAINT chk_rsi_direction CHECK (direction IN ('outgoing', 'incoming')),
    ADD CONSTRAINT chk_rsi_status CHECK (status IN ('initiated', 'sent', 'responded', 'received', 'answered', 'error')),
    ADD CONSTRAINT chk_rsi_status_matches_direction CHECK (
        status = 'error'
        OR (direction = 'outgoing' AND status IN ('initiated', 'sent', 'responded'))
        OR (direction = 'incoming' AND status IN ('received', 'answered'))
    ),
    ADD CONSTRAINT chk_rsi_business_case_id_not_blank CHECK (btrim(business_case_id) <> ''),
    ADD CONSTRAINT chk_rsi_version_positive CHECK (version >= 1),
    ADD CONSTRAINT chk_rsi_rsi_to_format CHECK (rsi_to IS NULL OR rsi_to ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT chk_rsi_identification_choice CHECK (
        identification_details IS NULL
        OR (identification_details ->> 'isVehicleHolder') IN ('transport_undertaking', 'owner')
    );

COMMENT ON CONSTRAINT chk_rsi_status_matches_direction ON erru.rsi_message IS 'Keeps the two status chains from leaking into each other: an outgoing message can never be received/answered and an incoming one can never be initiated/sent/responded. error is shared by both directions and has no outgoing transition of its own (enforced in append-transition.sql''s whitelist, not here).';
COMMENT ON CONSTRAINT chk_rsi_identification_choice ON erru.rsi_message IS 'Defence in depth for the "Veoettevõtja või omaniku andmed" radio discriminator — the user-facing check (required sub-fields per radio value) lives in TEMPLATES/erru/rsi/validate-rsi-message.yml.';

CREATE UNIQUE INDEX uq_rsi_inbound_technical_id
    ON erru.rsi_message (technical_id)
    WHERE direction = 'incoming' AND status = 'received';

COMMENT ON INDEX erru.uq_rsi_inbound_technical_id IS 'Inbound idempotency. Partial index: technical_id repeats across later snapshots of the same message (answered, error), but there can be exactly one received row per technical_id. A redelivered ERRU message therefore cannot create a duplicate message.';

CREATE UNIQUE INDEX uq_rsi_outbound_response_workflow_id
    ON erru.rsi_message (workflow_id)
    WHERE direction = 'outgoing' AND status = 'responded';

COMMENT ON INDEX erru.uq_rsi_outbound_response_workflow_id IS 'Working hypothesis for the open question O-RSI-1 (.ai/erru-full-plan.md §16): the specification does not explicitly describe duplicate-response behaviour for RSI, unlike CTUD/CGR technical_id or NCR. Modelled the same way as inbound idempotency — a second separately-arriving response correlated to the same workflow_id must not append a second "responded" snapshot. inbound-response.yml detects the resulting empty insert and treats it as an already-answered duplicate (logged, not re-applied).';
