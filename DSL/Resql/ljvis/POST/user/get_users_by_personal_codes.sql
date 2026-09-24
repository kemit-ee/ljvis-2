/*
description: Resolve a set of personal_code values to display names — kasutusel halduses, kus
  saajate ring on salvestatud personal_code'idena (nt notification_template_mapping.desktop_recipient_personal_codes)
  ja tuleb kuvada nimedena.
namespace: user
params:
  personal_codes:
    type: string
    required: false
    description: Comma-separated personal_code list
returns:
- name: id
  type: string
  nullable: true
- name: firstName
  type: string
  nullable: true
- name: lastName
  type: string
  nullable: true
- name: personalCode
  type: string
  nullable: true
*/
SELECT DISTINCT ON (ua.personal_code)
    ua.user_account_key AS id,
    ua.first_name AS "firstName",
    ua.last_name AS "lastName",
    ua.personal_code AS "personalCode"
FROM users.user_account ua
WHERE ua.personal_code = ANY (string_to_array(:personal_codes, ','))
ORDER BY ua.personal_code, ua.created_at DESC;
