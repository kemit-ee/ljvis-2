/*
description: >-
  Read-access decision for one form (epic 502, A2 read). Resolves the latest snapshot of the form by
  form key or form number and decides whether the caller may read it. The caller already holds the
  form type read permission (checked in Ruuter); this adds the ownership rule. Returns no row when
  the form does not exist in the live database, so the handler answers 404 or falls back to the archive.
namespace: control-forms
params:
  form_type:
    type: string
    required: false
    description: Form type slug used in the URL (adr-form, compound-form, drive-rest-form/driver, ...)
  form_key:
    type: string
    required: false
    description: Form key (digits). Empty when looking up by form number.
  form_number:
    type: string
    required: false
    description: Form number (sub-form number for sub-forms). Empty when looking up by key.
  caller_personal_code:
    type: string
    required: false
    description: Caller personal code from the TARA session (auth_user.personalcode)
  caller_organisation_id:
    type: string
    required: false
    description: Caller organisation id (auth_user.organisationid); empty when unknown
  caller_view_unpublished:
    type: string
    required: false
    description: "Literal true when the caller has control_form.view_unpublished"
returns:
- name: allowed
  type: boolean
  nullable: false
- name: status
  type: string
  nullable: true
*/
-- Reegel: avalikustatud vorm on nähtav igaühele, kellel on vormitüübi `.read` õigus; avalikustamata
-- (saved/confirmed/deleted) vormi näeb looja, looja asutuse kolleeg (viimane users.user_account
-- kirje) või `control_form.view_unpublished` omaja.
WITH target AS (
  (SELECT status, created_by
   FROM forms.adr_form
   WHERE :form_type = 'adr-form'
     AND (adr_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.compound_form
   WHERE :form_type = 'compound-form'
     AND (compound_form_key = NULLIF(:form_key, '')::BIGINT OR form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.sp_driver_form
   WHERE :form_type = 'drive-rest-form/driver'
     AND (sp_driver_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.sp_teammate_form
   WHERE :form_type = 'drive-rest-form/teammate'
     AND (sp_teammate_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.foreign_violation_form
   WHERE :form_type = 'foreign-violation-form'
     AND (foreign_violation_form_key = NULLIF(:form_key, '')::BIGINT OR form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.good_repute_form
   WHERE :form_type = 'good-repute'
     AND (good_repute_form_key = NULLIF(:form_key, '')::BIGINT OR form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.labour_inspection_form
   WHERE :form_type = 'labour-inspection'
     AND (labour_inspection_form_key = NULLIF(:form_key, '')::BIGINT OR form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.trailer_technical_form
   WHERE :form_type = 'trailer-technical'
     AND (trailer_technical_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.tram_control_card
   WHERE :form_type = 'tram-card'
     AND (tram_control_card_key = NULLIF(:form_key, '')::BIGINT OR form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.kv_form
   WHERE :form_type = 'transport-interruption'
     AND (kv_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
  UNION ALL
  (SELECT status, created_by
   FROM forms.vehicle_technical_form
   WHERE :form_type = 'vehicle-technical'
     AND (vehicle_technical_form_key = NULLIF(:form_key, '')::BIGINT OR sub_form_number = NULLIF(:form_number, ''))
   ORDER BY created_at DESC, id DESC
   LIMIT 1)
)
SELECT
  (
    t.status = 'published'
    OR :caller_view_unpublished = 'true'
    OR (COALESCE(:caller_personal_code, '') <> '' AND t.created_by = :caller_personal_code)
    OR (
      COALESCE(:caller_organisation_id, '') <> ''
      AND (
        SELECT ua.organisation_id::text
        FROM users.user_account ua
        WHERE ua.personal_code = t.created_by
        ORDER BY ua.created_at DESC
        LIMIT 1
      ) = :caller_organisation_id
    )
  ) AS allowed,
  t.status
FROM target t
LIMIT 1;
