-- liquibase formatted sql
-- changeset ljvis:20261229090000-rollback ignore:true

-- Copies the current state back into the legacy columns so the pre-append-only templates see it again.
UPDATE erru.xml_inbox i
   SET status = c.status, attempts = c.attempts, claimed_by = c.claimed_by, lease_expires_at = c.lease_expires_at,
       next_attempt_at = c.next_attempt_at, last_error = c.last_error
  FROM erru.xml_inbox_current c
 WHERE c.id = i.id;

DROP VIEW IF EXISTS erru.xml_inbox_current;
DROP TABLE IF EXISTS erru.xml_inbox_conflict;
DROP TABLE IF EXISTS erru.xml_inbox_event;
