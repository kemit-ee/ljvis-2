/*
description: 'Soft-delete a file attachment: INSERT-only tombstone (epic #522 T2). Lisab sama faili (form_number,
  file_name, s3_key) kohta uue rea status=''deleted'' ja created_by = tegutsev kasutaja; algne ''active'' rida jääb
  alles. Lugejad (get_form_attachments, get_form_attachment_by_id) peidavad aktiivse rea, kui sama s3_key''ga ''deleted''
  rida on olemas. Osaline UNIQUE (s3_key) WHERE status=''deleted'' tagab, et samaaegne topeltkustutus lisab vaid
  ühe tombstone''i. Tagastab kustutatud faili algse rea (id on algse manuse id) staatusega ''deleted''.'
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
  attachment_form_type:
    type: string
    required: false
    description: Optional S3 folder type, required by SP routes to distinguish driver and teammate forms with the same number
  created_by:
    type: string
    required: false
    description: Tegutsev kasutaja (TARA sessioon); tühi -> 'system'
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
WITH target AS (
  SELECT a.id, a.form_number, a.file_name, a.s3_key, a.created_at, a.created_by
  FROM forms.form_attachment a
  WHERE a.id = :id::BIGINT
    AND a.status = 'active'
    AND btrim(COALESCE(:form_number_prefix, '')) <> ''
    AND a.form_number LIKE :form_number_prefix || '%'
    AND (btrim(COALESCE(:attachment_form_type, '')) = '' OR starts_with(a.s3_key, :attachment_form_type || '/'))
    AND NOT EXISTS (
      SELECT 1 FROM forms.form_attachment d
      WHERE d.s3_key = a.s3_key AND d.status = 'deleted'
    )
),
tombstone AS (
  INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by)
  SELECT t.form_number, t.file_name, t.s3_key, 'deleted', COALESCE(NULLIF(:created_by, ''), 'system')
  FROM target t
  ON CONFLICT (s3_key) WHERE status = 'deleted' DO NOTHING
  RETURNING id
)
SELECT t.id, t.form_number, t.file_name, t.s3_key, 'deleted'::varchar AS status, t.created_at, t.created_by
FROM target t
WHERE EXISTS (SELECT 1 FROM tombstone);
