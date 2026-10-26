// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassifierValueCreatePage } from './ClassifierValueCreatePage';
import { ClassifierValueEditPage } from '../ClassifierValueEditPage/ClassifierValueEditPage';
import { getClassifierValue, insertClassifierValue, updateClassifierValue } from '../../api';
import { ApiError } from '../../../../shared/api/client';

let perms: string[] = [];
const refetch = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../ClassifierProvider', () => ({
  useClassifiers: () => ({ refetch, getByCode: () => [] }),
}));
vi.mock('../../api', () => ({
  getClassifierValue: vi.fn(),
  insertClassifierValue: vi.fn(),
  updateClassifierValue: vi.fn(),
}));
vi.mock('../../../control-forms/components/shared/MaskedDateField.tsx', () => ({
  MaskedDateField: ({
    id,
    onSelect,
    inputProps,
  }: {
    id: string;
    onSelect: (d: Date) => void;
    inputProps?: { helper?: { text: string } };
  }) => (
    <div>
      <input data-testid={id} onChange={(e) => onSelect(new Date(e.target.value))} />
      {inputProps?.helper && <span>{inputProps.helper.text}</span>}
    </div>
  ),
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

beforeEach(() => {
  perms = ['classifier_value.edit'];
  vi.mocked(insertClassifierValue).mockResolvedValue([]);
  vi.mocked(updateClassifierValue).mockResolvedValue([]);
  vi.mocked(getClassifierValue).mockResolvedValue({
    classifierId: 7,
    classifierValueId: 3,
    code: 'KOOD',
    name: 'Nimi',
    validFrom: '2026-01-01',
    validUntil: null,
    formTypes: ['B', 'A'],
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Detail() {
  const { state } = useLocation();
  return <div>detail-page:{(state as { alert?: { message: string } } | null)?.alert?.message}</div>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/classifiers/:id/add-value" element={<ClassifierValueCreatePage />} />
        <Route path="/classifiers/:id/:valueId" element={<ClassifierValueEditPage />} />
        <Route path="/classifiers/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ClassifierValueCreatePage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderAt('/classifiers/7/add-value');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('valideerib kohustuslikud väljad', async () => {
    renderAt('/classifiers/7/add-value');
    fireEvent.click(screen.getByText('classifiers.save'));
    await waitFor(() => expect(screen.getAllByText('classifiers.validation.required').length).toBeGreaterThan(0));
    expect(insertClassifierValue).not.toHaveBeenCalled();
  });

  it('lõpp enne algust ei salvestu', async () => {
    renderAt('/classifiers/7/add-value');
    fireEvent.change(document.getElementById('code')!, { target: { value: 'K' } });
    fireEvent.change(document.getElementById('name')!, { target: { value: 'N' } });
    fireEvent.change(screen.getByTestId('validFrom'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByTestId('validUntil'), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('classifiers.validation.endBeforeStart')).toBeTruthy();
    expect(insertClassifierValue).not.toHaveBeenCalled();
  });

  it('lisab väärtuse ja navigeerib teatega detailvaatesse', async () => {
    renderAt('/classifiers/7/add-value');
    fireEvent.change(document.getElementById('code')!, { target: { value: 'K' } });
    fireEvent.change(document.getElementById('name')!, { target: { value: 'N' } });
    fireEvent.change(screen.getByTestId('validFrom'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByTestId('validUntil'), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('detail-page:classifiers.valueAddedNote')).toBeTruthy();
    expect(insertClassifierValue).toHaveBeenCalledWith({
      classifierId: '7',
      code: 'K',
      name: 'N',
      validFrom: '2026-05-01',
      validUntil: '2026-06-01',
      formTypes: [],
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('serveri vead: valideerimine väljale, muu logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(insertClassifierValue).mockRejectedValueOnce(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'code', code: 'dup' }),
    );
    renderAt('/classifiers/7/add-value');
    fireEvent.change(document.getElementById('code')!, { target: { value: 'K' } });
    fireEvent.change(document.getElementById('name')!, { target: { value: 'N' } });
    fireEvent.change(screen.getByTestId('validFrom'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('classifiers.validation.api.dup')).toBeTruthy();
    vi.mocked(insertClassifierValue).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByText('classifiers.save'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('tühistamine viib tagasi', async () => {
    renderAt('/classifiers/7/add-value');
    fireEvent.click(screen.getByText('classifiers.cancel'));
    expect(await screen.findByText('detail-page:')).toBeTruthy();
  });
});

describe('ClassifierValueEditPage', () => {
  it('ilma õiguseta keelatud', async () => {
    perms = [];
    renderAt('/classifiers/7/3');
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });

  it('puuduv väärtus', async () => {
    vi.mocked(getClassifierValue).mockResolvedValue(undefined as never);
    renderAt('/classifiers/7/3');
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it('API viga', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getClassifierValue).mockRejectedValue(new Error('x'));
    renderAt('/classifiers/7/3');
    expect(await screen.findByText('common.error')).toBeTruthy();
    err.mockRestore();
  });

  it('laadimise ajal laadimistekst', () => {
    vi.mocked(getClassifierValue).mockReturnValue(new Promise(() => {}));
    renderAt('/classifiers/7/3');
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('salvestab muudatused (kood ja nimi lukus) ja navigeerib', async () => {
    renderAt('/classifiers/7/3');
    expect(await screen.findByText('classifiers.editClassifierValue')).toBeTruthy();
    expect((document.getElementById('code') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('validUntil'), { target: { value: '2027-01-01' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(await screen.findByText('detail-page:classifiers.valueEditedNote')).toBeTruthy();
    expect(updateClassifierValue).toHaveBeenCalledWith({
      classifierId: '7',
      classifierValueId: '3',
      code: 'KOOD',
      name: 'Nimi',
      validFrom: '2026-01-01',
      validUntil: '2027-01-01',
      formTypes: ['A', 'B'],
    });
  });

  it('tühistamine viib tagasi', async () => {
    renderAt('/classifiers/7/3');
    fireEvent.click(await screen.findByText('classifiers.cancel'));
    expect(await screen.findByText('detail-page:')).toBeTruthy();
  });
});
