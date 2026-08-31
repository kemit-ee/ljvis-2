import { useMemo } from 'react';
import type { ControlForm } from '../control-forms/types.ts';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';

const WRITE_SUFFIX = '.write';
const FORM_WRITE_SUFFIX = '_form.write';

const COMPOUND_FORM_KEY = 'compound_form';

const toControlForm = (key: string): ControlForm => ({
  labelKey: FORM_CONFIG[key].labelKey,
  route: FORM_CONFIG[key].route,
  hasParent: FORM_CONFIG[key].hasParent,
  parentKey: FORM_CONFIG[key].parentKey,
  typeParam: FORM_CONFIG[key].typeParam,
});

const buildAvailableForms = (permissions: string[]): ControlForm[] => {
  const formKeys = permissions
    .filter((p) => p.endsWith(FORM_WRITE_SUFFIX))
    .map((p) => p.replace(WRITE_SUFFIX, ''))
    .filter((key) => !!FORM_CONFIG[key])
    .filter((key) => FORM_CONFIG[key].showOnDashboard)
    .filter((key) => FORM_CONFIG[key].route !== '/trailer-technical');

  if (!formKeys.includes(COMPOUND_FORM_KEY)) {
    return formKeys.map(toControlForm);
  }

  const subKeys = formKeys.filter((k) => FORM_CONFIG[k].hasParent);
  const result: ControlForm[] = [];

  for (const key of formKeys) {
    if (FORM_CONFIG[key].hasParent) continue;
    result.push(toControlForm(key));
    if (key === COMPOUND_FORM_KEY) {
      subKeys.forEach((k) => result.push(toControlForm(k)));
    }
  }
  return result;
};

export function useDesktop() {
  const { permissions, loading } = useAuth();

  const availableForms = useMemo(
    () => buildAvailableForms(permissions),
    [permissions],
  );

  return {
    loading,
    availableForms,
  };
}
