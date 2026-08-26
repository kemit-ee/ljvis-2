/*
declaration:
  version: 0.1
  description: "Insert a new file attachment record"
  method: post
  accepts: json
  returns: json
  namespace: forms
  allowlist:
    body:
      - field: form_number
        type: string
        description: "Form number"
      - field: file_name
        type: string
        description: "Original file name"
      - field: s3_key
        type: string
        description: "S3 object key"
      - field: created_by
        type: string
        description: "Personal code of uploader"
  response:
    fields:
      - field: id
        type: string
      - field: form_number
        type: string
      - field: file_name
        type: string
      - field: s3_key
        type: string
      - field: status
        type: string
      - field: created_at
        type: string
      - field: created_by
        type: string
*/
INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by)
VALUES (:form_number, :file_name, :s3_key, 'active', :created_by)
RETURNING id, form_number, file_name, s3_key, status, created_at, created_by;
