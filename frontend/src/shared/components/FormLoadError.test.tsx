// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormLoadError } from './FormLoadError';
import { recentFormLoadStatus } from '../api/formLoadStatus';
import { get, clearLastLoadFailure } from '../api/client';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function failNextGet(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status, json: () => Promise.resolve({ response: null }) }),
  );
}

describe('FormLoadError', () => {
  beforeEach(() => {
    clearLastLoadFailure();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('explains a 403 on a form read', async () => {
    failNextGet(403);
    await get('/v1/control-forms/foreign-violation-form', { q: '7' }).catch(() => undefined);
    render(<FormLoadError />);
    expect(screen.getByText('common.errors.formForbiddenTitle')).toBeTruthy();
    expect(screen.getByText(/common\.errors\.formForbidden$/)).toBeTruthy();
  });

  it('says the form was not found on a 404', async () => {
    failNextGet(404);
    await get('/v1/control-forms/adr-form', { q: '1' }).catch(() => undefined);
    render(<FormLoadError />);
    expect(screen.getByText('common.errors.formNotFound')).toBeTruthy();
  });

  it('keeps the generic message for other failures and for non-form requests', async () => {
    failNextGet(500);
    await get('/v1/control-forms/adr-form', { q: '1' }).catch(() => undefined);
    render(<FormLoadError />);
    expect(screen.getByText('common.error')).toBeTruthy();
    cleanup();

    failNextGet(403);
    await get('/v1/users/admin', {}).catch(() => undefined);
    render(<FormLoadError />);
    expect(screen.getByText('common.error')).toBeTruthy();
  });

  it('ignores a stale failure', async () => {
    failNextGet(403);
    await get('/v1/control-forms/adr-form', { q: '1' }).catch(() => undefined);
    expect(recentFormLoadStatus(Date.now() + 120_000)).toBeNull();
  });
});
