/*
description: Server-owned exceptions for unknown dates on imported forms. No client flag is trusted.
namespace: control-forms
params:
  id:
    type: string
    required: false
returns:
- name: birthUnknown
  type: boolean
- name: certificateUnknown
  type: boolean
- name: unfitFromUnknown
  type: boolean
- name: unfitUntilUnknown
  type: boolean
*/
WITH latest AS (
 SELECT * FROM forms.good_repute_form WHERE good_repute_form_key=NULLIF(:id,'')::bigint
 ORDER BY created_at DESC,id DESC LIMIT 1
)
SELECT coalesce((SELECT legacy_import AND date_of_birth IS NULL FROM latest),false) AS birth_unknown,
 coalesce((SELECT legacy_import AND certificate_issue_date IS NULL FROM latest),false) AS certificate_unknown,
 coalesce((SELECT legacy_import AND fitness_status='unfit' AND unfit_from_date IS NULL FROM latest),false) AS unfit_from_unknown,
 coalesce((SELECT legacy_import AND fitness_status='unfit' AND unfit_until_date IS NULL FROM latest),false) AS unfit_until_unknown;
