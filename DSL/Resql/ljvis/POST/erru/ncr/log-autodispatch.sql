/*
description: 'Record one automatic-NCR-dispatch attempt for an SP sub-form (LJVIS2-64). Written by the
  nightly cron (DSL/Ruuter.internal/.../cron/erru-ncr-autodispatch.yml) after it has tried to build +
  send the NCR. Exactly one row per (sp_form_key, sp_form_type) — a second attempt is silently ignored
  (ON CONFLICT DO NOTHING), which is also what keeps select-autodispatch-candidates.sql from re-selecting
  the same sub-form. outcome: ''acknowledged'' (ERRU hub confirmed receipt), ''error'' (negative ack or
  transport failure — the NCR message itself sits in status ''error'' for an officer to re-send manually),
  or ''build_failed'' (eeltäitmine returned no row, no NCR message created).'
namespace: erru
params:
  spFormKey:
    type: integer
    required: false
  spFormType:
    type: string
    required: false
  businessCaseId:
    type: string
    required: false
  ncrTo:
    type: string
    required: false
  outcome:
    type: string
    required: false
  errorMessage:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
*/
INSERT INTO erru.ncr_autodispatch_log
    (sp_form_key, sp_form_type, business_case_id, ncr_to, outcome, error_message, created_by)
VALUES
    (:spFormKey::BIGINT,
     :spFormType,
     NULLIF(:businessCaseId, ''),
     NULLIF(upper(:ncrTo), ''),
     :outcome,
     NULLIF(:errorMessage, ''),
     COALESCE(NULLIF(:created_by, ''), 'erru-cron'))
ON CONFLICT (sp_form_key, sp_form_type) DO NOTHING
RETURNING id;
