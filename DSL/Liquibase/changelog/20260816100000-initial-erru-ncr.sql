-- liquibase formatted sql
-- changeset ljvis:20260816100000 ignore:true splitStatements:false
--
-- LJVIS2-62: NCR (NotifyCheckResult) elutsükkel — erru.ncr_message
--
-- NCR is the most structurally complex ERRU workflow in this project.  The request carries
-- a Transport Undertaking with a vehicle, a check summary, optional MinorInfringement, and
-- an unbounded list of SeriousInfringement objects, each with its own PenaltiesImposed and
-- PenaltiesRequested sub-lists.  The response carries PenaltiesImposed (answered penalties).
-- All nested structures are stored as JSONB so that the INSERT-only snapshot pattern remains
-- viable without normalising into five child tables.
--
-- State model (LJVIS2-62 spec §4):
--   Outgoing:  initiated → sent → acknowledged → responded
--   Incoming:  received → viewed → { forwarded ⟷ viewed | answer_drafted → answered }
--              answered → forwarded (independent of answering path)
--   Both:      any → error
--   Forwarded is REVERSIBLE: removing the linked foreign_violation_form restores the
--   pre_forwarding_status (viewed or answered).  This is tracked by two columns:
--     - status: current status
--     - pre_forwarding_status: snapshot of status at the moment of forwarding
--
-- UPDATE and DELETE on erru.ncr_message are FORBIDDEN.  Every state change appends a new
-- row carrying all unchanged fields forward.  Current state =
--   DISTINCT ON (ncr_message_key) ORDER BY ncr_message_key, created_at DESC.
--

CREATE SCHEMA IF NOT EXISTS erru;
COMMENT ON SCHEMA erru IS 'ERRU (European Road transport Regulation Union) module — CGR / CTUD / RSI / NCR message tables and sequences.';

CREATE SEQUENCE IF NOT EXISTS erru.seq_ncr_message_key START 1;
CREATE SEQUENCE IF NOT EXISTS erru.seq_ncr_business_case_no START 1;

COMMENT ON SEQUENCE erru.seq_ncr_message_key IS 'Allocates the stable logical identity (ncr_message_key) of an NCR message, shared by all its snapshots. Consumed once per message by both directions (incoming messages use this key after receiving; outgoing messages allocate it on draft create). A new draft after an error still reuses the same ncr_message_key — unlike RSI, NCR error state has an outgoing transition (Viga → Teade saadetud via re-send).';
COMMENT ON SEQUENCE erru.seq_ncr_business_case_no IS 'Running number for the human-readable business_case_id (EE-NCR-AAAA-NNNNN) of OUTGOING messages only. Incoming messages carry the sender''s own identifier and never consume this sequence.';

CREATE TABLE erru.ncr_message (
    -- ── Identity & lifecycle ──────────────────────────────────────────────────────
    id                              BIGSERIAL       NOT NULL,
    ncr_message_key                 BIGINT          NOT NULL,
    version                         INTEGER         NOT NULL DEFAULT 1,
    direction                       VARCHAR(10)     NOT NULL,
    status                          VARCHAR(20)     NOT NULL,
    -- pre_forwarding_status stores the status that was current when the message moved to
    -- 'forwarded'.  When the linked foreign_violation_form is removed, this status is
    -- restored.  NULL for every non-forwarded snapshot and for every status ≠ forwarded.
    pre_forwarding_status           VARCHAR(20),

    -- ── ERRU message envelope (globalHeaderType) ─────────────────────────────────
    business_case_id                VARCHAR(36)     NOT NULL,
    technical_id                    UUID,
    workflow_id                     UUID,
    sent_at                         TIMESTAMPTZ,
    ncr_from                        CHAR(2),
    ncr_to                          CHAR(2),
    originating_authority           VARCHAR(100),
    request_source                  VARCHAR(30),
    request_purpose                 VARCHAR(30),

    -- ── Acknowledgement (arrives after outgoing send, status → acknowledged) ──────
    -- Stores ncrBodyAcknowledgementType attributes for traceability.
    ack_status_code                 VARCHAR(20),
    ack_status_message              TEXT,
    ack_received_at                 TIMESTAMPTZ,

    -- ── Response (statusCode from ncrBodyResponseType, arrives after ack) ─────────
    response_status_code            VARCHAR(20),
    response_status_message         TEXT,

    -- ── Transport undertaking (ncrTransportManagerType, required in request) ──────
    transport_undertaking_name      VARCHAR(400),
    community_licence_number        VARCHAR(50),

    -- ── Vehicle (globalVehicleRegistrationType, required in request) ─────────────
    vehicle_registration_number     VARCHAR(50),
    vehicle_registration_country    CHAR(2),

    -- ── Check summary (ncrCheckResult, required in request) ──────────────────────
    check_result                    VARCHAR(20),    -- Pass / Fail / CleanCheck
    check_date                      DATE,

    -- ── Minor infringement (ncrMinorInfringementType, optional in request) ────────
    -- NULL when the block is absent.  Shape when present:
    --   { "dateOfInfringement": "YYYY-MM-DD", "numberOfInfringements": N }
    minor_infringement              JSONB,

    -- ── Serious infringements (array, optional in request) ────────────────────────
    -- Array of objects.  Each element:
    --   {
    --     "dateOfInfringement":   "YYYY-MM-DD",
    --     "category":             "MSI"|"VSI"|"SI",
    --     "infringementType":     "101" | ... | "952",
    --     "appealPossible":       true | false,
    --     "penaltiesImposed": [                         -- ncrPenaltyImposedRequestType
    --       {
    --         "penaltyImposedIdentifier": N,
    --         "finalDecisionDate":        "YYYY-MM-DD",
    --         "penaltyTypeImposed":       "101"|"102"|"201"|"202"|"203"|"204",
    --         "startDate":                "YYYY-MM-DD"|null,
    --         "endDate":                  "YYYY-MM-DD"|null,
    --         "isExecuted":               "Yes"|"No"|"Unknown",
    --         "notExecutedReason":        "..."|null
    --       }
    --     ],
    --     "penaltiesRequested": [                       -- ncrPenaltyRequestedType, optional
    --       {
    --         "penaltyRequestedIdentifier": N,
    --         "penaltyTypeRequested":       "101"|"102"|"301"...|"307",
    --         "duration":                   N|null
    --       }
    --     ]
    --   }
    serious_infringements           JSONB,

    -- ── Response penalties imposed (from ncrBodyResponseType, optional) ───────────
    -- Arrives with the NCR response from the registration MS.  Shape:
    --   [
    --     {
    --       "penaltyRequestedIdentifier": N,
    --       "authorityImposingPenalty":   "...",
    --       "isImposed":                  true | false,
    --       "penaltyTypeImposed":         "101"|"102"|"301"...|"307",
    --       "startDate":                  "YYYY-MM-DD"|null,
    --       "endDate":                    "YYYY-MM-DD"|null,
    --       "reason":                     "..."|null
    --     }
    --   ]
    -- Present only for outgoing messages in 'responded' state.
    -- For incoming messages the response draft is stored here while status=answer_drafted
    -- and final form once status=answered.
    response_penalties_imposed      JSONB,

    -- ── Forwarding link ───────────────────────────────────────────────────────────
    -- Set when status = 'forwarded'.  References forms.foreign_violation_form
    -- (via foreign_violation_form_key).  When the linked form is removed, this column
    -- is cleared and status reverts to pre_forwarding_status.
    -- Loose BIGINT reference (no FK) — cross-schema, cross-epic, consistent with
    -- the existing erru_message_id pattern in forms.foreign_violation_form.
    linked_foreign_violation_form_key BIGINT,

    -- ── Handling ──────────────────────────────────────────────────────────────────
    handler_personal_code           VARCHAR(20),
    handler_name                    VARCHAR(200),
    error_message                   TEXT,

    -- ── Audit ─────────────────────────────────────────────────────────────────────
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                      VARCHAR(100)    NOT NULL DEFAULT 'system',

    CONSTRAINT pk_ncr_message PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.ncr_message IS 'INSERT-only snapshot of an ERRU NCR (NotifyCheckResult / Kontrollitulemuse teade) message. NCR is a bilateral workflow: an inspecting MS sends a check result (possibly requesting penalties) to the vehicle''s registration MS, which responds with imposed penalty details. Serves BOTH directions (direction column). Every state change appends a complete new row; UPDATE and DELETE are forbidden. Current state = DISTINCT ON (ncr_message_key) ORDER BY ncr_message_key, created_at DESC. The forwarded state is reversible: removing the linked foreign_violation_form restores pre_forwarding_status. (LJVIS2-62)';
COMMENT ON COLUMN erru.ncr_message.id IS 'Per-row physical primary key.';
COMMENT ON COLUMN erru.ncr_message.ncr_message_key IS 'Stable logical identity of the message (from erru.seq_ncr_message_key). All snapshot rows of one message share this value. NOT unique.';
COMMENT ON COLUMN erru.ncr_message.version IS 'Snapshot ordinal. Starts at 1; incremented by 1 on every appended snapshot.';
COMMENT ON COLUMN erru.ncr_message.direction IS 'outgoing = Estonia notifies the vehicle''s registration MS; incoming = another MS notifies Estonia. Immutable across all snapshots.';
COMMENT ON COLUMN erru.ncr_message.status IS 'Lifecycle status. Outgoing: initiated → sent → acknowledged → responded. Incoming: received → viewed → { forwarded ⟷ viewed | answer_drafted → answered }; answered → forwarded. Both: any → error. Error is not terminal for NCR (unlike RSI) — re-sending is allowed. Allowed transitions enforced in append-transition.sql. Display labels in NCR_REQUEST_STATUS classifier.';
COMMENT ON COLUMN erru.ncr_message.pre_forwarding_status IS 'Status that was current immediately before moving to forwarded. NULL on every non-forwarded snapshot. Used to restore status when the linked foreign_violation_form is deleted.';
COMMENT ON COLUMN erru.ncr_message.business_case_id IS 'ERRU business case identifier, max 36 chars. Outgoing: EE-NCR-AAAA-NNNNN. Incoming: stored verbatim as received. Used as the erru_message_id in forms.foreign_violation_form.';
COMMENT ON COLUMN erru.ncr_message.technical_id IS 'globalHeaderType/@technicalId. Used for inbound idempotency (uq_ncr_inbound_technical_id).';
COMMENT ON COLUMN erru.ncr_message.workflow_id IS 'globalHeaderType/@workflowId. Correlation between outgoing request and incoming acknowledgement / response.';
COMMENT ON COLUMN erru.ncr_message.sent_at IS 'globalHeaderType/@sentAt. NULL on an unsent outgoing draft.';
COMMENT ON COLUMN erru.ncr_message.ncr_from IS 'globalHeaderType/@from (ISO 3166-1 alpha-2). Always EE for outgoing.';
COMMENT ON COLUMN erru.ncr_message.ncr_to IS 'globalHeaderType/@to. Single member state — the vehicle registration country.';
COMMENT ON COLUMN erru.ncr_message.originating_authority IS 'globalBodyRequestType/@originatingAuthority. Inspecting authority name.';
COMMENT ON COLUMN erru.ncr_message.request_source IS 'globalSourcePurposeGroup/@requestSource (NCR_REQUEST_SOURCE classifier).';
COMMENT ON COLUMN erru.ncr_message.request_purpose IS 'globalSourcePurposeGroup/@requestPurpose (NCR_REQUEST_PURPOSE classifier). System-assigned constant Control for outgoing.';
COMMENT ON COLUMN erru.ncr_message.ack_status_code IS 'ncrBodyAcknowledgementType/@statusCode: OK / Timeout / NotAvailable. Set when status = acknowledged.';
COMMENT ON COLUMN erru.ncr_message.ack_status_message IS 'ncrBodyAcknowledgementType/@statusMessage. Optional context for the ack status.';
COMMENT ON COLUMN erru.ncr_message.ack_received_at IS 'Timestamp when the acknowledgement was received and stored.';
COMMENT ON COLUMN erru.ncr_message.response_status_code IS 'ncrBodyResponseType/@statusCode: OK / NotFound. NULL until the response arrives (outgoing) or until answered (incoming).';
COMMENT ON COLUMN erru.ncr_message.response_status_message IS 'ncrBodyResponseType/@statusMessage. Optional context.';
COMMENT ON COLUMN erru.ncr_message.transport_undertaking_name IS 'ncrTransportManagerType/@transportUndertakingName. Required in NCR request.';
COMMENT ON COLUMN erru.ncr_message.community_licence_number IS 'ncrTransportManagerType/@communityLicenceNumber. Required in NCR request.';
COMMENT ON COLUMN erru.ncr_message.vehicle_registration_number IS 'globalVehicleRegistrationType vehicle registration number. Required.';
COMMENT ON COLUMN erru.ncr_message.vehicle_registration_country IS 'globalVehicleRegistrationType country. Required. Determines ncr_to for outgoing.';
COMMENT ON COLUMN erru.ncr_message.check_result IS 'ncrCheckResult/@checkResult: Pass / Fail / CleanCheck (NCR_CHECK_RESULT classifier). Required.';
COMMENT ON COLUMN erru.ncr_message.check_date IS 'ncrCheckResult/@dateOfCheck. Required.';
COMMENT ON COLUMN erru.ncr_message.minor_infringement IS 'ncrMinorInfringementType block (optional). Shape: {"dateOfInfringement":"YYYY-MM-DD","numberOfInfringements":N}. NULL when block absent.';
COMMENT ON COLUMN erru.ncr_message.serious_infringements IS 'Array of ncrSeriousInfringementType objects (0..n). Each element includes category, infringementType, appealPossible, penaltiesImposed (what the inspecting MS imposed), penaltiesRequested (what it requests the registration MS to impose). See column DDL comment for full shape.';
COMMENT ON COLUMN erru.ncr_message.response_penalties_imposed IS 'ncrPenaltyImposedResponseType list from the NCR response (outgoing flow) or the composed answer (incoming flow). NULL until responded / answered. Each element: penaltyRequestedIdentifier, authorityImposingPenalty, isImposed, penaltyTypeImposed, startDate, endDate, reason.';
COMMENT ON COLUMN erru.ncr_message.linked_foreign_violation_form_key IS 'foreign_violation_form_key of the forwarded-to form (status=forwarded). Loose BIGINT reference (no FK — cross-schema, cross-epic). Cleared when the form is deleted, returning status to pre_forwarding_status.';
COMMENT ON COLUMN erru.ncr_message.handler_personal_code IS 'Personal code (isikukood) of the official handling the message. NULL for platform-generated / inbound-received rows.';
COMMENT ON COLUMN erru.ncr_message.handler_name IS 'Display name of the handling official.';
COMMENT ON COLUMN erru.ncr_message.error_message IS 'Diagnostic text when status = error.';
COMMENT ON COLUMN erru.ncr_message.created_at IS 'Snapshot creation timestamp; ordering key for latest-row resolution.';
COMMENT ON COLUMN erru.ncr_message.created_by IS 'Personal code (isikukood) of the actor, or system identifier for automated transitions.';

-- ── Indexes ───────────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_ncr_key_ts                     ON erru.ncr_message (ncr_message_key, created_at DESC);
CREATE INDEX idx_ncr_business_case_id           ON erru.ncr_message (business_case_id);
CREATE INDEX idx_ncr_status                     ON erru.ncr_message (status);
CREATE INDEX idx_ncr_direction                  ON erru.ncr_message (direction);
CREATE INDEX idx_ncr_technical_id               ON erru.ncr_message (technical_id);
CREATE INDEX idx_ncr_workflow_id                ON erru.ncr_message (workflow_id);
CREATE INDEX idx_ncr_sent_at                    ON erru.ncr_message (sent_at DESC);
CREATE INDEX idx_ncr_handler_personal_code      ON erru.ncr_message (handler_personal_code);
CREATE INDEX idx_ncr_vehicle_reg_number         ON erru.ncr_message (vehicle_registration_number);
CREATE INDEX idx_ncr_community_licence_number   ON erru.ncr_message (community_licence_number);
CREATE INDEX idx_ncr_linked_fvf_key             ON erru.ncr_message (linked_foreign_violation_form_key);
CREATE INDEX idx_ncr_serious_infringements_gin  ON erru.ncr_message USING GIN (serious_infringements);

COMMENT ON INDEX erru.idx_ncr_key_ts IS 'Serves the latest-snapshot-per-key resolution (DISTINCT ON / ORDER BY created_at DESC LIMIT 1) used by every read path.';
COMMENT ON INDEX erru.idx_ncr_technical_id IS 'Inbound idempotency lookup — see uq_ncr_inbound_technical_id.';
COMMENT ON INDEX erru.idx_ncr_linked_fvf_key IS 'Supports the "FVF removed → NCR status reversal" query (find NCR message by linked form key).';
COMMENT ON INDEX erru.idx_ncr_serious_infringements_gin IS 'Supports future searches by infringement type or category without a full table scan.';

-- ── Constraints ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE erru.ncr_message
    ADD CONSTRAINT chk_ncr_version_positive
        CHECK (version >= 1),
    ADD CONSTRAINT chk_ncr_direction
        CHECK (direction IN ('outgoing', 'incoming')),
    ADD CONSTRAINT chk_ncr_status
        CHECK (status IN ('initiated', 'sent', 'acknowledged', 'responded',
                          'received', 'viewed', 'answer_drafted', 'forwarded', 'answered',
                          'error')),
    ADD CONSTRAINT chk_ncr_pre_forwarding_status
        CHECK (pre_forwarding_status IS NULL OR
               pre_forwarding_status IN ('viewed', 'answered')),
    ADD CONSTRAINT chk_ncr_check_result
        CHECK (check_result IS NULL OR check_result IN ('Pass', 'Fail', 'CleanCheck')),
    ADD CONSTRAINT chk_ncr_ack_status_code
        CHECK (ack_status_code IS NULL OR ack_status_code IN ('OK', 'Timeout', 'NotAvailable')),
    ADD CONSTRAINT chk_ncr_response_status_code
        CHECK (response_status_code IS NULL OR response_status_code IN ('OK', 'NotFound'));

-- Inbound idempotency: one received row per unique technical_id (first snapshot only).
-- Later snapshots (viewed, forwarded, answered, error) carry the same technical_id;
-- the partial index restricts uniqueness to the 'received' row, which is the entry point.
-- Heartbeat probes are never stored (handled and discarded in inbound-request.yml).
CREATE UNIQUE INDEX uq_ncr_inbound_technical_id
    ON erru.ncr_message (technical_id)
    WHERE status = 'received' AND direction = 'incoming';

COMMENT ON INDEX erru.uq_ncr_inbound_technical_id IS 'Inbound idempotency. Restricts uniqueness to the first received snapshot per technical_id. A redelivered NCR message cannot create a duplicate entry.';
