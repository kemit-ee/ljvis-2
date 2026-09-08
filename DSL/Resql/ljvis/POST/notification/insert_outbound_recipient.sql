/*
description: 'Lisab ühe saaja outbound_log kirjele. APPEND-ONLY: uuesti saatmisel lisatakse saajad uue
  log rea alla.'
namespace: notification
params:
  log_id:
    type: string
    required: false
  person_email:
    type: string
    required: false
  person_name:
    type: string
    required: false
  person_code:
    type: string
    required: false
  sending_report:
    type: string
    required: false
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
