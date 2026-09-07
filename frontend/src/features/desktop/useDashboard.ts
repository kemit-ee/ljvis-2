import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ControlForm } from '../control-forms/types.ts';
import { FORM_CONFIG, getAvailableFormKeys } from '../control-forms/formRoutes.ts';
import { useAuth } from '../auth/AuthContext';
import { useClassifiers } from '../classifiers/ClassifierProvider';
import { fetchDashboardSummary } from './api';
import type { DashboardScope, DashboardSummary } from './types';

const COMPOUND_FORM_KEY = 'compound_form';

const toControlForm = (key: string): ControlForm => ({
  labelKey: FORM_CONFIG[key].labelKey,
  route: FORM_CONFIG[key].route,
  hasParent: FORM_CONFIG[key].hasParent,
  parentKey: FORM_CONFIG[key].parentKey,
  typeParam: FORM_CONFIG[key].typeParam,
});

/**
 * LJVIS2-68: groups the flat list of start-able keys (see
 * getAvailableFormKeys) into the "Kompleksvorm"/"Vormid" dashboard shape —
 * compound_form's sub-forms are nested right after it instead of listed
 * standalone.
 */
const buildAvailableForms = (keys: string[]): ControlForm[] => {
  const formKeys = keys.filter((k) => !!FORM_CONFIG[k]);
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

const emptySummary: DashboardSummary = {
  scope: 'own',
  canSeeOrganisation: false,
  activeCompoundForms: [],
  activeStandaloneForms: [],
  needsAttention: [],
};

export function useDashboard() {
  const { loading: authLoading, hasPermission, permissions } = useAuth();
  const { getByCode, loading: classifiersLoading } = useClassifiers();

  const availableForms = useMemo(
    () => buildAvailableForms(getAvailableFormKeys(getByCode('FORM_TYPE'), permissions)),
    [getByCode, permissions],
  );

  const [scope, setScope] = useState<DashboardScope>('own');
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const canSeeOrganisation = hasPermission('control_form.view_unpublished');

  const loadSummary = useCallback((requestedScope: DashboardScope) => {
    setSummaryLoading(true);
    setSummaryError(false);
    fetchDashboardSummary(requestedScope)
      .then((data) => setSummary(data))
      .catch(() => setSummaryError(true))
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadSummary(scope);
  }, [authLoading, scope, loadSummary]);

  const refetch = useCallback(() => loadSummary(scope), [loadSummary, scope]);

  // LJVIS2-37 AC (row 120): "Väärteomenetluse tähtaja ületanud andmevormid
  // peavad olema ... punase kirjega" — overdue sub-forms (and the koondvorm
  // row that contains them) are rendered in red in the tables below.
  const overdueCompoundKeys = useMemo(
    () =>
      new Set(
        summary.needsAttention
          .filter((a) => a.reason === 'overdue')
          .map((a) => a.compoundFormKey),
      ),
    [summary.needsAttention],
  );
  const overdueSubFormKeys = useMemo(
    () =>
      new Set(
        summary.needsAttention
          .filter((a) => a.reason === 'overdue')
          .map((a) => `${a.formType}-${a.formKey}`),
      ),
    [summary.needsAttention],
  );

  return {
    loading: authLoading || classifiersLoading,
    availableForms,
    scope,
    setScope,
    canSeeOrganisation,
    summary,
    summaryLoading,
    summaryError,
    refetch,
    overdueCompoundKeys,
    overdueSubFormKeys,
  };
}
