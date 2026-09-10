/*
description: Get a single active file attachment by ID
namespace: forms
params:
  id:
    type: integer
    required: false
    description: Attachment record ID
  form_number_prefix:
    type: string
    required: false
    description: 'Vorminumbri prefiks (nt ''mv-'', ''vr-''). Kohustuslik — piirab manuse vormi-tüübiga, mille lugemisõigust kutsuja on kontrollinud (IDOR-kaitse). Tühi/NULL → 0 rida.'
returns:
- name: id
  type: string
  nullable: true
- name: form_number
  type: string
  nullable: true
- name: file_name
  type: string
  nullable: true
- name: s3_key
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: created_at
  type: string
  nullable: true
- name: created_by
  type: string
  nullable: true
*/
SELECT id, form_number, file_name, s3_key, status, created_at, created_by
FROM forms.form_attachment
WHERE id = :id::BIGINT
  AND status = 'active'
  AND btrim(COALESCE(:form_number_prefix, '')) <> ''
  AND form_number LIKE :form_number_prefix || '%';
