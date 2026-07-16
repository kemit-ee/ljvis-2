import { useMemo } from 'react';
import type { ControlForm } from '../control-forms/types.ts';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';

const WRITE_SUFFIX = '.write';
const FORM_WRITE_SUFFIX = '_form.write';

const buildAvailableForms = (permissions: string[]): ControlForm[] =>
  permissions
    .filter((p) => p.endsWith(FORM_WRITE_SUFFIX))
    .map((p) => p.replace(WRITE_SUFFIX, ''))
    .filter((key) => !!FORM_CONFIG[key])
    .filter((key) => FORM_CONFIG[key].showOnDashboard)
    .map((key) => ({
      labelKey: FORM_CONFIG[key].labelKey,
      route: FORM_CONFIG[key].route,
      hasParent: FORM_CONFIG[key].hasParent,
    }));

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
