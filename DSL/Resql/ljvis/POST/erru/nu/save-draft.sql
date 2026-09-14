/*
description: "Create or revise an NU draft exclusively through nu_save_draft; a null key creates a new message."
namespace: erru
params:
  key:
    type: integer
    required: false
  expectedVersion:
    type: integer
    required: false
  sourceGoodReputeFormKey:
    type: integer
    required: false
  sourceSnapshotId:
    type: integer
    required: false
  payload:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
- name: result
  type: string
*/
SELECT erru.nu_save_draft(:key::BIGINT, :expectedVersion::INTEGER, :sourceGoodReputeFormKey::BIGINT,
  :sourceSnapshotId::BIGINT, :payload::JSONB, :created_by)::TEXT AS result;
