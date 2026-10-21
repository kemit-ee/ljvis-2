/*
description: "Record the Hub outcome of an outgoing NU dispatch: sending becomes sent (accepted), error (rejected) or send_unknown (uncertain). Repeating it changes nothing."
namespace: erru
params:
  key:
    type: integer
  outcome:
    type: string
  failure:
    type: string
returns:
- name: result
  type: string
*/
SELECT erru.nu_mark_dispatch(:key::BIGINT, :outcome, NULLIF(:failure,''))::TEXT AS result;
