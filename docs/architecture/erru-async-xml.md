# ERRU asynchronous XML exchange

## Scope and connection profile

The local implementation receives ERRU 3.5 CGR, CTUD, RSI, NCR and NU requests as XML over HTTP.
A Java sidecar converts the XML to the existing Ruuter.internal JSON contracts and sends the answer
through an outbox. The XSD bundle is `contracts/erru/3.5`. HTTP/XML is isolated here because the
project's Ruuter version does not expose `application/xml` bodies through its usual JSON flow API.

The async receiving profile is the implemented development assumption, not confirmation from the
national connection-point owner. Before deployment, confirm async/sync selection, the real Hub
URLs, network routing/mTLS termination, the treatment of malformed input and responding authorities.

The documented async Hub has one response URL, ending in
`/erru/http/response/btshttpreceive.dll`. `HUB_RESPONSE_URL` configures that full URL. The DLL suffix
is an HTTP routing convention of the remote service, not a dependency of this Java application.
Local compose targets a separate test Hub. Outgoing business send workflows and incoming Hub error
notifications are outside this request-ingress implementation.

## Components and data ownership

| Component | Responsibility |
|---|---|
| IngressHandler | Bounded UTF-8 input, hardened XML parsing/XSD, durable acceptance and conflict detection |
| MessageMapper implementations | XML/JSON mapping for each message type; complete search-criteria echo |
| ProcessingWorker | Claim, invoke the business flow, classify the result and persist its transport outcome |
| DeliveryWorker | POST immutable outbox XML to the configured Hub URL within the response window |
| SchemaRegistry / ResponseValidator | XSD and supported semantic/correlation checks |
| Ruuter.internal + Resql | Business snapshots, notifications, register calls and audit |

The adapter uses JDBC only for its transport inbox/outbox. Business data remains behind the JSON
flows and Resql. Five processing threads, one per type, isolate slow register searches from
notification handling. Two delivery threads limit head-of-line blocking by a slow HTTP delivery.
All concurrency is bounded; health checks inspect every worker and the DB connection.

Each worker has its own claim identity. Claims use `FOR UPDATE SKIP LOCKED`, a lease and an owner
check at finalisation. A stale owner cannot overwrite a newer claim. LISTEN uses a separate
connection from business work; periodic scans make notifications an optimisation rather than the
source of truth. No transaction is held across an external HTTP call.

## Acceptance, identity and replay

Ingress commits raw XML, SHA-256 digest, root type, technicalId, workflowId, businessCaseId and
receipt/deadline timestamps before returning 202. A failed DB write returns an error.

- A new technicalId creates one inbox row.
- The same technicalId and bytes return the same row. A failed inbox can be revived; a completed
  inbox is not run again merely because the request was redelivered.
- A reused technicalId with different bytes returns 409 and records the conflict in last_error.
- Invalid XML/XSD, DOCTYPE and unsupported encoding return 400 without storage; the size limit is
  2 MiB (413). A known schema without an available processor returns 501.

The database retains `conflict` as a reserved inbox state; rejected conflicting attempts currently
leave the original row's state unchanged. There is no second conflicting inbox row.

## Business completion and response delivery

The states describe different facts:

| Inbox | Meaning |
|---|---|
| received | Accepted, awaiting business processing or a recovery attempt |
| processing | Claimed by a worker |
| processed | Processing concluded; notification effects completed or the request was explicitly rejected |
| failed | Processing incomplete after its attempt budget or an unclassifiable failure; recoverable |

| Outbox | Meaning |
|---|---|
| pending / sending | Answer ready / claimed for delivery |
| delivered | Hub returned HTTP 2xx; not a guarantee of its later business acceptance |
| failed | Permanent HTTP rejection or exhausted delivery attempts |
| expired | No delivery attempt can be completed within the response window |

`Header/@timeoutValue` supplies the response deadline. Without it, ingress uses receipt time plus
ten seconds; this local default must be confirmed with the agreed receiving profile. Existing rows
without a deadline use the same receipt-based calculation when processed.

The first Ruuter call is bounded by the remaining response budget, reserving two seconds for the
answer. A response retry requires room for the delay, at least one second of processing and that
margin. Delivery's HTTP timeout is bounded by the remaining deadline; no expired answer is posted.

**A notification's business lifetime is not its response lifetime.** NU/NCR/RSI still run after the
response window has elapsed. When a technical failure cannot be retried within that window, an EN
can be queued while the inbox remains `received`. Business recovery continues with the remaining
processing attempts and normal per-type timeouts. Exhaustion leaves the inbox `failed`, not
`processed`. The original payload remains available for an operator or exact redelivery.

Outbox insertion and the inbox state change commit together. A unique inbox_id constraint permits
only one answer. Recovery does not replace a previously queued EN with a new ACK, modify its
technicalId/XML or extend its deadline. A processed inbox may therefore have an expired EN outbox
and a successfully completed business operation. Network delivery is at least once within the
allowed window; exactly-once delivery is not claimed.

## Business-flow recovery

NU stores its message and ACK atomically and resumes notification/audit after an interrupted call.
NCR resumes the idempotent notification matching its stored check result and its audit before returning ACK. Saved values are
used when replaying the message. Notification insertion failures propagate as 502; best-effort
WebSocket broadcast failure does not undo a successfully persisted notification.

RSI resumes a `received` lookup and only replays an `answered` result. Registry failures stay
recoverable and never become `NotFound`. A unique incoming answered-snapshot index prevents
concurrent completions from appending duplicates; all contenders read the committed answer before
audit/reply. An answered record missing its audit resumes that audit as well.

`erru.record_inbound_audit` serialises attempts for the same event type/message key with a transaction
advisory lock. The stable `erru:<event-type>:<message-key>` key lives in `erru.inbound_audit_key`;
the audit row retains an ordinary `audit.generate_ulid()` identifier. Both inserts share one
transaction. Existence is checked **before INSERT** in the function, after
the lock. This preserves the audit hash chain: using `ON CONFLICT DO NOTHING` directly on audit
insertion would still execute its BEFORE INSERT chain trigger. The generic audit endpoint retains its contract; application callers now use its database-generated
ULID instead of JavaScript base36 IDs. The generator takes the chain lock before allocation and
keeps new IDs monotonic, including same-millisecond writes. This is a separate audit migration. Historical NU events recognised by the existing audit lookup are replayed without adding
another event.

CGR checks the local UNFIT register, then the full-identification MTR API. A valid 7A-only or 7B-only
query unsupported by that API produces ServerError/EN, leaving the search uncompleted. It cannot
truthfully produce NotFound. Adding broader MTR search support is a separate integration decision.

## Outbound contract

Ordinary member-state answers never contain NotAvailable or Timeout; those values belong to the
Hub. An explicit business rejection becomes EN InvalidData; a technical inability to answer becomes
EN ServerError. EN targets EU, preserves workflowId, includes OriginalMessage and a generic message
with an inbox correlation id. Detailed errors remain in logs and last_error.

Every ordinary answer passes XSD and semantic checks: Found requires records, Unfit includes an end
date, and MemberState agrees with the sender. CGR aggregate totals are not required to equal the
returned list until the ambiguous CTUD-labelled rule in §6.4 is clarified. The
adapter checks workflowId, businessCaseId, sender/recipient and originatingAuthority, and compares
the complete echoed CGR/CTUD search criteria. These checks do not claim to implement every external
Hub rule, such as its own NYSIIS matching and connected-country availability.

XSD booleans are normalised, and integer conversion rejects fractional values. Required missing
licence/status/address data causes an EN instead of fabricated registry data. CTUD classifier label
mapping and RSI JSON details are documented in the [adapter README](../../docker/erru-xml-adapter/README.md).

## Verification and operation

The Docker build runs mapper/EN/semantic/time-budget smoke tests. The isolated full CI script runs
Postman collections and the committed crash/deadline/concurrency suite. The strict test Hub parses
XML, validates XSD and supported semantic rules, checks the exact response path, and retains replies
by workflowId. XML tests must identify the current workflow rather than inspect the last global reply.

See [recovery procedure](../integrations/erru-xml-recovery.md) for separate inbox/outbox actions.
Operational readiness additionally requires the confirmed national connection profile, mTLS/peer
trust, scoped credentials, queue/deadline/failure alerts, retention and realistic load tests. Local
loopback binding and a successful mock exchange do not replace those deployment requirements.

## Notification guarantees for inbound ERRU

NU/NCR/RSI must persist their application notification before successful completion. Persistence
failure returns 502 and leaves business processing recoverable. Each passes the original technicalId
as event_key, so a concurrent retry is safe and a different event for the same business case is not
silently discarded. The shared create flow keeps template mapping and the recipient snapshot;
an empty INSERT result means the notification already exists and is successful. WebSocket push
remains best-effort after persistence.

NCR chooses ncr_violation for Fail and ncr_ok for Pass/CleanCheck, including resumed processing from
the stored result. RSI creates rsi_received before the registry call both on insert and received
resume; answered replay restores its notification without repeating the registry lookup.

The notification for a response to our outgoing NCR remains best-effort, keyed by workflowId:status.
It uses the database-generated audit event_id. Other notification producers remain best-effort.
