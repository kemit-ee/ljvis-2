// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../shared/api/client', () => client);

import { fetchDashboardSummary } from './api';
import { buildContinueRoute, buildNotificationRoute } from './routeHelpers';
import { FormStatusBadge } from './FormStatusBadge';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('fetchDashboardSummary', () => {
  it('requests the summary for a scope (own by default)', async () => {
    await fetchDashboardSummary();
    expect(client.get).toHaveBeenCalledWith('/v1/dashboard/summary', { scope: 'own' });
    await fetchDashboardSummary('unit');
    expect(client.get).toHaveBeenLastCalledWith('/v1/dashboard/summary', { scope: 'unit' });
  });
});

describe('route helpers', () => {
  it('buildContinueRoute resolves known types and null for unknown', () => {
    expect(buildContinueRoute('sp_driver', 5)).toBe('/control-forms/sp-driver/5');
    expect(buildContinueRoute('nope', 5)).toBeNull();
  });

  it('buildNotificationRoute maps entity types', () => {
    expect(buildNotificationRoute(null, '1')).toBeNull();
    expect(buildNotificationRoute('ncr', null)).toBeNull();
    expect(buildNotificationRoute('ncr', '7')).toBe('/erru/ncr/7');
    expect(buildNotificationRoute('compound_form', '8')).toBe('/control-forms/compound/8');
    expect(buildNotificationRoute('adr', '9')).toBe('/control-forms/adr/9');
    expect(buildNotificationRoute('unknown', '9')).toBeNull();
  });
});

describe('FormStatusBadge', () => {
  it.each(['saved', 'confirmed', 'published', 'deleted', 'weird'])('renders %s', (status) => {
    render(<FormStatusBadge status={status} />);
    expect(screen.getByText(`dashboard.status.${status}`)).toBeTruthy();
  });

  it('renders an overdue badge', () => {
    render(<FormStatusBadge status="saved" overdue />);
    expect(screen.getByText('dashboard.status.saved')).toBeTruthy();
  });
});
