// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const i18n = vi.hoisted(() => ({ language: 'en', changeLanguage: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n,
  }),
}));
vi.mock('../../../layout/useFooterProps', () => ({ useFooterProps: () => ({}) }));
vi.mock('@tedi-design-system/react/community', () => ({
  Header: () => <header data-testid="header" />,
  Footer: () => <footer data-testid="footer" />,
}));
const showMessage = vi.hoisted(() => vi.fn());
vi.mock('../../../shared/errors/ErrorContext', () => ({ useErrorContext: () => ({ showMessage }) }));

import { LoginPage } from './LoginPage';
import { DescriptionList } from '../DescriptionList';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
  sessionStorage.clear();
  showMessage.mockReset();
  i18n.changeLanguage.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('forces Estonian and toggles the description', () => {
    render(<LoginPage />);
    expect(i18n.changeLanguage).toHaveBeenCalledWith('et');
    fireEvent.click(screen.getByText('auth.showMore'));
    expect(screen.getByText('auth.descriptionItem1')).toBeTruthy();
    fireEvent.click(screen.getByText('auth.showLess'));
    expect(screen.queryByText('auth.descriptionItem1')).toBeNull();
  });

  it('does not change language when already Estonian', () => {
    i18n.language = 'et-EE';
    render(<LoginPage />);
    expect(i18n.changeLanguage).not.toHaveBeenCalled();
    i18n.language = 'en';
  });

  it.each([
    [0, 'citizen'],
    [1, 'officer'],
  ])('login button %i starts TARA login with intent %s and rewrites mock URL', async (idx, intent) => {
    const loc = { origin: 'http://app', href: '' };
    vi.stubGlobal('location', loc);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authorization_url: 'http://tara-mock:8888/authorize?x=1' }),
      }),
    );
    render(<LoginPage />);
    fireEvent.click(screen.getAllByText('auth.login')[idx]);
    await waitFor(() => expect(loc.href).toBe('http://app/tara/authorize?x=1'));
    expect(sessionStorage.getItem('loginIntent')).toBe(intent);
  });

  it('shows an error toast when TARA is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error('x')) }));
    render(<LoginPage />);
    fireEvent.click(screen.getAllByText('auth.login')[0]);
    await waitFor(() => expect(showMessage).toHaveBeenCalledWith('auth.taraUnavailable', 'error'));
    expect(sessionStorage.getItem('loginIntent')).toBeNull();
  });
});

describe('DescriptionList', () => {
  it('renders four items', () => {
    render(<DescriptionList />);
    expect(screen.getByText('auth.descriptionItem4')).toBeTruthy();
  });
});
