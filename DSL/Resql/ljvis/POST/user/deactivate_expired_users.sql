/*
declaration:
  version: 0.3
  description: >-
    Deactivate users with past access_end (LJVIS2-12 AC#2/#4, nightly
    cron): insert a new snapshot with status='inactive' AND user_groups
    cleared to '{}', both in the same row. Previously this query kept
    user_groups unchanged and relied on a second call
    (users/rebuild_user_account_latest) that was never implemented
    (leftover reference to an abandoned materialized-view design — the
    final schema uses the DISTINCT ON append-only pattern instead), so the
    job errored out on Resql 'does not exist' as soon as there was a real
    expired user. Doing both in one INSERT removes the need for that
    second call.
    `latest` MUST resolve one row per key (the true latest snapshot)
    before filtering on status — filtering first and then DISTINCT ON
    would pick "the latest row matching the filter" instead, a stale
    pre-deactivation row once a newer 'inactive' snapshot exists (same bug
    class as select_etoimik_candidates.sql: without this split, an
    already-deactivated user kept reappearing and getting a fresh
    'inactive' snapshot on every run, defeating idempotency).
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: personalCode
        type: string
*/
WITH latest AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key, personal_code, first_name, last_name,
        organisation_id, organisation_name, structural_unit, job_title,
        email, phone, access_start, access_end, status
    FROM users.user_account
    ORDER BY user_account_key, created_at DESC
),
expired AS (
    SELECT user_account_key, personal_code, first_name, last_name,
        organisation_id, organisation_name, structural_unit, job_title,
        email, phone, access_start, access_end
    FROM latest
    WHERE access_end IS NOT NULL
      AND access_end < CURRENT_DATE
      AND status <> 'inactive'
)
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, 'inactive', ARRAY[]::BIGINT[], :created_by
FROM expired
RETURNING user_account_key AS id, personal_code;
