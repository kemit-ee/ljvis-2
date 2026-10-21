/*
description: Count the active (not deleted) sub-forms of a compound form and how many of them are not yet published (latest snapshot per sub-form)
namespace: control-forms
params:
  compoundFormKey:
    type: integer
    required: false
    description: Compound form key
returns:
- name: totalCount
  type: number
  nullable: true
- name: unpublishedCount
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (sp_driver_form_key) status FROM forms.sp_driver_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY sp_driver_form_key, created_at DESC
), teammate AS (
  SELECT DISTINCT ON (sp_teammate_form_key) status FROM forms.sp_teammate_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY sp_teammate_form_key, created_at DESC
), vehicle AS (
  SELECT DISTINCT ON (vehicle_technical_form_key) status FROM forms.vehicle_technical_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY vehicle_technical_form_key, created_at DESC
), trailer AS (
  SELECT DISTINCT ON (trailer_technical_form_key) status FROM forms.trailer_technical_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY trailer_technical_form_key, created_at DESC
), adr AS (
  SELECT DISTINCT ON (adr_form_key) status FROM forms.adr_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY adr_form_key, created_at DESC
), kv AS (
  SELECT DISTINCT ON (kv_form_key) status FROM forms.kv_form
  WHERE compound_form_key = :compoundFormKey::BIGINT
  ORDER BY kv_form_key, created_at DESC
), active AS (
  SELECT status FROM latest UNION ALL SELECT status FROM teammate
  UNION ALL SELECT status FROM vehicle UNION ALL SELECT status FROM trailer
  UNION ALL SELECT status FROM adr UNION ALL SELECT status FROM kv
)
SELECT
  COUNT(*) FILTER (WHERE status <> 'deleted') AS total_count,
  COUNT(*) FILTER (WHERE status NOT IN ('deleted', 'published')) AS unpublished_count
FROM active;
