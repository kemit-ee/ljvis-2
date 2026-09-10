/*
description: Soft-delete a file attachment by setting status to deleted
namespace: forms
params:
  id:
    type: integer
    required: false
    description: Attachment record ID
  form_number_prefix:
    type: string
    required: false
    description: 'Vorminumbri prefiks — kohustuslik IDOR-kaitse (vt get_form_attachment_by_id.sql). Tühi/NULL → 0 rida kustutatud.'
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
UPDATE forms.form_attachment
SET status = 'deleted'
WHERE id = :id::BIGINT
  AND btrim(COALESCE(:form_number_prefix, '')) <> ''
  AND form_number LIKE :form_number_prefix || '%'
RETURNING id, form_number, file_name, s3_key, status, created_at, created_by;
