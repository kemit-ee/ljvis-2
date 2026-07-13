/*
declaration:
  version: 0.1
  description: "Get a single active file attachment by ID"
  method: post
  accepts: json
  returns: json
  namespace: forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Attachment record ID"
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
SELECT id, form_number, file_name, s3_key, status, created_at, created_by
FROM forms.form_attachment
WHERE id = :id::BIGINT
  AND status = 'active';
