/*
description: Name of an organisation (users.organisation) by its code, e.g. the inspecting authority of a form
  (PPA, KLIM, TRAM). Used by citizen detail endpoints, where the officer-only organisations list is not available.
namespace: citizen
params:
  code:
    type: string
    required: false
returns:
- name: name
  type: string
  nullable: true
*/
SELECT o.name
  FROM users.organisation o
 WHERE o.code = :code
 LIMIT 1;
