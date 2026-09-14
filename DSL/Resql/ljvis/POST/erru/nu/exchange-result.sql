/*
description: "Record NU exchange state atomically."
namespace: erru
params:
  payload:
    type: string
  kind:
    type: string
returns:
- name: result
  type: string
*/
SELECT erru.nu_record_exchange_result(:payload::JSONB,:kind)::TEXT AS result;
