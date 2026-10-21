# ERRU XML recovery

Use an authorised DB session against the intended environment. Inspect the message and the business
flow's result first. The inbox controls business processing; the outbox controls transmission. Do not
change technicalId, workflowId, raw_xml, digest, xml_body or deadline to force a replay.

## Inspect one message

In psql, set the actual inbox id, then inspect both sides:

```sql
\set inbox_id 123
SELECT id, technical_id, message_type, status, attempts, deadline_at, last_error
FROM erru.xml_inbox WHERE id = :inbox_id;
SELECT id, technical_id, status, attempts, deadline_at, delivered_at, last_error
FROM erru.xml_outbox WHERE inbox_id = :inbox_id;
```

A processed inbox with an expired outbox can be correct: the notification was processed, but its
response deadline elapsed. A failed inbox is not evidence that the business operation had no effect;
its idempotent flow must inspect/resume already committed work.

## Resume a failed inbox

Fix the dependency or mapping error first. An exact redelivery of the stored request also revives a
failed inbox. To schedule it manually:

```sql
BEGIN;
SELECT id, status FROM erru.xml_inbox WHERE id = :inbox_id FOR UPDATE;
UPDATE erru.xml_inbox
SET status = 'received', attempts = 0, next_attempt_at = NULL,
    claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL
WHERE id = :inbox_id AND status = 'failed';
COMMIT;
```

Only failed rows are reset. Do not steal a live processing lease. The periodic worker scan picks up
the row; NU/NCR/RSI recovery continues even when the original response deadline passed. The existing
outbox, if any, stays immutable. Check the final inbox state, business snapshots, notification and
single audit event. If the cause remains, the inbox will fail again after its finite attempt budget.

## Retry delivery for a processed inbox

Do not reset the inbox to fix a failed outbox. After correcting a temporary delivery/configuration
problem, retry only if the **original** response deadline still permits it:

```sql
BEGIN;
SELECT id, status, deadline_at FROM erru.xml_outbox WHERE inbox_id = :inbox_id FOR UPDATE;
UPDATE erru.xml_outbox
SET status = 'pending', attempts = 0, next_attempt_at = NULL,
    claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL
WHERE inbox_id = :inbox_id AND status = 'failed' AND deadline_at > now();
UPDATE erru.xml_outbox
SET status = 'expired'
WHERE inbox_id = :inbox_id AND status = 'failed' AND (deadline_at IS NULL OR deadline_at <= now());
COMMIT;
```

Retries reuse the exact XML and outbound technicalId. If the Hub permanently rejected the content,
repeating those bytes is not a repair. If time expired, resolve the incident with the integration
owner; a new workflow must originate through the agreed protocol, not by extending this deadline.
A 2xx records transport delivery only; processing of a later Hub ErrorNotification is not implemented
by this adapter.

The automated regression tests exercise failed-inbox revival, incomplete-business recovery with an
existing EN, and failed-outbox requeue without duplicating the business effect or regenerating XML.

## Deployment preflight and business schema ownership

`20261201084000-audit-monotonic-ids` supplies the shared audit ULID generator. Audit callers pass
an empty event_id to use it instead of generating base36 IDs in JavaScript. Allocation holds the
chain-tip transaction lock and advances beyond the last ULID, including same-millisecond inserts
and clock rollback. Always allocate immediately in the INSERT transaction; do not preallocate IDs.
Deploy the generator and all changed callers together. Already misordered legacy IDs are not repaired
by this migration. Rolling it back restores the old generator and loses the monotonic guarantee.

`20261201085000-erru-inbound-business-recovery` owns the RSI answered index, audit function and
`erru.inbound_audit_key`. The transport changeset owns only inbox/outbox and their triggers;
rolling it back does not remove business recovery objects.

Before applying the business changeset, check for older concurrent RSI completions:

```sql
SELECT technical_id, count(*) AS answered_snapshots
FROM erru.rsi_message
WHERE direction = 'incoming' AND status = 'answered'
GROUP BY technical_id HAVING count(*) > 1;
```

Any result blocks deployment. Reconcile the snapshots with the business owner; do not automatically
delete history or keep an arbitrary row. The changeset stops with an explicit diagnostic before
creating the unique index. Run it with ingestion paused for deployment; the unique index is the
final concurrency guard.

Audit deduplication keys are separate from the normal ULID `audit.audit_event.event_id`; they commit
in the same transaction under a per-key lock. Keep the key table when archiving audit events.
Rolling back the business changeset removes deduplication state: stop inbound processing first and
retain that state for a later reinstallation. Transport rollback alone does not have this effect.

These changesets are unreleased. A local database with earlier versions applied needs a fresh test
schema or an explicitly planned upgrade; clearing checksums alone does not apply changed SQL.
If the old implementation wrote `erru:...` event IDs, replacing the function does not repair their
historical order. Do not rewrite immutable audit IDs or hashes in place. Production history, if any,
requires a separate reviewed repair/migration plan. Our verification uses a fresh isolated CI DB.

## CGR integration acceptance

7A-only (name/date of birth) and 7B-only (certificate) can match the local UNFIT register. If it finds
nothing, the current MTR full-identification API cannot complete those searches. `ServerError` is
an honest failure, not full CGR support. Product/MTR owners must confirm an endpoint supporting the
required partial searches and NYSIIS matching; test known matches and real negative results before
accepting this integration for real traffic. No alternative search API is assumed here.

The §6.4 totals rule is labelled CTUD and conditional on requestAllVehicles, while the corresponding
aggregate attributes are in the CGR XSD. Until clarified with the integration owner, CGR preserves
MTR aggregates and does not reject a response merely because they differ from the listed records.
XSD and unambiguous semantic validations remain enabled. Verify representative MTR responses before
production; a mock is not evidence about real aggregate semantics.

The local CGR source is forms.good_repute_form. Its validated chk_grf_unfit_dates_required constraint
requires both dates for fitness_status='unfit'. Preflight imported/legacy data in the target DB:

```sql
SELECT count(*) AS unfit_without_end_date
FROM forms.good_repute_form
WHERE fitness_status = 'unfit' AND unfit_until_date IS NULL;
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'forms.good_repute_form'::regclass
  AND conname = 'chk_grf_unfit_dates_required';
```

Do not invent an end date or weaken the explicit ERRU Unfit requirement. If a real external source
supports indefinite unfitness, agree a protocol representation before enabling those responses.
