# ERRU XML adapter

Receives the five ERRU 3.5 request types as XML over asynchronous HTTP. The adapter validates and
persists the request, calls the corresponding Ruuter.internal JSON flow, validates the XML answer,
and delivers it through a durable outbox. See [architecture](../../docs/architecture/erru-async-xml.md)
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
| HUB_RESPONSE_URL | Required full URL for every answer and EN |
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
