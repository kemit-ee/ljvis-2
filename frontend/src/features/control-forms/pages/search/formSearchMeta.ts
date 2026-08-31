/**
 * LJVIS2-9 — metadata for each searchable form type: i18n label key, the read
 * detail route (opens the form in view mode), and the read permission that
 * makes rows of this type visible. Sub-forms open their own detail page by key.
 */
export interface FormTypeMeta {
  labelKey: string;
  route: (key: number) => string;
  readPermission: string;
}

export const FORM_TYPE_META: Record<string, FormTypeMeta> = {
  compound: {
    labelKey: 'search.formType.compound',
    route: (k) => `/control-forms/compound/${k}`,
    readPermission: 'compound_form.read',
  },
  foreign_violation: {
    labelKey: 'search.formType.foreignViolation',
    route: (k) => `/control-forms/foreign-violation/${k}`,
    readPermission: 'foreign_violation_form.read',
  },
  labour_inspection: {
    labelKey: 'search.formType.labourInspection',
    route: (k) => `/control-forms/labour-inspection/${k}`,
    readPermission: 'labour_inspection_form.read',
  },
  good_repute: {
    labelKey: 'search.formType.goodRepute',
    route: (k) => `/control-forms/good-repute/${k}`,
    readPermission: 'good_repute_form.read',
  },
  sp_driver: {
    labelKey: 'search.formType.spDriver',
    route: (k) => `/control-forms/sp-driver/${k}`,
    readPermission: 'sp_driver_form.read',
  },
  sp_teammate: {
    labelKey: 'search.formType.spTeammate',
    route: (k) => `/control-forms/sp-teammate/${k}`,
    readPermission: 'sp_teammate_form.read',
  },
  vehicle_technical: {
    labelKey: 'search.formType.vehicleTechnical',
    route: (k) => `/control-forms/vehicle-technical/${k}`,
    readPermission: 'vehicle_technical_form.read',
  },
  trailer_technical: {
    labelKey: 'search.formType.trailerTechnical',
    route: (k) => `/control-forms/trailer-technical/${k}`,
    readPermission: 'trailer_technical_form.read',
  },
  adr: {
    labelKey: 'search.formType.adr',
    route: (k) => `/control-forms/adr/${k}`,
    readPermission: 'adr_form.read',
  },
  kv: {
    labelKey: 'search.formType.kv',
    route: (k) => `/control-forms/transport-interruption/${k}`,
    readPermission: 'transport_interruption_form.read',
  },
  tram_compound: {
    labelKey: 'search.formType.tramCompound',
    route: (k) => `/control-forms/tram-driver/${k}`,
    readPermission: 'tram_driver_form.read',
  },
  tram_driver: {
    labelKey: 'search.formType.tramDriver',
    // k is the compound_form_key (see FormSearchPage.openRow) — the TRAM page
    // loads the card + its driver sub-form by the compound key.
    route: (k) => `/control-forms/tram-driver/${k}`,
    readPermission: 'tram_driver_form.read',
  },
};

export const FORM_TYPE_ORDER: string[] = [
  'compound',
  'foreign_violation',
  'labour_inspection',
  'good_repute',
  'sp_driver',
  'sp_teammate',
  'vehicle_technical',
  'trailer_technical',
  'adr',
  'kv',
  'tram_compound',
  'tram_driver',
];

/** Route for a result row; falls back to '#' for unknown types. */
export function resolveFormRoute(formType: string, formKey: number): string {
  return FORM_TYPE_META[formType]?.route(formKey) ?? '#';
}
