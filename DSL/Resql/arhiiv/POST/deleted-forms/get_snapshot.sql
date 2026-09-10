/*
description: 'ADR-010: üks arhiveeritud snapshot-rida arhiiv-andmebaasist snapshot-ID järgi. Tagastab
  terve salvestatud rea payload-objektina (to_jsonb(forms.<t>.*) copy-ajal). Ruuteri fallback pakib
  payload lahti, kui töö-baas tagastab 0 rida.'
namespace: deleted-forms
params:
  formType:
    type: string
    required: false
  id:
    type: integer
    required: false
    description: 'Snapshot ID (algne forms.<t>.id).'
returns:
- name: payload
  type: object
  nullable: true
*/
SELECT payload
FROM archive.form_snapshot
WHERE form_type = :formType
  AND id = :id::BIGINT;
