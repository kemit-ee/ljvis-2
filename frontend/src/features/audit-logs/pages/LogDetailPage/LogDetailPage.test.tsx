// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogDetailPage } from './LogDetailPage';
import { getLog } from '../../api';

let perms: string[] = ['audit.read.local'];

// TEDI vajab matchMedia'd, mida jsdom ei paku.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../api', () => ({ getLog: vi.fn() }));

beforeEach(() => {
  perms = ['audit.read.local'];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/logs/e1']}>
      <Routes>
        <Route path="/logs/:id" element={<LogDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('LogDetailPage', () => {
  it('kuvab laadimise ajal laadimisteksti', () => {
    vi.mocked(getLog).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('kuvab logi andmed ja eemaldab sisu nurksulud', async () => {
    vi.mocked(getLog).mockResolvedValue([
      {
        eventId: 'e1',
        eventType: 'LOGIN',
        eventCategory: 'AUTH',
        actorName: 'Mari',
        description: 'a &amp; b',
        logContent: '[sisu &quot;x&quot;]',
        createdAt: '2026-01-02T03:04:05',
      },
    ]);
    renderPage();
    expect(await screen.findByText('Mari')).toBeTruthy();
    expect(screen.getByText('a & b')).toBeTruthy();
    expect(screen.getByText('sisu "x"')).toBeTruthy();
    expect(screen.getByText('LOGIN')).toBeTruthy();
  });

  it('ilma isikuta kuvatakse kriips', async () => {
    vi.mocked(getLog).mockResolvedValue([
      { eventId: 'e1', eventType: 'T', eventCategory: 'C', description: 'd' },
    ]);
    renderPage();
    expect(await screen.findByText('-')).toBeTruthy();
  });

  it('puuduv logi annab veateate', async () => {
    vi.mocked(getLog).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it('API viga annab veateate', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getLog).mockRejectedValue(new Error('x'));
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it('ilma õiguseta keelatud', async () => {
    perms = [];
    vi.mocked(getLog).mockResolvedValue([
      { eventId: 'e1', eventType: 'T', eventCategory: 'C', description: 'd' },
    ]);
    renderPage();
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });
});
