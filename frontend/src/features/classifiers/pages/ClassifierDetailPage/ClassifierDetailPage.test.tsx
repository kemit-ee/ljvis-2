// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassifierDetailPage } from './ClassifierDetailPage';
import { getClassifier, getClassifierValues, updateClassifier } from '../../api';
import { ApiError } from '../../../../shared/api/client';

let perms: string[] = [];

vi.mock('react-i18next', () => {
  // Stabiilne t, et tabeli veerud ei ehitataks igal renderdusel uuesti (muidu rea elemendid vahetuvad).
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../ClassifierProvider', () => {
  // Stabiilsed viited, et tabeli veerud ei ehitataks igal renderdusel uuesti.
  const ctx = {
    getValue: (_: string, code: string) => (code === 'TI' ? { name: 'TI vorm' } : undefined),
    getByCode: () => [],
  };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  getClassifier: vi.fn(),
  getClassifierValues: vi.fn(),
  updateClassifier: vi.fn(),
}));

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

const classifier = { id: '7', code: 'KOOD', name: 'Klass', description: 'Kirjeldus' };
const values = [
  { classifierId: 7, classifierValueId: 1, code: 'A', name: 'Aktiivne', validFrom: '2026-01-01', validUntil: null, isValid: true, formTypes: [] },
  { classifierId: 7, classifierValueId: 2, code: 'B', name: 'Passiivne', validFrom: '2020-01-01', validUntil: '2021-01-01', isValid: false, formTypes: ['TI', 'XX'] },
];

beforeEach(() => {
  perms = ['classifier.read', 'classifier.edit', 'classifier_value.edit'];
  vi.mocked(getClassifier).mockResolvedValue([classifier]);
  vi.mocked(getClassifierValues).mockResolvedValue({ content: values, total: 2 });
  vi.mocked(updateClassifier).mockResolvedValue([classifier]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/classifiers/7', state }]}>
      <Routes>
        <Route path="/classifiers/:id" element={<ClassifierDetailPage />} />
        <Route path="/classifiers/:id/add-value" element={<div>add-page</div>} />
        <Route path="/classifiers/:id/:valueId" element={<div>value-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ClassifierDetailPage', () => {
  it('ilma õiguseta keelatud', async () => {
    perms = [];
    renderPage();
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });

  it('puuduv klassifikaator', async () => {
    vi.mocked(getClassifier).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it('API viga annab veateate', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getClassifier).mockRejectedValue(new Error('x'));
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
    err.mockRestore();
  });

  it('laadimise ajal laadimistekst', () => {
    vi.mocked(getClassifier).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('kuvab ainult kehtivad väärtused, lüliti näitab kõik', async () => {
    renderPage();
    expect(await screen.findByText('Aktiivne')).toBeTruthy();
    expect(screen.queryByText('Passiivne')).toBeNull();
    expect(screen.getByText('classifiers.formScope.all')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('classifiers.switch'));
    expect(await screen.findByText('Passiivne')).toBeTruthy();
    expect(screen.getByText('TI vorm, XX')).toBeTruthy();
    expect(screen.getByText('classifiers.statusInactive')).toBeTruthy();
  });

  it('kuvab teate navigatsiooni olekust', async () => {
    renderPage({ alert: { message: 'Lisatud!' } });
    expect(await screen.findByText('Lisatud!')).toBeTruthy();
  });

  it('lisa-väärtus nupp navigeerib', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('classifiers.addValue'));
    expect(await screen.findByText('add-page')).toBeTruthy();
  });

  it('rea link viib väärtuse muutmisvaatesse', async () => {
    renderPage();
    const links = await screen.findAllByText('classifiers.change');
    fireEvent.click(links[0]);
    expect(await screen.findByText('value-page')).toBeTruthy();
  });

  it('väärtuste otsing', async () => {
    renderPage();
    await screen.findByText('Aktiivne');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(getClassifierValues).mock.calls.some(([p]) => p.search === 'abc')).toBe(true),
    );
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
  });

  it('muudab ja salvestab klassifikaatori', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('users.edit'));
    fireEvent.change(document.getElementById('name')!, { target: { value: 'Uus nimi' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    await waitFor(() =>
      expect(updateClassifier).toHaveBeenCalledWith({ id: '7', name: 'Uus nimi', description: 'Kirjeldus' }),
    );
    expect(await screen.findByText('classifiers.editedNote')).toBeTruthy();
  });

  it('tühi nimi ei salvestu; tühistamine sulgeb vormi', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('users.edit'));
    fireEvent.change(document.getElementById('name')!, { target: { value: '' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('classifiers.validation.required')).toBeTruthy();
    expect(updateClassifier).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('classifiers.cancel'));
    expect(await screen.findByText('users.edit')).toBeTruthy();
  });

  it('salvestamise vead: valideerimisviga väljale, muu logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(updateClassifier).mockRejectedValueOnce(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'name', code: 'dup' }),
    );
    renderPage();
    fireEvent.click(await screen.findByText('users.edit'));
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('users.validation.api.dup')).toBeTruthy();
    vi.mocked(updateClassifier).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByText('classifiers.save'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('muutmisõiguseta pole muutmis- ja lisamisnuppe', async () => {
    perms = ['classifier.read'];
    renderPage();
    await screen.findByText('Aktiivne');
    expect(screen.queryByText('users.edit')).toBeNull();
    expect(screen.queryByText('classifiers.addValue')).toBeNull();
  });
});
