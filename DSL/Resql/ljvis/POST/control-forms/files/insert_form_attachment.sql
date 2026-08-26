/*
description: "Insert a new file attachment record"
namespace: forms
params:
  form_number:
    type: string
    required: false
    description: "Form number"
  file_name:
    type: string
    required: false
    description: "Original file name"
  s3_key:
    type: string
    required: false
    description: "S3 object key"
  created_by:
    type: string
    required: false
    description: "Personal code of uploader"
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
VALUES (:form_number, :file_name, :s3_key, 'active', :created_by)
RETURNING id, form_number, file_name, s3_key, status, created_at, created_by;
