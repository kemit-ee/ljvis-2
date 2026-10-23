// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const switchRep = vi.hoisted(() => vi.fn());
vi.mock('./api', () => ({ switchRepresentation: switchRep }));

import { AuthCallback } from './AuthCallback';

function setLocation(search: string) {
  const loc = { search, href: '/auth/callback' };
  vi.stubGlobal('location', loc);
  return loc;
}

beforeEach(() => {
  sessionStorage.clear();
  switchRep.mockReset().mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AuthCallback', () => {
  it('shows an error for an OAuth error param', () => {
    setLocation('?error=access_denied');
    render(<AuthCallback />);
    expect(screen.getByText('auth.taraUnavailable')).toBeTruthy();
    expect(screen.getByText('auth.backToLogin')).toBeTruthy();
  });

  it('redirects home when code/state are missing', () => {
    const loc = setLocation('');
    render(<AuthCallback />);
    expect(loc.href).toBe('/');
    expect(screen.getByText('Autentimine...')).toBeTruthy();
  });

  it('exchanges the code, switches to citizen-self and redirects', async () => {
    const loc = setLocation('?code=c&state=s');
    sessionStorage.setItem('loginIntent', 'citizen');
    const f = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', f);
    render(<AuthCallback />);
    await waitFor(() => expect(loc.href).toBe('/'));
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ code: 'c', state: 's', intent: 'citizen' });
    expect(switchRep).toHaveBeenCalledWith('citizen-self');
    expect(sessionStorage.getItem('loginIntent')).toBeNull();
  });

  it('ignores a failing switch and skips it for officers', async () => {
    const loc = setLocation('?code=c&state=s');
    sessionStorage.setItem('loginIntent', 'citizen');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    switchRep.mockRejectedValue(new Error('x'));
    render(<AuthCallback />);
    await waitFor(() => expect(loc.href).toBe('/'));
    cleanup();

    switchRep.mockClear();
    loc.href = '/auth/callback';
    sessionStorage.setItem('loginIntent', 'officer');
    render(<AuthCallback />);
    await waitFor(() => expect(loc.href).toBe('/'));
    expect(switchRep).not.toHaveBeenCalled();
  });

  it('shows an error when the exchange fails', async () => {
    setLocation('?code=c&state=s');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<AuthCallback />);
    await waitFor(() => expect(screen.getByText('auth.taraUnavailable')).toBeTruthy());
  });
});
