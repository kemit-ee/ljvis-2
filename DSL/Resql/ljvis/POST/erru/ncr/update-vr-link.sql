/*
description: Update the linked foreign violation form key on the latest NCR message snapshot
namespace: erru
params:
  businessCaseId:
    type: string
    required: true
  foreignViolationFormKey:
    type: string
    required: true
returns:
- name: ncr_message_key
  type: number
  nullable: true
*/
UPDATE erru.ncr_message
SET linked_foreign_violation_form_key = :foreignViolationFormKey::BIGINT
WHERE business_case_id = :businessCaseId
  AND ncr_message_key = (
    SELECT ncr_message_key
    FROM erru.ncr_message
    WHERE business_case_id = :businessCaseId
    ORDER BY created_at DESC
    LIMIT 1
  )
RETURNING ncr_message_key;
