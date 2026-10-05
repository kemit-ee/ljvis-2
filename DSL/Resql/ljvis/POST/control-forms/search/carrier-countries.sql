/*
description: Distinct carrier country codes (company country, EE when unset) of all forms in forms.form_search.
  Used by the form-search "Vedaja riik" filter.
namespace: control-forms
params: {}
returns:
- name: country_code
  type: string
  nullable: true
*/
SELECT DISTINCT COALESCE(NULLIF(fs.company_country_code, ''), 'EE') AS country_code
FROM forms.form_search fs
ORDER BY country_code;
