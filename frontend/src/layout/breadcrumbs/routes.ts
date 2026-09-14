/**
 * Static breadcrumb registry.
 *
 * Each entry maps a route pattern (same syntax as react-router `path`) to a
 * translation key for its breadcrumb label and, optionally, the pattern of
 * its parent route. The parent pattern may reuse the same `:param` names as
 * the child — they are filled in from the current route's matched params
 * when the parent crumb is resolved.
 *
 * Order matters for patterns that overlap at the same depth (e.g. a static
 * segment like `new` vs. a dynamic `:id`): the first matching entry wins, so
 * more specific/static patterns must be listed before dynamic ones.
 */
export interface BreadcrumbRouteEntry {
  pattern: string;
  labelKey: string;
  parent?: string;
}

export const BREADCRUMB_ROUTES: BreadcrumbRouteEntry[] = [
  { pattern: '/search', labelKey: 'nav.search', parent: '/' },

  // Users
  { pattern: '/users/new', labelKey: 'breadcrumbs.userCreate', parent: '/users' },
  { pattern: '/users/:id', labelKey: 'breadcrumbs.userDetail', parent: '/users' },
  { pattern: '/users', labelKey: 'nav.users', parent: '/' },

  // User groups
  {
    pattern: '/user-groups/new',
    labelKey: 'breadcrumbs.userGroupCreate',
    parent: '/user-groups',
  },
  {
    pattern: '/user-groups/:id/add-user',
    labelKey: 'breadcrumbs.userGroupAddUser',
    parent: '/user-groups/:id',
  },
  {
    pattern: '/user-groups/:id',
    labelKey: 'breadcrumbs.userGroupDetail',
    parent: '/user-groups',
  },
  { pattern: '/user-groups', labelKey: 'nav.userGroups', parent: '/' },

  // Classifiers
  {
    pattern: '/classifiers/:id/add-value',
    labelKey: 'breadcrumbs.classifierValueCreate',
    parent: '/classifiers/:id',
  },
  {
    pattern: '/classifiers/:id/:valueId',
    labelKey: 'breadcrumbs.classifierValueEdit',
    parent: '/classifiers/:id',
  },
  {
    pattern: '/classifiers/:id',
    labelKey: 'breadcrumbs.classifierDetail',
    parent: '/classifiers',
  },
  { pattern: '/classifiers', labelKey: 'nav.classifiers', parent: '/' },

  // Logs
  { pattern: '/logs/:id', labelKey: 'breadcrumbs.logDetail', parent: '/logs' },
  { pattern: '/logs', labelKey: 'nav.logs', parent: '/' },

  // Admin / misc
  { pattern: '/admin/risk-scores', labelKey: 'nav.riskScores', parent: '/' },
  { pattern: '/notifications', labelKey: 'nav.notifications', parent: '/' },

  // Control forms — foreign violation
  {
    pattern: '/control-forms/foreign-violation/new',
    labelKey: 'breadcrumbs.foreignViolationForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/foreign-violation/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/foreign-violation/:id',
  },
  {
    pattern: '/control-forms/foreign-violation/:id',
    labelKey: 'breadcrumbs.foreignViolationForm',
    parent: '/',
  },

  // Control forms — compound (koondvorm)
  {
    pattern: '/control-forms/compound/new',
    labelKey: 'breadcrumbs.compoundForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/compound/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/compound/:id',
  },
  {
    pattern: '/control-forms/compound/:id',
    labelKey: 'breadcrumbs.compoundForm',
    parent: '/',
  },

  // Control forms — sõidu- ja puhkeaeg (driver / teammate)
  {
    pattern: '/control-forms/sp-driver/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/sp-driver/:id',
  },
  {
    pattern: '/control-forms/sp-driver/:id',
    labelKey: 'breadcrumbs.driveRestDriverForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/sp-teammate/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/sp-teammate/:id',
  },
  {
    pattern: '/control-forms/sp-teammate/:id',
    labelKey: 'breadcrumbs.driveRestTeammateForm',
    parent: '/',
  },

  // Control forms — TRAM control card (ADR-002)
  {
    pattern: '/control-forms/tram-control-card/new',
    labelKey: 'breadcrumbs.tramControlCard',
    parent: '/',
  },
  {
    pattern: '/control-forms/tram-control-card/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/tram-control-card/:id',
  },
  {
    pattern: '/control-forms/tram-control-card/:id',
    labelKey: 'breadcrumbs.tramControlCard',
    parent: '/',
  },

  // Control forms — labour inspection
  {
    pattern: '/control-forms/labour-inspection/new',
    labelKey: 'breadcrumbs.labourInspectionForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/labour-inspection/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/labour-inspection/:id',
  },
  {
    pattern: '/control-forms/labour-inspection/:id',
    labelKey: 'breadcrumbs.labourInspectionForm',
    parent: '/',
  },

  // Control forms — vehicle / trailer technical check
  {
    pattern: '/control-forms/vehicle-technical/new/:compoundFormKey',
    labelKey: 'breadcrumbs.vehicleTechnicalForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/vehicle-technical/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/vehicle-technical/:id',
  },
  {
    pattern: '/control-forms/vehicle-technical/:id',
    labelKey: 'breadcrumbs.vehicleTechnicalForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/trailer-technical/new/:compoundFormKey',
    labelKey: 'breadcrumbs.trailerTechnicalForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/trailer-technical/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/trailer-technical/:id',
  },
  {
    pattern: '/control-forms/trailer-technical/:id',
    labelKey: 'breadcrumbs.trailerTechnicalForm',
    parent: '/',
  },

  // Control forms — transport interruption
  {
    pattern: '/control-forms/transport-interruption/new/:compoundFormKey',
    labelKey: 'breadcrumbs.transportInterruptionForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/transport-interruption/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/transport-interruption/:id',
  },
  {
    pattern: '/control-forms/transport-interruption/:id',
    labelKey: 'breadcrumbs.transportInterruptionForm',
    parent: '/',
  },

  // Control forms — ADR
  {
    pattern: '/control-forms/adr/new/:compoundFormKey',
    labelKey: 'breadcrumbs.adrForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/adr/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/adr/:id',
  },
  { pattern: '/control-forms/adr/:id', labelKey: 'breadcrumbs.adrForm', parent: '/' },

  // Control forms — good repute
  {
    pattern: '/control-forms/good-repute/new',
    labelKey: 'breadcrumbs.goodReputeForm',
    parent: '/',
  },
  {
    pattern: '/control-forms/good-repute/:id/:snapshotId',
    labelKey: 'breadcrumbs.snapshot',
    parent: '/control-forms/good-repute/:id',
  },
  {
    pattern: '/control-forms/good-repute/:id',
    labelKey: 'breadcrumbs.goodReputeForm',
    parent: '/',
  },

  // ERRU — CTUD
  { pattern: '/erru/ctud/new', labelKey: 'breadcrumbs.ctudCreate', parent: '/erru/ctud' },
  { pattern: '/erru/ctud/:id', labelKey: 'breadcrumbs.ctudDetail', parent: '/erru/ctud' },
  { pattern: '/erru/ctud', labelKey: 'nav.ctud', parent: '/' },

  // ERRU — CGR
  { pattern: '/erru/cgr/new', labelKey: 'breadcrumbs.cgrCreate', parent: '/erru/cgr' },
  { pattern: '/erru/cgr/:id', labelKey: 'breadcrumbs.cgrDetail', parent: '/erru/cgr' },
  { pattern: '/erru/cgr', labelKey: 'nav.cgr', parent: '/' },

  // ERRU — RSI
  { pattern: '/erru/rsi/new', labelKey: 'breadcrumbs.rsiCreate', parent: '/erru/rsi' },
  { pattern: '/erru/rsi/:id', labelKey: 'breadcrumbs.rsiDetail', parent: '/erru/rsi' },
  { pattern: '/erru/rsi', labelKey: 'nav.rsi', parent: '/' },

  // ERRU — NCR
  { pattern: '/erru/ncr/new', labelKey: 'breadcrumbs.ncrCreate', parent: '/erru/ncr' },
  {
    pattern: '/erru/ncr/:businessCaseId',
    labelKey: 'breadcrumbs.ncrDetail',
    parent: '/erru/ncr',
  },
  { pattern: '/erru/ncr', labelKey: 'nav.ncr', parent: '/' },

  // ERRU — NU
  { pattern: '/erru/nu/new', labelKey: 'breadcrumbs.nuCreate', parent: '/erru/nu' },
  { pattern: '/erru/nu/:id', labelKey: 'breadcrumbs.nuDetail', parent: '/erru/nu' },
  { pattern: '/erru/nu', labelKey: 'nav.nu', parent: '/' },

  // Citizen
  { pattern: '/my-companies', labelKey: 'citizen.formsList.title', parent: '/' },
  {
    pattern: '/my-companies/labour-inspection/:id',
    labelKey: 'breadcrumbs.labourInspectionForm',
    parent: '/',
  },
  {
    pattern: '/my-companies/compound/:id',
    labelKey: 'breadcrumbs.compoundForm',
    parent: '/',
  },
  {
    pattern: '/my-companies/foreign-violation/:id',
    labelKey: 'breadcrumbs.foreignViolationForm',
    parent: '/',
  },
  {
    pattern: '/my-companies/good-repute/:id',
    labelKey: 'breadcrumbs.goodReputeForm',
    parent: '/',
  },
];
