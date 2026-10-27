/*
description: "Merge an asynchronous NotifyUnfitness_Acknowledgement into the outgoing NU message identified by workflowId. Replays change nothing. A null result means the workflow is unknown."
namespace: erru
params:
  workflowId:
    type: string
  technicalId:
    type: string
  fromCountry:
    type: string
  memberStates:
    type: string
returns:
- name: result
  type: string
  nullable: true
*/
SELECT erru.nu_apply_ack(:workflowId::UUID, :technicalId::UUID, :fromCountry, :memberStates::JSONB)::TEXT AS result;
