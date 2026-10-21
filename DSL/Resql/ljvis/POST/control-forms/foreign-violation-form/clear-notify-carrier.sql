/*
description: 'Võtab välisriigi rikkumise kontrollkaardi uusimalt avalikustatud kirjelt maha "Teavita vedajat"
  linnukese pärast seda, kui vedaja teavitus on välja saadetud (VR ettepanek 3). Muudatuse korral märgib kasutaja
  linnukese uuesti ja järgmine avalikustamine saadab teavituse uuesti. Muudab ainult notify_carrier lippu.
  INSERT-only: lisab uue snapshot-rea (revision + 1, version ja kõik muud väljad kantakse edasi), vana rida
  jääb ajalukku. created_by = ''system''.'
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
WITH latest AS (
  SELECT *
  FROM forms.foreign_violation_form
  WHERE foreign_violation_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.foreign_violation_form
SELECT (jsonb_populate_record(
    NULL::forms.foreign_violation_form,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.foreign_violation_form_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', 'system',
      'notify_carrier', FALSE
    )
)).*
FROM latest l
WHERE l.status = 'published'
RETURNING foreign_violation_form_key AS id;
