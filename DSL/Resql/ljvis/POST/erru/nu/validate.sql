/*
description: "Validate normalized ERRU NU data."
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
SELECT erru.nu_validate(:payload::JSONB, :kind)::TEXT AS result;
