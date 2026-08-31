-- liquibase formatted sql
-- changeset ljvis:20260801100000 ignore:true
CREATE SCHEMA IF NOT EXISTS erru;

COMMENT ON SCHEMA erru IS 'ERRU (European Registers of Road Transport Undertakings) message exchange. Estonia acts as the national node: it sends messages to other member states and serves inbound requests automatically. One table per message family (ctud_request, and later ncr_message / cgr_request / rsi_message). Every table in this schema is INSERT-only.';

CREATE SEQUENCE IF NOT EXISTS erru.seq_ctud_request_key START 1;
CREATE SEQUENCE IF NOT EXISTS erru.seq_ctud_business_case_no START 1;

COMMENT ON SEQUENCE erru.seq_ctud_request_key IS 'Allocates the stable logical identity (ctud_request_key) of a CTUD request. Consumed once per request, by both directions.';
COMMENT ON SEQUENCE erru.seq_ctud_business_case_no IS 'Allocates the running number of the human-readable business_case_id (CTUD-EE-AAAA-NNNNN) for OUTGOING requests only. Inbound requests carry the sender''s own identifier and do not consume this sequence.';

-- ctud_request (INSERT-only snapshot — one row per request state)
CREATE TABLE erru.ctud_request (
    -- ── Identity & lifecycle ────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    ctud_request_key                BIGINT          NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    direction                       VARCHAR(10)     NOT NULL,
    status                          VARCHAR(20)     NOT NULL,
    -- ── ERRU message envelope (globalHeaderType) ────────────
    business_case_id                VARCHAR(36)     NOT NULL,
    technical_id                    UUID,
    workflow_id                     UUID,
    sent_at                         TIMESTAMPTZ,
    ctud_from                       CHAR(2),
    ctud_to                         CHAR(2),
    -- ── Request body (globalBodyRequestType) ────────────────
    originating_authority           VARCHAR(50),
    request_source                  VARCHAR(30),
    request_purpose                 VARCHAR(30),
    -- ── Searched transport undertaking (>= 2 of 3) ──────────
    transport_undertaking_name      VARCHAR(150),
    community_licence_number        VARCHAR(20),
    vehicle_registration_number     VARCHAR(20),
    vehicle_registration_country    CHAR(2),
    request_all_vehicles            BOOLEAN         NOT NULL DEFAULT false,
    -- ── Response (single target country) ────────────────────
    responding_authority            VARCHAR(50),
    response_status_code            VARCHAR(20),
    response_status_message         TEXT,
    response_content                JSONB,
    -- ── Handling & errors ───────────────────────────────────
    handler_personal_code           VARCHAR(20),
    handler_name                    VARCHAR(200),
    error_message                   TEXT,
    -- ── Audit ───────────────────────────────────────────────
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_ctud_request PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.ctud_request IS 'INSERT-only snapshot of an ERRU CTUD (Check Transport Undertaking Data / Tegevusloa kontroll) request. Serves BOTH directions, distinguished by the direction column. Every state change appends a complete new row carrying the unchanged fields forward. Current state = DISTINCT ON (ctud_request_key) ORDER BY ctud_request_key, created_at DESC. UPDATE and DELETE on this table are forbidden (enforced by the append-only CI lint in .github/workflows/ci.yml and by the fact that every write path is an INSERT .. SELECT). CTUD is a synchronous single-country request/response: there is no acknowledgement state, no broadcast, no per-country resend and no Heartbeat handling.';
COMMENT ON COLUMN erru.ctud_request.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN erru.ctud_request.ctud_request_key IS 'Stable logical identity of the request (from erru.seq_ctud_request_key). All snapshot rows of one request share this value. NOT unique.';
COMMENT ON COLUMN erru.ctud_request.version IS 'Snapshot ordinal. Starts at 1; incremented by 1 on every appended snapshot. Computed server-side as previous version + 1.';
COMMENT ON COLUMN erru.ctud_request.direction IS 'outgoing = Estonia asks another member state; incoming = another member state asks Estonia. Immutable across all snapshots of one request; determines which status chain applies.';
COMMENT ON COLUMN erru.ctud_request.status IS 'Lifecycle status. Outgoing: initiated -> sent -> responded. Incoming: received -> answered. Shared: error. Allowed transitions are enforced in DSL/Resql/ljvis/POST/erru/ctud/append-transition.sql. Estonian display labels live in the CTUD_REQUEST_STATUS classifier, never in this column.';
COMMENT ON COLUMN erru.ctud_request.business_case_id IS 'ERRU business case identifier, max 36 chars (globalBusinessCaseIdType). Outgoing: generated by us as CTUD-EE-AAAA-NNNNN. Incoming: stored verbatim as received from the sending member state, so no uniqueness is enforced here — foreign formats may collide. Logically immutable across snapshots of one request.';
COMMENT ON COLUMN erru.ctud_request.technical_id IS 'globalHeaderType/@technicalId — UUID uniquely identifying an individual ERRU message. Generated by us for outgoing; taken from the header for incoming. Carries no business meaning; used for inbound idempotency via uq_ctud_inbound_technical_id.';
COMMENT ON COLUMN erru.ctud_request.workflow_id IS 'globalHeaderType/@workflowId — UUID generated by the requesting member state and echoed in every message of the workflow. The correlation key between a request and its response.';
COMMENT ON COLUMN erru.ctud_request.sent_at IS 'globalHeaderType/@sentAt. Outgoing: the moment we handed the message to ERRU; empty on an unsent draft. Incoming: the sender''s send time taken from the message header. Default sort key of the request list (descending).';
COMMENT ON COLUMN erru.ctud_request.ctud_from IS 'globalHeaderType/@from — the member state that issued the request (ISO 3166-1 alpha-2). Always EE for outgoing. Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.ctud_request.ctud_to IS 'globalHeaderType/@to — the single target member state. CTUD is always addressed to exactly one country; the CGR broadcast marker ZZ is never stored here. Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.ctud_request.originating_authority IS 'globalBodyRequestType/@originatingAuthority — competent authority that initiated the request (PPA, TI, MTA, ERAA, KLIM, TRAM). Max 50 chars (globalAuthorityIdentifierType).';
COMMENT ON COLUMN erru.ctud_request.request_source IS 'globalSourcePurposeGroup/@requestSource — where the request originated. Value from the CTUD_REQUEST_SOURCE classifier.';
COMMENT ON COLUMN erru.ctud_request.request_purpose IS 'globalSourcePurposeGroup/@requestPurpose — why the request was made (Issue, Control, Heartbeat, Other). Value from the CTUD_REQUEST_PURPOSE classifier. Always stored, including Heartbeat: CTUD does not implement a Heartbeat branch (no liveness probes are served on CTUD), but persisting the value keeps a future branch a pure addition.';
COMMENT ON COLUMN erru.ctud_request.transport_undertaking_name IS 'Searched transport undertaking name. One of three search criteria, at least two of which must be present (chk_ctud_min_two_search_criteria). The literal value "unknown" is rejected (chk_ctud_name_not_unknown).';
COMMENT ON COLUMN erru.ctud_request.community_licence_number IS 'Searched community licence number, or the number of its certified true copy. One of three search criteria. Max 20 chars (globalCommunityLicenceNumberType).';
COMMENT ON COLUMN erru.ctud_request.vehicle_registration_number IS 'Searched vehicle registration number. One of three search criteria. Requires vehicle_registration_country when present (chk_ctud_vehicle_country_required).';
COMMENT ON COLUMN erru.ctud_request.vehicle_registration_country IS 'Registration country of the searched vehicle. Mandatory whenever vehicle_registration_number is filled. Displayed via the COUNTRY classifier.';
COMMENT ON COLUMN erru.ctud_request.request_all_vehicles IS 'Whether the response should list every vehicle managed by the undertaking. When true, a Found response carries response_content.vehicleRegistrations[].';
COMMENT ON COLUMN erru.ctud_request.responding_authority IS 'globalBodyResponseType/@respondingAuthority — competent authority that produced the response. Max 50 chars.';
COMMENT ON COLUMN erru.ctud_request.response_status_code IS 'Single-country response outcome: Found, NotFound, Timeout, NotAvailable (globalSearchResponseStatusCodeType). Found/NotFound are returned by the target country; Timeout and NotAvailable are set by the ERRU Hub and are NOT error conditions — the request still reaches status responded. Estonia as a responder only ever produces Found or NotFound.';
COMMENT ON COLUMN erru.ctud_request.response_status_message IS 'Free-text message clarifying the response outcome; shown only when non-empty.';
COMMENT ON COLUMN erru.ctud_request.response_content IS 'Response payload, present only for response_status_code = Found. JSONB rather than child tables because the data arrives from an external system, is never edited, and the specification addresses it by path (e.g. response_content.communityLicenceDetails[].startDate). Shape: {"transportUndertakingName","legalForm","numberOfEmployees","numberOfVehicles","riskRating","riskBand","searchMethod","address":{"address","postCode","city","country"},"communityLicenceDetails":[{...}],"certifiedTrueCopyDetails":[{...}],"vehicleRegistrations":["..."]}.';
COMMENT ON COLUMN erru.ctud_request.handler_personal_code IS 'Personal code (isikukood) of the official handling the request. Empty for platform-generated requests, which the UI renders as an en dash.';
COMMENT ON COLUMN erru.ctud_request.handler_name IS 'Display name of the handling official. Empty for platform-generated requests.';
COMMENT ON COLUMN erru.ctud_request.error_message IS 'Diagnostic text for status = error (transport failure, ERRU error notification, schema validation failure). Not shown to other member states.';
COMMENT ON COLUMN erru.ctud_request.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN erru.ctud_request.created_by IS 'Personal code (isikukood) of the actor, or a system identifier string for automated transitions. Loose audit reference; no FK.';

CREATE INDEX idx_ctud_key_ts                ON erru.ctud_request (ctud_request_key, created_at DESC);
CREATE INDEX idx_ctud_business_case_id      ON erru.ctud_request (business_case_id);
CREATE INDEX idx_ctud_status                ON erru.ctud_request (status);
CREATE INDEX idx_ctud_direction             ON erru.ctud_request (direction);
CREATE INDEX idx_ctud_technical_id          ON erru.ctud_request (technical_id);
CREATE INDEX idx_ctud_workflow_id           ON erru.ctud_request (workflow_id);
CREATE INDEX idx_ctud_sent_at               ON erru.ctud_request (sent_at DESC);
CREATE INDEX idx_ctud_handler_personal_code ON erru.ctud_request (handler_personal_code);
CREATE INDEX idx_ctud_response_content_gin  ON erru.ctud_request USING GIN (response_content);

COMMENT ON INDEX erru.idx_ctud_key_ts IS 'Serves the latest-snapshot-per-key resolution used by every read path (DISTINCT ON / ORDER BY created_at DESC LIMIT 1).';

ALTER TABLE erru.ctud_request
    ADD CONSTRAINT chk_ctud_direction CHECK (direction IN ('outgoing', 'incoming')),
    ADD CONSTRAINT chk_ctud_status CHECK (status IN ('initiated', 'sent', 'responded', 'received', 'answered', 'error')),
    ADD CONSTRAINT chk_ctud_status_matches_direction CHECK (
        status = 'error'
        OR (direction = 'outgoing' AND status IN ('initiated', 'sent', 'responded'))
        OR (direction = 'incoming' AND status IN ('received', 'answered'))
    ),
    ADD CONSTRAINT chk_ctud_response_status_code CHECK (
        response_status_code IS NULL
        OR response_status_code IN ('Found', 'NotFound', 'Timeout', 'NotAvailable')
    ),
    ADD CONSTRAINT chk_ctud_business_case_id_not_blank CHECK (btrim(business_case_id) <> ''),
    ADD CONSTRAINT chk_ctud_version_positive CHECK (version >= 1),
    ADD CONSTRAINT chk_ctud_min_two_search_criteria CHECK (
        (CASE WHEN COALESCE(btrim(transport_undertaking_name), '') <> '' THEN 1 ELSE 0 END)
      + (CASE WHEN COALESCE(btrim(community_licence_number), '') <> '' THEN 1 ELSE 0 END)
      + (CASE WHEN COALESCE(btrim(vehicle_registration_number), '') <> '' THEN 1 ELSE 0 END) >= 2
    ),
    ADD CONSTRAINT chk_ctud_name_not_unknown CHECK (
        transport_undertaking_name IS NULL
        OR lower(btrim(transport_undertaking_name)) <> 'unknown'
    ),
    ADD CONSTRAINT chk_ctud_vehicle_country_required CHECK (
        COALESCE(btrim(vehicle_registration_number), '') = ''
        OR COALESCE(btrim(vehicle_registration_country), '') <> ''
    );

COMMENT ON CONSTRAINT chk_ctud_status_matches_direction ON erru.ctud_request IS 'Keeps the two status chains from leaking into each other: an outgoing request can never be received/answered and an incoming one can never be initiated/sent/responded. error is shared by both directions.';
COMMENT ON CONSTRAINT chk_ctud_min_two_search_criteria ON erru.ctud_request IS 'ERRU requires at least two of the three search criteria (undertaking name, community licence / true copy number, vehicle registration number). Enforced in the database as defence in depth; the user-facing check lives in TEMPLATES/erru/ctud/validate-ctud-request.yml and applies to inbound requests too.';

CREATE UNIQUE INDEX uq_ctud_inbound_technical_id
    ON erru.ctud_request (technical_id)
    WHERE direction = 'incoming' AND status = 'received';

COMMENT ON INDEX erru.uq_ctud_inbound_technical_id IS 'Inbound idempotency. Partial index: technical_id repeats across later snapshots of the same message (answered, error), but there can be exactly one received row per technical_id. A redelivered ERRU message therefore cannot create a duplicate request — the insert is skipped and the previously produced response is returned. This closes the duplicate-on-replay defect of LJVIS 1.';
