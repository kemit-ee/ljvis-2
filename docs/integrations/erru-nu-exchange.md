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
