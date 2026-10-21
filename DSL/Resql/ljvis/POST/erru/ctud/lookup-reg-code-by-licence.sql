/*
description: 'LJVIS2-144 / riskiskoori ühendus: resolves an Estonian company_reg_code from a community
  licence certified-copy number / community licence number, by matching against licence numbers already
  recorded on our own control forms (forms.compound_form, forms.foreign_violation_form,
  forms.tram_control_card). Needed because MTR X-tee checkCommunityLicence (DSL/Ruuter/ljvis/POST/v1/xroad/mtr/check-community-licence.yml)
  never returns the Estonian business registry code - inbound-request.yml needs it to look up the
  company''s risk score (risk-scores/current.yml takes company_reg_code, not a licence number). Exact
  match only, no fuzzy name search: a wrong match here would report a stranger company''s risk band to
  another member state. If no match is found the company simply has no LJVIS control history under this
  licence number, which also means it has no risk score - falling back to Grey/0 upstream is correct, not
  a degraded result. Matches against EITHER the certified-true-copy number or the community licence
  number (MTR''s own contract documents trueCopyNumber as accepting "either the certified true copy
  number or the community licence number itself" - our stored column historically holds either depending
  on how the control form was filled in). No status filter: even a superseded/deleted form snapshot is
  still valid evidence of the licence-number-to-reg-code identity link. Picks the most recently recorded
  link when multiple forms reference the same licence number.'
namespace: erru
params:
  trueCopyNumber:
    type: string
    required: false
  communityLicenceNumber:
    type: string
    required: false
returns:
- name: company_reg_code
  type: string
  nullable: true
*/
WITH candidates AS (
  SELECT company_reg_code, created_at
  FROM forms.compound_form
  WHERE company_reg_code ~ '^[0-9]{8}$'
    AND (
      (NULLIF(:trueCopyNumber, '') IS NOT NULL AND UPPER(company_activity_licence_copy_number) = UPPER(:trueCopyNumber))
      OR (NULLIF(:communityLicenceNumber, '') IS NOT NULL AND UPPER(company_activity_licence_copy_number) = UPPER(:communityLicenceNumber))
    )
  UNION ALL
  SELECT company_reg_code, created_at
  FROM forms.foreign_violation_form
  WHERE company_reg_code ~ '^[0-9]{8}$'
    AND (
      (NULLIF(:trueCopyNumber, '') IS NOT NULL AND UPPER(licence_copy_number) = UPPER(:trueCopyNumber))
      OR (NULLIF(:communityLicenceNumber, '') IS NOT NULL AND UPPER(licence_copy_number) = UPPER(:communityLicenceNumber))
    )
  UNION ALL
  SELECT company_reg_code, created_at
  FROM forms.tram_control_card
  WHERE company_reg_code ~ '^[0-9]{8}$'
    AND (
      (NULLIF(:trueCopyNumber, '') IS NOT NULL AND UPPER(company_activity_licence_copy_number) = UPPER(:trueCopyNumber))
      OR (NULLIF(:communityLicenceNumber, '') IS NOT NULL AND UPPER(company_activity_licence_copy_number) = UPPER(:communityLicenceNumber))
    )
)
SELECT company_reg_code
FROM candidates
ORDER BY created_at DESC
LIMIT 1;
