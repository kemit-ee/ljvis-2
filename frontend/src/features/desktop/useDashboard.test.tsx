// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  value: { loading: false, permissions: [] as string[], hasPermission: (() => false) as (p: string) => boolean },
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));
const cls = vi.hoisted(() => ({ value: { loading: false, getByCode: (() => []) as (c: string) => unknown[] } }));
vi.mock('../classifiers/ClassifierProvider', () => ({ useClassifiers: () => cls.value }));
const api = vi.hoisted(() => ({ fetchDashboardSummary: vi.fn() }));
vi.mock('./api', () => api);

import { useDashboard } from './useDashboard';

const summary = {
  scope: 'own',
  canSeeOrganisation: false,
  activeCompoundForms: [],
  activeStandaloneForms: [],
  needsAttention: [
    { compoundFormKey: 3, formType: 'sp_driver', formKey: 9, reason: 'overdue' },
    { compoundFormKey: 4, formType: 'adr', formKey: 2, reason: 'upcoming' },
  ],
};

const classifier = (code: string) => ({ code, description: 'DASHBOARD_MANUAL_ADD', isValid: true });
const withCompound = () => [
  classifier('SP_COMPOUND'),
  classifier('SP_DRIVER_FORM'),
  classifier('FOREIGN_AUDIT'),
  classifier('TRAM_KONTROLLKAART'),
];
const withoutCompound = () => [classifier('SP_DRIVER_FORM'), classifier('FOREIGN_AUDIT')];

beforeEach(() => {
  api.fetchDashboardSummary.mockReset().mockResolvedValue(summary);
  auth.value = { loading: false, permissions: [], hasPermission: () => false };
  cls.value = { loading: false, getByCode: () => [] };
});

describe('useDashboard', () => {
  it('loads the summary and derives overdue keys', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.summaryLoading).toBe(false));
    expect(result.current.summary).toEqual(summary);
    expect([...result.current.overdueCompoundKeys]).toEqual([3]);
    expect([...result.current.overdueSubFormKeys]).toEqual(['sp_driver-9']);
    expect(result.current.availableForms).toEqual([]);
  });

  it('reports errors, refetches and changes scope', async () => {
    api.fetchDashboardSummary.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.summaryError).toBe(true));

    await act(async () => result.current.refetch());
    await waitFor(() => expect(result.current.summaryError).toBe(false));

    act(() => result.current.setScope('organisation'));
    await waitFor(() => expect(api.fetchDashboardSummary).toHaveBeenLastCalledWith('organisation'));
  });

  it('waits for auth before loading and exposes permissions', async () => {
    auth.value = { loading: true, permissions: [], hasPermission: (p) => p === 'control_form.view_unit' };
    const { result } = renderHook(() => useDashboard());
    expect(result.current.loading).toBe(true);
    expect(api.fetchDashboardSummary).not.toHaveBeenCalled();
    expect(result.current.canSeeUnit).toBe(true);
    expect(result.current.canSeeOrganisation).toBe(false);
  });

  it('groups available forms, nesting sub-forms after the compound form', () => {
    auth.value = {
      loading: false,
      permissions: ['compound_form.write', 'sp_driver_form.write', 'foreign_violation_form.write', 'tram_driver_form.write'],
      hasPermission: () => false,
    };
    cls.value = { loading: false, getByCode: withCompound };
    const { result } = renderHook(() => useDashboard());
    expect(result.current.availableForms.map((f) => f.route)).toEqual([
      '/compound',
      '/sp-driver',
      '/foreign-violation',
      '/tram-control-card',
    ]);
  });

  it('keeps sub-forms in place without a compound form', () => {
    auth.value = { loading: false, permissions: ['sp_driver_form.write', 'foreign_violation_form.write'], hasPermission: () => false };
    cls.value = { loading: false, getByCode: withoutCompound };
    const { result } = renderHook(() => useDashboard());
    expect(result.current.availableForms.map((f) => f.route)).toEqual(['/sp-driver', '/foreign-violation']);
  });
});
