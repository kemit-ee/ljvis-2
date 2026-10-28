/*
description: Resolve a set of personal_code values to display names - kasutusel halduses, kus
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
- name: first_name
  type: string
  nullable: true
- name: last_name
  type: string
  nullable: true
- name: personal_code
  type: string
  nullable: true
*/
-- Plain snake_case columns (no quoted camelCase aliases): Resql-on-Rust auto-converts
-- snake_case to camelCase in the JSON response, but a quoted "firstName"-style alias
-- has no underscore to split on and comes back lowercased ("firstname").
SELECT DISTINCT ON (ua.personal_code)
    ua.user_account_key AS id,
    ua.first_name,
    ua.last_name,
    ua.personal_code
FROM users.user_account ua
WHERE ua.personal_code = ANY (string_to_array(:personal_codes, ','))
ORDER BY ua.personal_code, ua.created_at DESC;
