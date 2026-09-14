# NU internal transport contract

Ruuter.internal routes use `/ljvis/erru/nu/`. These are transport DTOs, not SOAP endpoints. XML token whitespace must be normalized before building a DTO. The production SOAP adapter must validate XML against the supplied ERRU 3.5 schemas, authenticate its machine calls at the internal ingress, and supply the authenticated peer. The repository currently has no NU SOAP adapter or OAuth ingress. Do not expose these routes publicly. User cookies do not establish transport identity.

## Requests and acknowledgements

Canonical NU validation lives in `erru.nu_validate` in SQL so public Ruuter and Ruuter.internal use the same rules.

`POST inbound-request` accepts the existing flattened request. `sentAt` is required (UTC seconds, minimum 1753-01-01); absent `unfitStartDate` defaults to the first reception day in Europe/Tallinn. Empty optional DTO strings represent omitted XML attributes. Every supplied name/certificate block must be complete. Validation failures return HTTP 400 before persistence.

The response contains the stable ACK Header fields, `businessCaseId`, `originatingAuthority` and `memberStates`. `acknowledgementType` is transport metadata and must not be serialized as an ERRU XML attribute. Optional empty strings must be omitted from XML. Duplicate reception returns the stored ACK, including the original identifiers. Preparing the ACK and recording the received/acknowledged snapshots is one transaction; a database failure rolls back the operation and must become a transport fault.

Delivery callbacks and automatic delivery deadlines are deferred until the XTR team agrees the adapter contract (question 13). There is no delivery-result endpoint, tracking flag or timeout cron in this change. Returning an ACK from Ruuter does not establish that the remote peer received its bytes.

The outgoing HTTP call completes synchronously through `nu_finish_send`: it records a local `SendResult`, containing the validated ACK or transport failure. `SendResult` is a database record of this call, not an ERRU message or adapter callback. No elapsed-time job changes NU status. If the process stops before recording the synchronous result, the exchange requires investigation; it is not automatically failed or resent.

## Error notifications

`POST error-notification` accepts string fields `technicalId`, `workflowId`, `sentAt`, `from`, `to`, `businessCaseId`, `statusCode`, optional `statusMessage`, and required `originalMessage` (original XML). The error's own technical ID must differ from the original message ID. Codes follow ERRU ErrorNotification, not ACK member-state statuses.

Original Request/ACK identifiers, workflow, business case and participants must agree with the exchange registry. DTD/entities are rejected. An unreadable OriginalMessage can use an unambiguous workflow/business-case/peer match; conflicting identifiers never fall back. Hub identity needs a trusted transport mapping; arbitrary Hub aliases are not accepted as member-state identities.

Exact retries return the stored result, changed content under the same event ID returns 409, unmatched events are retained with HTTP 202 and do not alter NU. A correlated error appends one error snapshot; further errors remain technical events. Currently unmatched events require diagnostic investigation; automatic re-correlation is not implemented.

## Deployment and verification

`includeAll: changelog/` discovers the XML changesets `20261117120000-erru-nu-validation.xml` and `20261117121000-erru-nu-exchange.xml`. Their `sqlFile` entries execute the SQL after the initial NU schema; `ignore:true` prevents the standalone SQL files from executing a second time. Each XML changeset references its rollback SQL. Rollback removes exchange functions/table first, then validation constraints/function and restores NYSIIS columns to `VARCHAR(20)`. Values longer than 20 prevent this narrowing; rollback does not truncate them. Historical snapshots are not rewritten; new inserts enforce the new constraints. Existing Request identifiers are backfilled into the registry; old ACK identifiers were never stored and cannot be recovered.

Reload Resql and both Ruuter services after deployment. The sender uses the persisted Header values in the external request. Completion and later EN errors are separate immutable events/snapshots.

`tests/sql/erru-nu-validation-and-exchange.sql` covers field boundaries, dates, incomplete blocks, ACK validation, preallocated Header, synchronous send completion, and EN correlation/replay for Request and ACK. Real SOAP serialization and authenticated ingress remain transport integration work.

The pinned XSD checks and PostgreSQL tests on the migrated E2E database are documented in [NU contract tests](../../tests/contract/README.md). They detect drift from the supplied schema snapshot; they do not monitor upstream releases or certify SOAP serialization.

When upgrading XSD, the developer replaces the tested schema bundle and updates its provenance/checksums. CI fails when covered NU rules differ from the implementation or the schema namespace/version changes. The default bundle is `contracts/erru/3.5`; moving to a new version directory also requires updating `SCHEMAS` in `tests/contract/check_erru_contract.py`. Adding an unused directory alone does not switch the tests to it.

## Draft consistency and concurrent requests

The original NU migrations create the unique `(nu_message_key, version)` index and source snapshot reference, and serialize draft revisions and send reservations on the message key. These changes are part of the unreleased NU schema; there is no additional repair migration or automatic rewriting of existing message history. Local databases that already applied earlier versions of these migrations need a separate local refresh before testing the updated schema. Deploy the NU schema together with Resql, Ruuter and frontend changes.

Save existing drafts and send with numeric `expectedVersion` from the message GET response. Missing/invalid versions return 422; stale versions return 409 `version_conflict`. Every write selects the latest snapshot across all statuses before checking editability. Snapshots created by lock waiters use the actual write time, so an earlier transaction start cannot hide the final status.

Source previews from source GET/search include `snapshotId`. New drafts and explicit source refreshes send it as string `sourceSnapshotId`. Saving an existing draft without a refresh requires its protected identity to match the latest eligible source. A stale preview or changed identity returns 409 `source_changed`; the user refreshes the source, reviews it and saves a new revision. Source eligibility and identity are checked again inside the reservation transaction. This is the acceptance point: later declaration changes cannot modify an already reserved request.

`nu_begin_send` returns the complete reserved wire body, also retained in the Request event. The HTTP handler sends that body directly. The pinned Ruuter 0.9.15-rc exposes connection/timeout failures via `error:` / status 0; all transport failures and invalid acknowledgements reach `nu_finish_send` before integration logging. A 30-second request timeout does not schedule retries. A process crash or unavailable database during completion still requires investigation; this change does not claim exactly-once delivery across external systems.

`tests/sql/erru-nu-draft-consistency.sql` covers stale versions/sources, terminal states and persisted payloads. `tests/sql/test_nu_concurrency.py` runs five controlled interleavings using independent PostgreSQL sessions (save/save, send/save, save/send, send/send and a waiting completion). Both run in the migrated E2E test database. `DSL-tests/erru/` exercises the real Ruuter routes with mocked dependencies, including a real refused connection inside the isolated test container. Frontend regressions check unsaved edits, explicit source refresh and version propagation. The Postman NU collection reads a preview/version before normal actions and includes an explicit stale-version scenario.
