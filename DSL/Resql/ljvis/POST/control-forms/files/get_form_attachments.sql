/*
description: Get active file attachments for a form
namespace: forms
params:
  form_number:
    type: string
    required: false
    description: Form number
  form_number_prefix:
    type: string
    required: false
    description: 'Valikuline vorminumbri prefiks — kui antud, peab form_number sellega algama (IDOR-kaitse).'
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
SELECT
    id,
    form_number,
    file_name,
    s3_key,
    status,
    created_at,
    created_by
FROM forms.form_attachment
WHERE form_number = :form_number
  AND status = 'active'
  AND (btrim(COALESCE(:form_number_prefix, '')) = '' OR form_number LIKE :form_number_prefix || '%')
  AND (btrim(COALESCE(:attachment_form_type, '')) = '' OR starts_with(s3_key, :attachment_form_type || '/'))
ORDER BY created_at DESC;
