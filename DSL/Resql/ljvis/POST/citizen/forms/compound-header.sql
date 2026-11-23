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
WITH tm AS (
    SELECT person_first_name, person_last_name
      FROM (
          SELECT DISTINCT ON (sp_teammate_form_key) *
            FROM forms.sp_teammate_form
           WHERE compound_form_key = :compound_form_key::BIGINT
           ORDER BY sp_teammate_form_key, created_at DESC
      ) l
     WHERE l.status = 'published'
       AND l.selection_status = 'active'
     ORDER BY l.sp_teammate_form_key
     LIMIT 1
)
SELECT
    (SELECT o.name
       FROM users.organisation o
      WHERE o.code = (SELECT cf.inspector_organisation_id
                        FROM forms.compound_form cf
                       WHERE cf.compound_form_key = :compound_form_key::BIGINT
                       ORDER BY cf.created_at DESC
                       LIMIT 1)
      LIMIT 1) AS authority_name,
    (SELECT person_first_name FROM tm) AS teammate_first_name,
    (SELECT person_last_name FROM tm) AS teammate_last_name;
