/*
description: "Record NU exchange state atomically."
namespace: erru
params:
  key:
    type: integer
  memberStates:
    type: string
  failure:
    type: string
returns:
- name: result
  type: string
*/
SELECT erru.nu_finish_send(:key::BIGINT,NULLIF(:memberStates,'')::JSONB,NULLIF(:failure,''))::TEXT AS result;
