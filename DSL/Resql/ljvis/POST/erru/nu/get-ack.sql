/*
description: "Record NU exchange state atomically."
namespace: erru
params:
  key:
    type: integer
returns:
- name: result
  type: string
*/
SELECT erru.nu_register_ack(:key::BIGINT)::TEXT AS result;
