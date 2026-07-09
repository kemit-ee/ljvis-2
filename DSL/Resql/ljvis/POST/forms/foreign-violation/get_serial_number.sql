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
SELECT nextval('forms.seq_foreign_violation_form_key') AS serial_number;
