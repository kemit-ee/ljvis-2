import { useMemo } from 'react';
import type { ControlForm } from '../control-forms/types.ts';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';

const WRITE_SUFFIX = '.write';
const FORM_WRITE_SUFFIX = '_form.write';

const COMPOUND_FORM_KEY = 'compound_form';
const SP_PREFIX = 'sp_';

const buildAvailableForms = (permissions: string[]): ControlForm[] => {
  const forms = permissions
    .filter((p) => p.endsWith(FORM_WRITE_SUFFIX))
    .map((p) => p.replace(WRITE_SUFFIX, ''))
    .filter((key) => !!FORM_CONFIG[key])
    .filter((key) => FORM_CONFIG[key].showOnDashboard)
    .map((key) => ({
      key,
      labelKey: FORM_CONFIG[key].labelKey,
      route: FORM_CONFIG[key].route,
      hasParent: FORM_CONFIG[key].hasParent,
      parentKey: FORM_CONFIG[key].parentKey,
      typeParam: FORM_CONFIG[key].typeParam,
    }));

  const hasCompound = forms.some((f) => f.key === COMPOUND_FORM_KEY);

  if (!hasCompound) {
    return forms.map(({ key: _key, ...rest }) => rest);
  }

  const result: ControlForm[] = [];
  for (const form of forms) {
    if (form.key.startsWith(SP_PREFIX)) continue;
    const { key: _key, ...rest } = form;
    result.push(rest);
    if (form.key === COMPOUND_FORM_KEY) {
      forms
        .filter((f) => f.key.startsWith(SP_PREFIX))
        .forEach(({ key: _k, ...spRest }) => result.push(spRest));
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
