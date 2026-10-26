// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogListPage } from './LogListPage';
import { exportLogs, listLogs } from '../../api';

let perms: string[] = ['audit.read'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext.tsx', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../api.ts', () => ({ listLogs: vi.fn(), exportLogs: vi.fn() }));
vi.mock('../../api', () => ({ listLogs: vi.fn(), exportLogs: vi.fn() }));

const log = {
  eventId: 'e1',
  eventType: 'LOGIN',
  eventCategory: 'AUTH',
  actorName: 'Mari',
  description: 'a &amp; b',
  logContent: '[x;"y"]',
  createdAt: '2026-01-02T03:04:05',
};

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

beforeEach(() => {
  perms = ['audit.read'];
  vi.mocked(listLogs).mockResolvedValue({ content: [log, { ...log, eventId: 'e2', actorName: undefined }], total: 2 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logs']}>
      <Routes>
        <Route path="/logs" element={<LogListPage />} />
        <Route path="/logs/:id" element={<div>detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LogListPage', () => {
  it('keelab ligipääsu ilma õiguseta', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('kuvab logid ja dekodeerib kirjelduse', async () => {
    renderPage();
    expect((await screen.findAllByText('a & b')).length).toBe(2);
    expect(screen.getByText('Mari')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('"vaata detaile" link avab detailivaate', async () => {
    renderPage();
    const links = await screen.findAllByText('logs.viewDetails');
    fireEvent.click(links[0]);
    expect(await screen.findByText('detail-page')).toBeTruthy();
  });

  it('otsing kutsub API uuesti', async () => {
    renderPage();
    await screen.findByText('Mari');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(listLogs).mock.calls.some(([p]) => p?.search === 'abc')).toBe(true),
    );
  });

  it('CSV eksport laeb faili alla', async () => {
    vi.mocked(exportLogs).mockResolvedValue({ content: [log], total: 1 });
    const create = vi.fn().mockReturnValue('blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();
    await screen.findByText('Mari');
    fireEvent.click(screen.getByText('logs.exportCsv'));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(exportLogs).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();
  });
});
