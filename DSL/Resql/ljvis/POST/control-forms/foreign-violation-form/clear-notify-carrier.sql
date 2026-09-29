/*
description: Võtab välisriigi rikkumise kontrollkaardi uusimalt avalikustatud kirjelt maha "Teavita vedajat" linnukese
  pärast seda, kui vedaja teavitus on välja saadetud (VR ettepanek 3). Muudatuse korral märgib kasutaja linnukese
  uuesti ja järgmine avalikustamine saadab teavituse uuesti. Muudab ainult notify_carrier lippu.
namespace: control-forms
params:
  key:
    type: integer
    required: true
returns:
- name: id
  type: number
  nullable: true
*/
UPDATE forms.foreign_violation_form t
SET notify_carrier = FALSE
WHERE t.id = (
    SELECT id FROM forms.foreign_violation_form
    WHERE foreign_violation_form_key = :key::BIGINT
    ORDER BY created_at DESC
    LIMIT 1
)
  AND t.status = 'published'
RETURNING foreign_violation_form_key AS id;
