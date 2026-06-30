import { useCallback, useEffect, useState, useRef } from 'react';
import type {
  ControlForm,
  BatchFormClassifierValue,
} from '../control-forms/types.ts';
import {
  getAvailableFormClassifierValues,
} from '../control-forms/api';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';
import { DESKTOP } from '../../constants/constants';

const SEARCH_WRITE = '.write';
const SEARCH_FORM_WRITE = '_form.write';

const createAvailableForms = async (
  perms: string[],
): Promise<ControlForm[]> => {
  const permKeys = perms
    .map((p) => p.replace(SEARCH_WRITE, ''))
    .filter((key) => !!FORM_CONFIG[key]);

  if (permKeys.length === 0) return [];

  const codes = permKeys.map((key) => FORM_CONFIG[key].classifierCode);
  const classifierValues: BatchFormClassifierValue[] = await getAvailableFormClassifierValues(codes);

  const valuesByCode = new Map(
    classifierValues.map((v) => [v.classifierCode, v]),
  );

  return permKeys.reduce<ControlForm[]>((acc, key) => {
    const value = valuesByCode.get(FORM_CONFIG[key].classifierCode);
    if (!value || value.description !== DESKTOP.DASHBOARD_MANUAL_ADD) return acc;
    acc.push({ name: value.name, route: FORM_CONFIG[key].route, hasParent: value.hasParent });
    return acc;
  }, []);
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
      const rawPerms = Array.isArray(authUser.permissions) ? authUser.permissions : [authUser.permissions];
      const perms = rawPerms.filter((p: string) => p.endsWith(SEARCH_FORM_WRITE));
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
