/*
description: Insert a new file attachment record
namespace: forms
params:
  form_number:
    type: string
    required: false
    description: Form number
  file_name:
    type: string
    required: false
    description: Original file name
  form_number_prefix:
    type: string
    required: false
    description: Server-known form number prefix of the form type (e.g. vr-). The insert is refused unless form_number starts with it.
  s3_key:
    type: string
    required: false
    description: S3 object key
  created_by:
    type: string
    required: false
    description: Personal code of uploader
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
INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by)
SELECT :form_number, :file_name, :s3_key, 'active', :created_by
WHERE btrim(COALESCE(:form_number_prefix, '')) <> ''
  AND :form_number LIKE :form_number_prefix || '%'
RETURNING id, form_number, file_name, s3_key, status, created_at, created_by;
