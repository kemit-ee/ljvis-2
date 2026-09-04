import type { ClassifierEntry } from '../classifiers/types';

export interface FormConfig {
  labelKey: string;
  route: string;
  hasParent: boolean;
  parentKey?: string;
  typeParam?: string;
  /** LJVIS2-37 dashboard "Kompleksvorm"/"Vormid" row subtitle (Kontrollkaart/Protokoll/Vorm). */
  kind?: 'kontrollkaart' | 'protokoll' | 'vorm';
  /**
   * LJVIS2-68: FORM_TYPE classifier value `code` this key corresponds to.
   * Drives which keys `getAvailableFormKeys` below may surface — a value
   * without a matching classifier entry (or not marked
   * DASHBOARD_MANUAL_ADD there) never appears as start-able, no matter the
   * caller's permissions.
   */
  classifierCode?: string;
}

export const FORM_CONFIG: Record<string, FormConfig> = {
  foreign_violation_form: {
    labelKey: 'forms.foreign_violation_form',
    route: '/foreign-violation',
    hasParent: false,
    kind: 'kontrollkaart',
    classifierCode: 'FOREIGN_AUDIT',
  },
  labour_inspection_form: {
    labelKey: 'forms.labour_inspection_form',
    route: '/labour-inspection',
    hasParent: false,
    kind: 'kontrollkaart',
    classifierCode: 'TI_KONTROLLKAART',
  },
  good_repute_form: {
    labelKey: 'forms.good_repute_form',
    route: '/good-repute',
    hasParent: false,
    kind: 'vorm',
    classifierCode: 'REPUTATION_NONCOMPLIANCE',
  },
  compound_form: {
    labelKey: 'forms.compound_form',
    route: '/compound',
    hasParent: false,
    kind: 'kontrollkaart',
    classifierCode: 'SP_COMPOUND',
  },
  admin_procedure_form: {
    labelKey: 'forms.admin_procedure_form',
    route: '/admin-procedure',
    hasParent: false,
    classifierCode: 'ADMIN_PROCEDURE',
  },
  sp_driver_form: {
    labelKey: 'forms.sp_driver_form',
    route: '/sp-driver',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'driver',
    classifierCode: 'SP_DRIVER_FORM',
  },
  sp_teammate_form: {
    labelKey: 'forms.sp_teammate_form',
    route: '/sp-teammate',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'teammate',
    classifierCode: 'SP_TEAMMATE_FORM',
  },
  vehicle_technical_form: {
    labelKey: 'forms.technical_check.vehicleTitle',
    route: '/vehicle-technical',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'vehicle-technical',
    classifierCode: 'SP_VEHICLE_TECH',
  },
  trailer_technical_form: {
    labelKey: 'forms.technical_check.trailerTitle',
    route: '/trailer-technical',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'trailer-technical',
    classifierCode: 'SP_TRAILER_TECH',
  },
  adr_form: {
    labelKey: 'forms.adr.title',
    route: '/adr',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'adr',
    classifierCode: 'SP_DANGEROUS_GOODS',
  },
  transport_interruption_form: {
    labelKey: 'forms.transport_interruption.title',
    route: '/transport-interruption',
    hasParent: true,
    parentKey: 'compound_form',
    typeParam: 'transport-interruption',
    classifierCode: 'SP_TRANSPORT_SUSPENDED',
  },
  tram_driver_form: {
    labelKey: 'forms.tram_driver_form',
    route: '/tram-driver',
    hasParent: false,
    kind: 'kontrollkaart',
    classifierCode: 'TRAM_KONTROLLKAART',
  },
};

const DASHBOARD_VISIBLE = 'DASHBOARD_MANUAL_ADD';

/**
 * LJVIS2-68: FORM_CONFIG keys the signed-in officer may start a new form of.
 * Driven by the FORM_TYPE classifier (a value's `description` marks it
 * DASHBOARD_MANUAL_ADD/DASHBOARD_EXCLUDED, see the Liquibase FORM_TYPE seed)
 * AND the caller's `<key>.write` permission — read-only access is not
 * enough to start a new form. Both classifier values and permissions are
 * already loaded client-side (ClassifierProvider / AuthContext), so this
 * needs no dedicated backend endpoint; previously resolved server-side by
 * GET /v1/control-forms/available (removed).
 */
export const getAvailableFormKeys = (
  formTypeValues: ClassifierEntry[],
  permissions: string[],
): string[] => {
  const keyByClassifierCode = Object.entries(FORM_CONFIG).reduce<Record<string, string>>(
    (acc, [key, cfg]) => {
      if (cfg.classifierCode) acc[cfg.classifierCode] = key;
      return acc;
    },
    {},
  );
  return formTypeValues
    .filter((v) => v.description === DASHBOARD_VISIBLE && v.isValid !== false)
    .map((v) => keyByClassifierCode[v.code])
    .filter((key): key is string => !!key && permissions.includes(`${key}.write`));
};
