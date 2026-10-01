import type { ClassifierEntry } from './types';

/**
 * ADR-011: FORM_TYPE klassifikaatori koodid, mille järgi klassifikaatori väärtusi
 * vormidele piiratakse (`classifier.classifier_value_form_scope.form_type_code`).
 * Samad koodid on `control-forms/formRoutes.ts` → `classifierCode`.
 */
export const FORM_TYPE_CODE = {
  LABOUR_INSPECTION: 'TI_KONTROLLKAART',
  FOREIGN_VIOLATION: 'FOREIGN_AUDIT',
  GOOD_REPUTE: 'REPUTATION_NONCOMPLIANCE',
  COMPOUND: 'SP_COMPOUND',
  SP_DRIVER: 'SP_DRIVER_FORM',
  SP_TEAMMATE: 'SP_TEAMMATE_FORM',
  SP_VEHICLE_TECH: 'SP_VEHICLE_TECH',
  SP_TRAILER_TECH: 'SP_TRAILER_TECH',
  SP_DANGEROUS_GOODS: 'SP_DANGEROUS_GOODS',
  SP_TRANSPORT_SUSPENDED: 'SP_TRANSPORT_SUSPENDED',
  TRAM_CONTROL_CARD: 'TRAM_KONTROLLKAART',
} as const;

/**
 * Kas väärtus on antud vormil valikus lubatud. Tühi `formTypes` = piirangut pole,
 * väärtus on lubatud kõigil vormidel.
 */
export function isAvailableForForm(entry: ClassifierEntry, formType: string): boolean {
  const formTypes = entry.formTypes;
  return !formTypes || formTypes.length === 0 || formTypes.includes(formType);
}

export function filterForForm(entries: ClassifierEntry[], formType: string): ClassifierEntry[] {
  return entries.filter((e) => isAvailableForForm(e, formType));
}

export interface FormScopeOption {
  value: string;
  label: string;
}

export interface FormScopeOptionGroup {
  label: string;
  options: FormScopeOption[];
}

/**
 * Admin-UI „Piira vormidele" valikud FORM_TYPE klassifikaatorist: tipptaseme vormid
 * lihtvalikutena, alamvormidega vanem (SP_COMPOUND) rühmana, mille esimene valik on
 * vanem ise (koondvormi üldandmed). Aegunud vormitüübid jäetakse välja, välja arvatud
 * juba valitud; valitud koodid, mida FORM_TYPE-is enam pole, lisatakse lõppu `labels.orphan` sildiga.
 */
export function buildFormScopeOptions(
  formTypeValues: ClassifierEntry[],
  selected: string[],
  labels: {
    parentOwn: (name: string) => string;
    orphan: (code: string) => string;
  },
): Array<FormScopeOption | FormScopeOptionGroup> {
  const visible = formTypeValues.filter(
    (v) => v.isValid !== false || selected.includes(v.code),
  );
  const toOption = (v: ClassifierEntry): FormScopeOption => ({ value: v.code, label: v.name });
  const byName = (a: ClassifierEntry, b: ClassifierEntry) => a.name.localeCompare(b.name, 'et');

  const tops = visible.filter((v) => v.parentKey === null).sort(byName);
  const childrenOf = (key: number) =>
    visible.filter((v) => v.parentKey === key).sort(byName);

  const flat: FormScopeOption[] = [];
  const groups: FormScopeOptionGroup[] = [];
  for (const top of tops) {
    const children = childrenOf(top.classifierValueKey);
    if (children.length === 0) {
      flat.push(toOption(top));
    } else {
      groups.push({
        label: top.name,
        options: [
          { value: top.code, label: labels.parentOwn(top.name) },
          ...children.map(toOption),
        ],
      });
    }
  }

  const known = new Set(formTypeValues.map((v) => v.code));
  const orphans = selected
    .filter((code) => !known.has(code))
    .map((code) => ({ value: code, label: labels.orphan(code) }));

  return [...flat, ...groups, ...orphans];
}
