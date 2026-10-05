/*
description: 'X-tee RegisterJobInspection_v2 (LJVIS1 SOAP leping): kirjutab forms.labour_inspection_form
  tabelisse funktsiooni forms.register_external_labour_inspection kaudu (allikas xroad-v2, saatja
  kontrolli_id ilma prefiksita — sama mis LJVIS1 RavenDB V2 migratsioonis). Täpne kordus: unchanged;
  muudetud kordus saved-aktile: uus snapshot (updated); muudetud kordus lukustatud aktile: conflict.
  REST v3 kasutab eraldi päringut register-job-inspection-v3-insert.'
namespace: xroad
params:
  externalInspectionId:
    type: string
    required: true
  inspectorName:
    type: string
    required: false
  inspectionDate:
    type: string
    required: false
  inspectionType:
    type: string
    required: false
  companyName:
    type: string
    required: false
  companyRegCode:
    type: string
    required: false
  vehicleCount:
    type: string
    required: false
  prescriptionComposed:
    type: string
    required: false
  controlsMatrix:
    type: string
    required: false
  violations:
    type: string
    required: false
  punishedPersonIdCode:
    type: string
    required: false
  punishedPersonFirstName:
    type: string
    required: false
  punishedPersonLastName:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: form_number
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
- name: outcome
  type: string
  nullable: true
- name: skipped
  type: boolean
  nullable: true
*/

SELECT r.id, r.form_number, r.version, r.status, r.outcome, r.outcome <> 'created' AS skipped
FROM forms.register_external_labour_inspection(
  'xroad-v2', :externalInspectionId, 'new_snapshot',
  :inspectorName, :inspectionDate, :inspectionType,
  :companyName, :companyRegCode, :vehicleCount,
  :prescriptionComposed, :controlsMatrix, :violations,
  :punishedPersonIdCode, :punishedPersonFirstName, :punishedPersonLastName,
  :proceedingReferenceNumber, :created_by
) r;
