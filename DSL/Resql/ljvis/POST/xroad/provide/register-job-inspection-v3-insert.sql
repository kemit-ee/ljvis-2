/*
description: 'X-tee RegisterJobInspection_v3 (REST): kirjutab forms.labour_inspection_form tabelisse
  funktsiooni forms.register_external_labour_inspection kaudu (allikas xroad-v3; external_inspection_id
  veerg jääb kujule v3-<kontrolli_id>). Senine leping: korduspäring sama kontrolli_id-ga tagastab
  olemasoleva akti (skipped=true) ega rakenda muudatusi (keep_first). Samaaegsed esmased päringud
  loovad ühe akti.'
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
  'xroad-v3', :externalInspectionId, 'keep_first',
  :inspectorName, :inspectionDate, :inspectionType,
  :companyName, :companyRegCode, :vehicleCount,
  :prescriptionComposed, :controlsMatrix, :violations,
  :punishedPersonIdCode, :punishedPersonFirstName, :punishedPersonLastName,
  :proceedingReferenceNumber, :created_by
) r;
