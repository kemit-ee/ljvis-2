/*
description: 'Lisab outbound_log kirjele uue staatuseventi (notifications.outbound_log_status_event) pärast X-tee
  vastuse saamist (send-postkast.yml callPk samm, cron/notification-status-sync.yml, check-status/send.yml). INSERT-only:
  event on täisseis (revision + 1, väljad kantakse edasi eelmisest eventist või outbound_log reast, parameetriga
  antud väljad kirjutavad üle) — outbound_log rida ise ei muutu ega kustu. Samaaegne kirjutaja kukub UNIQUE (log_id,
  revision) peale. status_check_count ilma parameetrita antud korral jääb samaks; anna increment_check väärtus ''true'',
  et suurendada +1 (sync-status kasutab seda katsete lae jälgimiseks).


  NB pk_operation_restart_allowed on STRING ("true"/"false"/""), MITTE boolean: Rust Resql''i BOOLEAN-parameetri
  sidumine COALESCE(...::BOOLEAN) konteksti läheb Postgres''is katki ("invalid byte sequence for encoding UTF8"
  / "invalid input syntax for type boolean"). Töötav kombinatsioon: DSL saadab stringi, SQL kasutab NULLIF(:param,
  '''')::BOOLEAN. increment_check seevastu läheb bare JSON boolean''ina (CASE WHEN :param::BOOLEAN — see kuju töötab).'
namespace: notification
params:
  id:
    type: string
    required: false
  status:
    type: string
    required: false
  failure_reason:
    type: string
    required: false
  pk_sending_operation_id:
    type: string
    required: false
  pk_operation_restart_allowed:
    type: string
    required: false
  pk_completed_at:
    type: string
    required: false
  increment_check:
    type: boolean
    required: false
returns:
- name: id
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: failureReason
  type: string
  nullable: true
- name: pkSendingOperationId
  type: string
  nullable: true
*/
WITH cur AS (
  SELECT
    ol.id,
    COALESCE((SELECT max(e.revision) FROM notifications.outbound_log_status_event e WHERE e.log_id = ol.id), 0) AS revision,
    ol.status AS base_status, ol.failure_reason AS base_failure_reason, ol.pk_sending_operation_id AS base_pk_sending_operation_id,
    ol.pk_operation_restart_allowed AS base_pk_operation_restart_allowed, ol.pk_completed_at AS base_pk_completed_at,
    ol.status_check_count AS base_status_check_count,
    (SELECT e FROM notifications.outbound_log_status_event e WHERE e.log_id = ol.id ORDER BY e.revision DESC LIMIT 1) AS ev
  FROM notifications.outbound_log ol
  WHERE ol.id = :id::UUID
),
state AS (
  SELECT
    c.id,
    c.revision,
    CASE WHEN (c.ev).id IS NULL THEN c.base_status ELSE (c.ev).status END                                             AS status,
    CASE WHEN (c.ev).id IS NULL THEN c.base_failure_reason ELSE (c.ev).failure_reason END                             AS failure_reason,
    CASE WHEN (c.ev).id IS NULL THEN c.base_pk_sending_operation_id ELSE (c.ev).pk_sending_operation_id END           AS pk_sending_operation_id,
    CASE WHEN (c.ev).id IS NULL THEN c.base_pk_operation_restart_allowed ELSE (c.ev).pk_operation_restart_allowed END AS pk_operation_restart_allowed,
    CASE WHEN (c.ev).id IS NULL THEN c.base_pk_completed_at ELSE (c.ev).pk_completed_at END                           AS pk_completed_at,
    CASE WHEN (c.ev).id IS NULL THEN c.base_status_check_count ELSE (c.ev).status_check_count END                     AS status_check_count
  FROM cur c
)
INSERT INTO notifications.outbound_log_status_event (
    log_id, revision, status, failure_reason, pk_sending_operation_id,
    pk_operation_restart_allowed, pk_completed_at, status_check_count
)
SELECT
    s.id,
    s.revision + 1,
    COALESCE(NULLIF(:status, ''), s.status),
    COALESCE(NULLIF(:failure_reason, ''), s.failure_reason),
    COALESCE(NULLIF(:pk_sending_operation_id, ''), s.pk_sending_operation_id),
    COALESCE(NULLIF(:pk_operation_restart_allowed, '')::BOOLEAN, s.pk_operation_restart_allowed),
    COALESCE(NULLIF(:pk_completed_at, '')::TIMESTAMPTZ, s.pk_completed_at),
    s.status_check_count + CASE WHEN :increment_check::BOOLEAN THEN 1 ELSE 0 END
FROM state s
RETURNING log_id AS id, status, failure_reason, pk_sending_operation_id;
