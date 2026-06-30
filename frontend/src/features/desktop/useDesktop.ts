import { useCallback, useEffect, useState, useRef } from 'react';
import type { Permission } from '../permissions/types.ts';
import type {
  ControlForm,
  FormClassifierValue,
} from '../control-forms/types.ts';
import {
  getAvailableFormClassifierValue,
  getAvailablePerms,
} from '../control-forms/api';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';

const createAvailableForms = async (
  perms: Permission[],
): Promise<ControlForm[]> => {
  const results = await Promise.all(
    perms.map(async (p) => {
      const key = p.code.replace('.write', '');
      const classifierValues: FormClassifierValue[] =
        await getAvailableFormClassifierValue(FORM_CONFIG[key].classifierCode);
      return classifierValues[0].description === 'DASHBOARD_MANUAL_ADD'
        ? {
            name: classifierValues[0].name,
            route: FORM_CONFIG[key].route,
            hasParent: classifierValues[0].hasParent,
          }
        : null;
    }),
  );
  return results.filter((f): f is ControlForm => f !== null);
};

export function useDesktop() {
  const [availableForms, setAvailableForms] = useState<ControlForm[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);
  const { user: authUser } = useAuth();

  const fetchData = useCallback(async () => {
    if (!authUser) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const perms = await getAvailablePerms(Number(authUser.id));
      setAvailableForms(await createAvailableForms(perms));
    } catch (e) {
      console.error('Failed to available forms', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    availableForms,
  };
}
