/*
description: Citizen compound-form detail header extras - the name of the inspecting authority (looked up from the
  inspector's organisation code, users.organisation) and the name of the crew member (meeskonnaliige) of the latest
  published sp_teammate sub-form, if any. Ownership/publish-status of the parent koondvorm is checked by the calling
  Ruuter DSL before this query runs; only compound_form_key is taken.
namespace: citizen
params:
  compound_form_key:
    type: number
    required: false
returns:
- name: authority_name
  type: string
  nullable: true
- name: teammate_first_name
  type: string
  nullable: true
- name: teammate_last_name
  type: string
  nullable: true
*/
SELECT
    (SELECT o.name
       FROM users.organisation o
      WHERE o.code = cf.inspector_organisation_id
      LIMIT 1) AS authority_name,
    tm.person_first_name AS teammate_first_name,
    tm.person_last_name AS teammate_last_name
FROM (
    SELECT inspector_organisation_id
      FROM forms.compound_form
     WHERE compound_form_key = :compound_form_key::BIGINT
     ORDER BY created_at DESC
     LIMIT 1
) cf
LEFT JOIN LATERAL (
    SELECT person_first_name, person_last_name
      FROM (
          SELECT DISTINCT ON (sp_teammate_form_key) *
            FROM forms.sp_teammate_form
           WHERE compound_form_key = :compound_form_key::BIGINT
           ORDER BY sp_teammate_form_key, created_at DESC
      ) l
     WHERE l.status = 'published'
     ORDER BY l.sp_teammate_form_key
     LIMIT 1
) tm ON TRUE;
