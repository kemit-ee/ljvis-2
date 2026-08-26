/*
declaration:
  version: 0.1
  description: "Soft-delete a file attachment by setting status to deleted"
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
UPDATE forms.form_attachment
SET status = 'deleted'
WHERE id = :id::BIGINT
RETURNING id, form_number, file_name, s3_key, status, created_at, created_by;
