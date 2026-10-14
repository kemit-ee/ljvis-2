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
  attachment_form_type:
    type: string
    required: false
    description: Optional S3 folder type, required by SP routes to distinguish driver and teammate forms with the same number
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
SELECT a.id, a.form_number, a.file_name, a.s3_key, a.status, a.created_at, a.created_by
FROM forms.form_attachment a
WHERE a.id = :id::BIGINT
  AND a.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM forms.form_attachment d WHERE d.s3_key = a.s3_key AND d.status = 'deleted')
  AND btrim(COALESCE(:form_number_prefix, '')) <> ''
  AND a.form_number LIKE :form_number_prefix || '%'
  AND (btrim(COALESCE(:attachment_form_type, '')) = '' OR starts_with(a.s3_key, :attachment_form_type || '/'));
