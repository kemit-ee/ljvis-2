/*
declaration:
  version: 0.1
  description: >-
    Uuendab outbound_log kirje staatust ja PK 2.0 sending_operation_id-d
    pärast PK 2.0 API vastuse saamist (send-postkast.yml callPkApi samm).
    NB: See on ainus lubatud UPDATE notifications skeemis — pk_sending_operation_id
    saabub PK 2.0 API vastusena, seega ei saa seda INSERT-iga ette täita.
    Append-only poliitika tähendab: ridu ei kustutata, ei asendatа — ainult
    selle konkreetse kahe välja uuendamine on siin lubatud.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: id
        type: string
      - field: status
        type: string
      - field: pk_sending_operation_id
        type: string
*/
UPDATE notifications.outbound_log
SET
    status                  = COALESCE(NULLIF(:status, ''), status),
    pk_sending_operation_id = COALESCE(NULLIF(:pk_sending_operation_id, ''), pk_sending_operation_id)
WHERE id = :id::UUID
RETURNING id, status, pk_sending_operation_id;
