/*
description: "Search the local UNFIT register (forms.good_repute_form) for an incoming CGR inbound request (LJVIS2-139). Two match strategies, mirroring the CGR 7A/7B XSD choice: (A) name search — compare date_of_birth AND UPPER(last_name) against tmFamilyName AND UPPER(first_name) against tmFirstName; (B) certificate search — compare UPPER(certificate_number) against certNumber. Search (A) is used when both name fields and date_of_birth are supplied; search (B) when certNumber is supplied instead. Returns the LATEST snapshot of the best-matching confirmed or saved record. fitness_status = 'unfit' means the transport manager was declared unfit; the caller must check the status column. Returns zero rows when no match is found, meaning the person is not in the UNFIT register and the call must fall through to the MTR mock."
namespace: erru
params:
  tmFirstName:
    type: string
    required: false
  tmFamilyName:
    type: string
    required: false
  tmDateOfBirth:
    type: string
    required: false
  certNumber:
    type: string
    required: false
returns:
  - name: personal_code
    type: string
    nullable: true
  - name: first_name
    type: string
    nullable: true
  - name: last_name
    type: string
    nullable: true
  - name: date_of_birth
    type: string
    nullable: true
  - name: place_of_birth
    type: string
    nullable: true
  - name: certificate_number
    type: string
    nullable: true
  - name: certificate_issue_date
    type: string
    nullable: true
  - name: certificate_country_code
    type: string
    nullable: true
  - name: fitness_status
    type: string
    nullable: true
  - name: unfit_from_date
    type: string
    nullable: true
  - name: unfit_until_date
    type: string
    nullable: true
*/
-- Latest confirmed/saved snapshot per person, filtered by the match strategy
SELECT DISTINCT ON (good_repute_form_key)
  personal_code,
  first_name,
  last_name,
  date_of_birth,
  place_of_birth,
  certificate_number,
  certificate_issue_date,
  certificate_country_code,
  fitness_status,
  unfit_from_date,
  unfit_until_date
FROM forms.good_repute_form
WHERE status IN ('saved', 'confirmed')
  AND (
    -- 7A name search: match on date of birth AND both name fields (case-insensitive)
    (
      NULLIF(:tmDateOfBirth, '') IS NOT NULL
      AND date_of_birth = NULLIF(:tmDateOfBirth, '')::DATE
      AND UPPER(last_name) = UPPER(NULLIF(:tmFamilyName, ''))
      AND UPPER(first_name) = UPPER(NULLIF(:tmFirstName, ''))
    )
    OR
    -- 7B certificate search: match on certificate number (case-insensitive)
    (
      NULLIF(:certNumber, '') IS NOT NULL
      AND UPPER(certificate_number) = UPPER(NULLIF(:certNumber, ''))
    )
  )
ORDER BY good_repute_form_key, created_at DESC
LIMIT 1;
