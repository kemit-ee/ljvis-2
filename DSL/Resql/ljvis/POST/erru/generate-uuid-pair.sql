/*
description: 'Generate two independent cryptographically strong random UUIDs (Postgres
  gen_random_uuid()) in a single round trip. Used by every ERRU outbound send flow
  (CGR/CTUD/NCR request+response/RSI) to obtain technicalId/workflowId right before composing
  the outbound SOAP message, replacing a Math.random()-based UUID v4 IIFE that used to be
  copied verbatim into five separate Ruuter DSL files (seven call sites total). Math.random()
  is not a cryptographically secure source, and for technicalId — the field used to correlate
  an incoming ERRU ACK/ErrorNotification back to the outbound message that caused it — a
  collision means a hub reply gets attributed to the wrong case. NU already solved this
  correctly on the Postgres side (erru.nu_begin_send); this gives the other four flows the
  same guarantee without needing a per-module PL/pgSQL function, since none of them need
  anything beyond "two independent random UUIDs".
  Callers that only need one id (e.g. NCR response, whose workflowId must be the INCOMING
  request''s workflowId, not a fresh one) simply ignore the unused field.'
namespace: erru
returns:
- name: technical_id
  type: string
  nullable: false
- name: workflow_id
  type: string
  nullable: false
*/
SELECT gen_random_uuid()::TEXT AS technical_id, gen_random_uuid()::TEXT AS workflow_id;
