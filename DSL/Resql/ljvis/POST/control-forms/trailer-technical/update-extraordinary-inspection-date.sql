/*
description: 'Kirjuta tunniloleva yvkehtivus sünkroonimisega (LJVIS2-135/58/23) leitud erakorralise ülevaatuse
  kuupäev trailer_technical_form uusimale confirmed snapshot-reale. INSERT-only: lisab uue snapshot-rea (revision
  + 1, version ja kõik muud väljad kantakse edasi), vana rida jääb ajalukku. Mõjutab ainult extraordinary_inspection_date''i,
  seega ei saa see kunagi üle kirjutada enforcement_decision/proceeding_closure_basis''it (need tulevad eraldi
  cron''ist). Isekaitstud (status=''confirmed'' JA extraordinary_inspection_date IS NULL JA sissetulev kuupäev
  ei ole tühi) — korduvkutse on idempotentne, kutsuja kutsub seda iga kandidaadi kohta tingimusteta (Ruuteri
  iterate ei saa `do:` sees `next:`-iga hargneda). Peegeldab vehicle-technical/update-extraordinary-inspection-date.sql.
  created_by = ''system''.'
namespace: control-forms
params:
  key:
    type: integer
    required: false
    description: trailer_technical_form_key
  extraordinaryInspectionDate:
    type: string
    required: false
    description: ISO date (yyyy-MM-dd); empty/omitted is a no-op.
returns:
- name: id
  type: number
  nullable: true
- name: subFormNumber
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM forms.trailer_technical_form
  WHERE trailer_technical_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.trailer_technical_form
SELECT (jsonb_populate_record(
    NULL::forms.trailer_technical_form,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.trailer_technical_form_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', 'system',
      'extraordinary_inspection_date', NULLIF(:extraordinaryInspectionDate, '')::DATE
    )
)).*
FROM latest l
WHERE l.status = 'confirmed'
  AND l.extraordinary_inspection_date IS NULL
  AND NULLIF(:extraordinaryInspectionDate, '') IS NOT NULL
RETURNING trailer_technical_form_key AS id, sub_form_number, version;
