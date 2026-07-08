/*
declaration:
  version: 0.1
  description: "Get serial number for foreign violation form"
  method: post
  namespace: forms
  returns: json
  response:
    fields:
      - field: serial_number
        type: number
*/
SELECT COALESCE(MAX(foreign_violation_form_key), 0) + 1 AS serial_number
FROM forms.foreign_violation_form;
