/*
description: 'Apply a matching e-toimik decision. Imported confirmed forms publish as a new snapshot;
  their parent publishes after its last child. All forms retain dev append-only history, revision and repeat-response protection.'
namespace: control-forms
params:
  key:
    type: integer
    required: false
    description: sp_driver_form_key
  found:
    type: string
    required: false
    description: '''true''/''1''/''yes'' kui e-toimik tagastas jõustunud otsuse; muidu no-op.'
  enforcementDecision:
    type: string
    required: false
  proceedingClosureBasis:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: subFormNumber
  type: string
  nullable: true
*/
SELECT * FROM forms.apply_etoimik_decision('sp_driver_form', :key::bigint, :found, :enforcementDecision, :proceedingClosureBasis);
