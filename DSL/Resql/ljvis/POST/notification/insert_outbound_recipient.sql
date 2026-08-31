/*
declaration:
  version: 0.1
  description: >-
    Lisab ühe saaja outbound_log kirjele.
    APPEND-ONLY: uuesti saatmisel lisatakse saajad uue log rea alla.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: log_id
        type: string
      - field: person_email
        type: string
      - field: person_name
        type: string
      - field: person_code
        type: string
      - field: sending_report
        type: string
*/
INSERT INTO notifications.outbound_log_recipient (
    log_id,
    person_email,
    person_name,
    person_code,
    sending_report
)
VALUES (
    :log_id::UUID,
    NULLIF(:person_email, ''),
    NULLIF(:person_name, ''),
    NULLIF(:person_code, ''),
    COALESCE(NULLIF(:sending_report, ''), 'ok')
)
RETURNING id;
