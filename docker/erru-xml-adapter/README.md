# ERRU XML adapter

Receives the five ERRU 3.5 request types as XML over asynchronous HTTP. The adapter validates and
persists the request, calls the corresponding Ruuter.internal JSON flow, validates the XML answer,
and delivers it through a durable outbox. It also sends the outgoing RSI, CGR and CTUD requests as
XML and ingests their asynchronous responses (see [Outgoing RSI](#outgoing-rsi) and
[Outgoing CGR and CTUD](#outgoing-cgr-and-ctud)). See [architecture](../../docs/architecture/erru-async-xml.md)
and the [recovery procedure](../../docs/integrations/erru-xml-recovery.md).

## Processing and response deadlines

`POST /erru/xml` returns 202 only after committing the original UTF-8 XML and its digest. Exact
redelivery returns the same inbox row; reuse of a technicalId with different bytes returns 409.
An exact redelivery can revive a failed inbox. It does not rerun a completed inbox or silently reset
a failed outbox.

The response deadline is `Header/@timeoutValue`, or a local ten-second response window when omitted.
The latter is the development default pending confirmation of the national receiving profile.
The Ruuter call and response retries reserve two seconds for XML generation and delivery. A retry
is scheduled within this window only if its delay, at least one second of processing and the
response margin fit. Delivery has its own HTTP timeout capped by the remaining deadline.

**Notification processing and response delivery are independent.** NU/NCR/RSI continue processing
after the response window expires. A technical failure can produce an ErrorNotification while the
inbox remains retryable; exhausting the processing attempts leaves it `failed`, with the original
XML and diagnostic available for recovery. Creating an EN does not complete an unfinished
notification. A successful business answer or explicit business rejection concludes processing.

Each inbox has at most one immutable outbox row. If an EN was already queued, later business recovery
completes the inbox without replacing the EN or emitting a second answer. An expired outbox is not
sent, even if its business operation subsequently succeeds.

There is one processing thread per message type and two delivery threads. Slow CGR/CTUD lookups do
not consume the NU/NCR/RSI processing threads. Every worker has a distinct claim owner; SQL writes
check the lease before committing an outcome. LISTEN/NOTIFY wakes the workers; polling recovers
missed notifications. No DB transaction stays open across an HTTP call.

## Business results and recovery

- NU stores the notification and ACK atomically. Redelivery restores its application notification
  and audit if they were interrupted.
- NCR always resumes its idempotent application notification (`ncr_violation` for `Fail`,
  `ncr_ok` for `Pass`/`CleanCheck`) and audit before ACK.
- RSI persists `rsi_received` before a new or resumed registry lookup, and restores the notification
  on answered replay as well. RSI resumes a `received` lookup. Only a saved `answered` result is replayed; a registry outage is
  HTTP 502, never `NotFound`. Concurrent resumes create one answered snapshot and one audit event.
- CGR searches the local UNFIT register before MTR. If the local search finds nothing and the valid
  7A-only/7B-only criteria cannot satisfy MTR's full-identification API, the flow returns
  `ServerError` and the adapter sends an EN. It does not claim `NotFound` or mark the search answered.
  Supporting those searches in MTR remains an integration capability decision.
- NU/NCR/RSI audit writes use `erru.record_inbound_audit`: a stable deduplication key per event type
  and logical message key in `erru.inbound_audit_key`, with a transaction advisory lock before insertion.
  The audit event itself uses `audit.generate_ulid()`; both records commit atomically. Duplicate attempts
  do not run the audit hash-chain trigger. Ordinary audit callers use the same database generator; allocation is serialised with the chain.

## XML contract

All answers use the configured **single `HUB_RESPONSE_URL`**. The `.dll` suffix in the documented
Hub URL is part of its HTTP endpoint; the Java service does not load a DLL.

Business statuses are `OK`, `Found` or `NotFound`, as applicable. `NotAvailable` and `Timeout` are
Hub-reserved statuses on ordinary answers. An explicit `InvalidData` rejection becomes an EN with
that code; an unavailable register or a mapping failure becomes EN `ServerError`. EN addresses
`EU`, preserves workflowId and includes the original XML as text. Diagnostic details remain in
logs/last_error; the generated EN message contains only a generic explanation and inbox id.

Outgoing XML passes XSD validation and semantic checks: Found requires records, body/member-state
identity matches the sender and Unfit has an end date. CGR aggregate counts are preserved without
requiring equality to the returned list: the totals rule in §6.4 is labelled CTUD and needs clarification.
The adapter also checks correlation and preserves the complete CGR/CTUD search subtree. XSD boolean
values `true`/`false`/`1`/`0` accept surrounding whitespace; non-integral numeric values are rejected
instead of truncated.

CTUD translates existing classifier codes to XSD labels:

| Classifier | XML value |
|---|---|
| CommunityLicencePassenger | Community licence for passenger transport |
| NationalLicencePassenger | National licence for passenger transport |
| CommunityLicenceGoods | Community licence for goods transport |
| CommunityLicenceGoodsLight | Community licence for goods transport, exclusively ≤3.5 t |
| NationalLicenceGoods | National licence for goods transport |

Missing required licence/status/address data causes an EN; it is never replaced with invented data.
RSI identification details use the existing `chk_rsi_identification_choice` JSON shape. Its incoming
inspection fields are persisted, although the detail UI does not display all of them yet.

## Configuration

| Variable | Meaning/default |
|---|---|
| DB_URL / DB_USER / DB_PASSWORD | Required JDBC connection |
| RUUTER_INTERNAL_BASE_URL | Required internal business service URL |
| INTERNAL_COMMUNICATION_KEY | Required shared service token, sent as `x-internal-service-token` on every ruuter-internal call (same value as `INTERNAL_COMMUNICATION_KEY` in constants.ini) |
| HUB_RESPONSE_URL | Required full URL for every answer and EN |
| HUB_RSI_REQUEST_URL / HUB_CGR_REQUEST_URL / HUB_CTUD_REQUEST_URL | Optional Hub URL for outgoing RSI / CGR / CTUD. A missing URL disables that type (503), the adapter never guesses a Hub |
| CONTRACTS_DIR | Required directory containing ERRU 3.5 XSDs |
| MEMBER_STATE_CODE | Required local member state, EE in local compose |
| RESPONDING_AUTHORITY | Required NU authority |
| RESPONDING_AUTHORITY_CTUD | Required CTUD fallback authority; a supplied flow value takes precedence |
| RESPONDING_AUTHORITY_RSI / RESPONDING_AUTHORITY_NCR | Required RSI/NCR authorities |
| PORT | 8080 |
| POLL_INTERVAL_MS | 1000 |
| LEASE_MS | 150000, must exceed a single business call |
| PROCESSING_MAX_ATTEMPTS | 4; recovery delays 5/15/45 seconds outside the response window |
| DELIVERY_MAX_ATTEMPTS | 8, additionally bounded by response deadline |
| WORKER_ID | Optional process identity in startup diagnostics; claims have distinct generated worker ids |

Ingress rejects malformed/invalid XML and DOCTYPE with 400, oversized input (over 2 MiB) with 413,
and an unsupported processing type with 501. `GET /health` checks DB access and all worker threads.

## Verification

The Docker build compiles the sources and runs `MapperSmokeTest`, including all five mappers, EN,
semantic constraints and deadline calculations. Build output is generated inside the image; local
`.class`/`out` files are ignored by Git.

`bash tests/postman/run-all.sh tests/postman/ci-stack-environment.json` recreates the **isolated CI
stack and its volumes**, applies the schema, and runs the collections plus
`tests/erru-adapter/test_regression.py`. The latter checks expired notifications, crash recovery,
concurrent repeats, the audit chain, register failures, partial CGR identification, slow MTR/Hub,
manual requeue, recipient validation, XML echo and booleans.

The Hub mock performs actual XSD/semantic validation and exact route matching. Tests retrieve a
response with `/_test/workflow/{workflowId}`; `/_test/last` remains only a diagnostic convenience.
The local MTR mock recognises `EE-CPC-SLOW` for a delayed lookup. The Hub mock's fixed
`?delayMs=12000` scenario simulates a slow delivery acknowledgement. Neither is a production service.

## Before a real Hub connection

Confirm the national async/sync profile, endpoints, topology/mTLS termination and authorities.
Local compose exposes unauthenticated ingress only on loopback; it is not production peer trust.
Production also needs scoped DB credentials, secret management, operational alerts, retention of
raw XML and realistic load verification. Receiving asynchronous ErrorNotifications from the Hub is
not implemented by this request ingress. The small hand-written JSON codec and JDK HTTP server
remain; their replacement is not required for the local correctness fixes.

## Outgoing RSI

Ruuter calls `POST /internal/rsi/validate` before reserving a send. This internal endpoint
validates the complete draft against `RoadSideInspection_Request.xsd`. It does not send XML.
A validation error leaves the draft editable. VIN, odometer, driver and holder or undertaking
fields must satisfy the XSD. The adapter does not fill missing business data with placeholders.

Ruuter then calls `erru/rsi/begin-send`. The database serializes the reservation and stores
`sending`, `technicalId`, `workflowId` and `sentAt` before network I/O. Stale saves and concurrent
send reservations cannot overwrite that snapshot.

Ruuter calls `POST /internal/rsi/send` with the reserved envelope and the draft data. Both internal
endpoints require `x-internal-service-token`. The adapter builds and validates ERRU 3.5 XML.
It reserves a row in `erru.xml_rsi_dispatch` before sending to `HUB_RSI_REQUEST_URL`.
Only a Hub HTTP 202 produces `status=accepted`. The adapter returns JSON to the original Ruuter
call; no separate callback is needed for this HTTP acceptance. The Hub request timeout is 15 seconds.
Ruuter's adapter timeout must exceed that limit.

The transport journal stores the exact XML and result. A replay with the same identifiers and XML
returns the saved result without another dispatch. Different XML with the same identifier returns
409. Timeout, connection loss, unexpected HTTP success and Hub 5xx are `unknown`. Ruuter stores
`send_unknown`. Do not automatically retry or create a replacement message until an operator
checks the journal and the Hub. A process interruption can leave `sending`; reconcile that state
with the same journal. The journal is not a background retry queue.

A later `RoadSideInspection_Response` arrives through `/erru/xml`. The adapter persists it in the
inbox, calls `/ljvis/erru/rsi/inbound-response` and completes the inbox without creating another
response. A response can complete `sending`, `sent` or `send_unknown`. It does not overwrite a
completed response with a delayed HTTP acceptance.

`HUB_RSI_REQUEST_URL` is optional during rollout. If it is absent, the outgoing endpoints return
503 without dispatch. Keep this URL in adapter configuration. Clients cannot select a Hub URL.
The sTESTA gateway must expose only `/Service/ReceiveAsync` and `/erru/xml`; it must not forward
`/internal/rsi/*` from the external network.

### Outgoing CGR and CTUD

CGR (`CheckGoodRepute_Request`) and CTUD (`CheckTransportUndertakingData_Request`) leave the same
way as RSI, through `POST /internal/cgr/{validate,send}` and `POST /internal/ctud/{validate,send}`
(token `x-internal-service-token`). `OutboundXmlHandler` is the shared implementation; RSI is a thin
subclass. The request builders are `CgrRequestXml` and `CtudRequestXml`; both validate against the
XSD before anything is sent and invent no data.

- **Search criteria.** CGR sends the complete name block (7A, with the NYSIIS keys as
  `firstNameSearchKey`/`familyNameSearchKey`), the certificate block (7B) or both. CTUD needs at least
  two of name, licence number and vehicle and picks `SearchByLicenceAndName`,
  `SearchByLicenceAndVehicle` or `SearchByNameAndVehicle`. A vehicle needs both number and country.
- **Journal.** `erru.xml_outbound_dispatch` (`message_type` CGR or CTUD) stores the exact XML before
  the call, like `xml_rsi_dispatch`. A replay with the same `technicalId` and XML returns the saved
  result; different XML under the same identifier returns 409. Only a Hub HTTP 202 is `accepted`.
  Timeout, connection loss and unexpected 2xx/3xx/5xx are `unknown` and are never resent.
- **CGR resend.** A per-country resend uses `cgrTo=<member state>`, the original `workflowId` and a new
  `technicalId`. The answer replaces that member state's entry only.
- **Responses.** `CheckGoodRepute_Response` and `CheckTransportUndertakingData_Response` arrive through
  `/erru/xml`. `CgrResponseMapper` and `CtudResponseMapper` map them to the JSON the UI already reads and
  call `/ljvis/erru/cgr/inbound-response` or `/ljvis/erru/ctud/inbound-response`; the inbox completes
  without any answer. A CGR broadcast (`ZZ`) is answered by each member state in its own message, so
  several calls merge into one `member_states` document. When a response holds more than one
  `TransportManagerDetails` or `TransportUndertaking`, the first stays in the existing field and the
  rest are kept in `additionalTransportManagerDetails` and `otherTransportUndertakings`. CTUD licence
  types are translated back to the `COMMUNITY_LICENCE_TYPE` classifier codes.
- **Hub mock.** With `AUTO_REPLY_URL` set the mock Hub (dev and CI only) answers each accepted CGR/CTUD
  request asynchronously through the adapter's ingress. `FI` is rejected with HTTP 400. CTUD: `LV`
  NotFound, `PL` Timeout, `GR` NotAvailable, others Found. CGR: `FR`/`LV` NotFound, `SE` Timeout,
  `PL`/`GR` NotAvailable; a `ZZ` broadcast is answered by `DE`, `FR`, `SE` and `PL`.

### Verification

The image build runs `MapperSmokeTest`, `RsiSendTest` and `CgrCtudSendTest`. The latter uses local HTTP servers and
synthetic fixtures. It checks XML/XSD, escaping, dates, authentication, 202 acceptance, rejection,
timeout and replay behavior. `CgrCtudSendTest` covers the same for CGR and CTUD (all search variants,
resend, validate-only) and maps sample responses, validated against the XSD, to the stored JSON.

For PostgreSQL and asynchronous response checks, create a disposable PostgreSQL 16 container
with an empty `rsi_test` database and a localhost port mapping to 55439. Compile the adapter with
its bundled JDBC driver. Run:

```sh
python3 tests/erru-adapter/test_rsi_outbound.py CONTAINER
python3 tests/erru-adapter/test_rsi_transport.py CONTAINER /absolute/path/to/compiled/classes
python3 tests/erru-adapter/test_cgr_ctud_outbound.py CONTAINER
```

Use these scripts only with a disposable container. The second script starts the actual adapter,
a local Hub and an internal Ruuter stub. It verifies durable dispatch claims and callback processing.
