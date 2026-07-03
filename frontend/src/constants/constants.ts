export const BREAKPOINTS = {
  DESKTOP: 992,
} as const;

export const PERMISSIONS = {
  USER_LIST_ADMIN: 'user.list.admin',
  USER_LIST_LOCAL: 'user.list.local',
  USER_GROUP_LIST_ADMIN: 'user_group.list.admin',
  USER_GROUP_LIST_LOCAL: 'user_group.list.local',
  CLASSIFIER_LIST: 'classifier.list',
  AUDIT_READ: 'audit.read',
} as const;

export const DESKTOP = {
  DASHBOARD_MANUAL_ADD: 'DASHBOARD_MANUAL_ADD',
  DASHBOARD_EXCLUDED: 'DASHBOARD_EXCLUDED',
} as const;

export const STRUCTURE_UNIT_OPTIONS = [
  { value: 'PPA_LOUNA', labelKey: 'structureUnits.prefSouth' },
  { value: 'PPA_IDA', labelKey: 'structureUnits.prefEast' },
  { value: 'PPA_LAANE', labelKey: 'structureUnits.prefWest' },
  { value: 'PPA_POHJA', labelKey: 'structureUnits.prefNorth' },
  { value: 'KLIM_HQ', labelKey: 'structureUnits.klimHq' },
  { value: 'TRAM_HQ', labelKey: 'structureUnits.tramHq' },
];
