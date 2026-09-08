/*
description: 'Uuendab outbound_log kirje staatust ja PK 2.0 väljasid pärast X-tee vastuse saamist (send-postkast.yml
  callPk samm, cron/notification- status-sync.yml). NB: See on ainus lubatud UPDATE notifications skeemis
  — need väljad saabuvad alles PK 2.0 vastusena, ei saa neid INSERT-iga ette täita. Append-only poliitika:
  ridu ei kustutata ega asendata — ainult nende konkreetsete väljade uuendamine on siin lubatud. status_check_count
  ilma parameetrita antud korral jääb muutmata; anna increment_check väärtus ''true'' et suurendada +1
  (sync-status kasutab seda katsete lae jälgimiseks).

  NB pk_operation_restart_allowed on STRING ("true"/"false"/""), MITTE boolean: Rust Resql''i BOOLEAN-parameetri
  sidumine COALESCE(...::BOOLEAN) konteksti läheb Postgres''is katki ("invalid byte sequence for encoding
  UTF8" / "invalid input syntax for type boolean"). Töötav kombinatsioon: DSL saadab stringi, SQL kasutab
  NULLIF(:param, '''')::BOOLEAN. increment_check seevastu läheb bare JSON boolean''ina (CASE WHEN :param::BOOLEAN
  — see kuju töötab).'
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
*/
UPDATE notifications.outbound_log
SET
    status                       = COALESCE(NULLIF(:status, ''), status),
    failure_reason               = COALESCE(NULLIF(:failure_reason, ''), failure_reason),
    pk_sending_operation_id      = COALESCE(NULLIF(:pk_sending_operation_id, ''), pk_sending_operation_id),
    pk_operation_restart_allowed = COALESCE(NULLIF(:pk_operation_restart_allowed, '')::BOOLEAN, pk_operation_restart_allowed),
    pk_completed_at              = COALESCE(NULLIF(:pk_completed_at, '')::TIMESTAMPTZ, pk_completed_at),
    status_check_count           = status_check_count + CASE WHEN :increment_check::BOOLEAN THEN 1 ELSE 0 END
WHERE id = :id::UUID
RETURNING id, status, failure_reason, pk_sending_operation_id;
