/*
description: 'ADR-010 verifitseerimissamm: mitu etteantud (form_type, id) paari on arhiiv-andmebaasis
  reaalselt olemas. Cron võrdleb seda saadetud ridade arvuga — ainult täieliku vaste korral tehakse
  töö-baasis päris DELETE (purge_confirmed.sql).'
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
FROM jsonb_to_recordset(COALESCE(:pairs, '[]')::jsonb) AS x(form_type text, id bigint)
JOIN archive.form_snapshot s
  ON s.form_type = x.form_type AND s.id = x.id;
