/*
description: "Record NU exchange state atomically."
namespace: erru
params:
  key:
    type: integer
  firstKey:
    type: string
  familyKey:
    type: string
  actor:
    type: string
  actorName:
    type: string
returns:
- name: result
  type: string
*/
SELECT erru.nu_begin_send(:key::BIGINT,:firstKey,:familyKey,:actor,:actorName)::TEXT AS result;
