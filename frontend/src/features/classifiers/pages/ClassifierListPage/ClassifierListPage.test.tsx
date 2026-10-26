// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassifierListPage } from './ClassifierListPage';
import { listClassifiers } from '../../api';

let perms: string[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../api', () => ({ listClassifiers: vi.fn() }));

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

beforeEach(() => {
  perms = ['classifier.list'];
  vi.mocked(listClassifiers).mockResolvedValue({
    content: [
      { id: '1', code: 'C1', name: 'Esimene', description: 'Kirj' },
      { id: '2', code: 'C2', name: 'Teine', description: '' },
    ],
    total: 2,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/classifiers']}>
      <Routes>
        <Route path="/classifiers" element={<ClassifierListPage />} />
        <Route path="/classifiers/:id" element={<div>detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ClassifierListPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('kuvab klassifikaatorid ja kriipsu tühja kirjelduse asemel', async () => {
    renderPage();
    expect(await screen.findByText('Esimene')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('link viib detailvaatesse', async () => {
    renderPage();
    const links = await screen.findAllByText('classifiers.viewDetails');
    fireEvent.click(links[0]);
    expect(await screen.findByText('detail-page')).toBeTruthy();
  });

  it('otsing', async () => {
    renderPage();
    await screen.findByText('Esimene');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(listClassifiers).mock.calls.some(([p]) => p?.search === 'abc')).toBe(true),
    );
  });
});
