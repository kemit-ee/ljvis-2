// Teavituse liigi (notification_type) käivitajad — mitte tuletatav
// backend-ist ega andmebaasist, seega hoitakse käsitsi kooskõlas DSL-i
// notification_type: "..." omistustega (vt DSL/Ruuter/ljvis/**/publish.yml,
// DSL/Ruuter.internal/ljvis/POST/notification/evaluate-technical-publish.yml,
// DSL/Ruuter.internal/ljvis/POST/erru/**/inbound-*.yml). Võtmed vastavad
// 'search.formType' i18n-nimestiku võtmetele.
export const NOTIFICATION_TYPE_TRIGGER_FORM_KEYS: Record<string, string[]> = {
  carrier_violation: ['foreignViolation'],
  labor_foreign_proposal: ['foreignViolation'],
  labor_kabotage: ['tramControlCard', 'spDriver', 'spTeammate'],
  driving_ban: ['vehicleTechnical', 'trailerTechnical'],
  weight_violation: ['spDriver'],
  // ncr_violation, ncr_response ja nu_inbound_received tulevad automaatselt
  // sisenevast ERRU sõnumist, mitte konkreetse LJVIS-vormi avaldamisest.
};
