// Teavituse liigi (notification_type) käivitajad — mitte tuletatav
// backend-ist ega andmebaasist, seega hoitakse käsitsi kooskõlas DSL-i
// notification_type: "..." omistustega (vt DSL/Ruuter/ljvis/**/publish.yml,
// DSL/Ruuter.internal/ljvis/POST/notification/evaluate-technical-publish.yml,
// DSL/Ruuter.internal/ljvis/POST/erru/**/inbound-*.yml). Võtmed vastavad
// 'search.formType' i18n-nimestiku võtmetele.
export const NOTIFICATION_TYPE_TRIGGER_FORM_KEYS: Record<string, string[]> = {
  carrier_violation: [
    'foreignViolation',
    'tramControlCard',
    'spDriver',
    'spTeammate',
    'vehicleTechnical',
    'trailerTechnical',
  ],
  labor_foreign_proposal: ['foreignViolation'],
  labor_kabotage: ['tramControlCard', 'spDriver', 'spTeammate'],
  labor_tachograph_not_downloaded: ['spDriver', 'spTeammate'],
  driving_ban: ['vehicleTechnical', 'trailerTechnical'],
  weight_violation: ['spDriver'],
  // ncr_violation, ncr_response ja nu_inbound_received tulevad automaatselt
  // sisenevast ERRU sõnumist, mitte konkreetse LJVIS-vormi avaldamisest.
};

// Postkast 2.0 malli muutujad, mida LJVIS teavituse liigi kohta saadab
// (`parameters[0]` kehas, vt DSL/Ruuter.internal/ljvis/POST/notification/send-postkast.yml).
// Nimed peavad ühtima DSL-i `template_variables` omistuste ja
// docs/pk2-templates/*.json mallide `{{...}}` viidetega. Kirjeldused:
// i18n `notificationTemplateMapping.variables.<nimi>`. `recipient` lisatakse
// alati (adressaadi e-post) ega kuulu siia.
export const NOTIFICATION_TYPE_TEMPLATE_VARIABLES: Record<string, string[]> = {
  carrier_violation: [
    'formNumber',
    'companyName',
    'companyRegCode',
    'inspectionDateTime',
    'inspectionCountryCode',
    'inspectionCountry',
    'vehicleRegNr',
    'violationSeverities',
    'violationDescription',
    'MSIViolationsList',
    'VSIViolationsList',
    'SIViolationsList',
  ],
  labor_foreign_proposal: [
    'formNumber',
    'companyName',
    'companyRegCode',
    'vehicleRegNr',
    'vehicleMake',
    'vehicleModel',
    'vehicleVin',
    'inspectionCountry',
    'inspectionDate',
    'inspectionTime',
  ],
  labor_kabotage: ['formNumber', 'companyName', 'companyRegCode', 'resultType'],
  labor_tachograph_not_downloaded: ['formNumber', 'companyName', 'companyRegCode'],
};
