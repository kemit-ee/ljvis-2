/*
description: 'ADR-010 verifitseerimissamm (retention-purge kontrakti samm 2): mitu etteantud (form_type, id) paari
  on arhiiv-andmebaasis reaalselt olemas, loetud kordumatult (topeltpaar ei saa puuduvat rida varjata) ja korraliku
  payload''iga (objekt, mille id vastab reale). Cron võrdleb seda saadetud ridade arvuga — ainult täieliku vaste
  korral tehakse töö-baasis päris DELETE (purge_confirmed.sql, ainus append-only erand).'
namespace: deleted-forms
params:
  pairs:
    type: string
    required: false
    description: 'JSON massiiv [{"form_type":"...","id":123}, ...].'
returns:
- name: present
  type: number
  nullable: true
*/
SELECT count(*)::bigint AS present
FROM (
  SELECT DISTINCT form_type, id
  FROM jsonb_to_recordset(COALESCE(:pairs, '[]')::jsonb) AS x(form_type text, id bigint)
  WHERE form_type IS NOT NULL AND id IS NOT NULL
) p
WHERE EXISTS (
  SELECT 1
  FROM archive.form_snapshot s
  WHERE s.form_type = p.form_type
    AND s.id = p.id
    AND jsonb_typeof(s.payload) = 'object'
    AND (s.payload ->> 'id')::bigint = s.id
);
