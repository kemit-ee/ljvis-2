// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassifierProvider, useClassifiers } from './ClassifierProvider';
import { useClassifierLabel } from './useClassifierLabel';
import { listClassifierValues } from '../classifier-values/api';

let user: { activeRole: string } | null = { activeRole: 'officer' };

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user }) }));
vi.mock('../classifier-values/api', () => ({ listClassifierValues: vi.fn() }));

const data = [
  { classifierValueKey: 1, classifierCode: 'ERRU_MEMBER', code: 'LV', name: 'Läti', parentKey: null },
  { classifierValueKey: 2, classifierCode: 'ERRU_MEMBER', code: 'EE', name: 'Eesti', parentKey: null },
  { classifierValueKey: 3, classifierCode: 'ERRU_MEMBER', code: 'XX', name: 'Aegunud', parentKey: null, isValid: false },
  { classifierValueKey: 4, classifierCode: 'TT', code: 'A', name: 'A-nimi', parentKey: null },
  { classifierValueKey: 5, classifierCode: 'TT', code: 'A', name: 'A-duplikaat', parentKey: null },
  { classifierValueKey: 6, classifierCode: 'TT', code: 'B', name: 'B-nimi', parentKey: 4 },
];

beforeEach(() => {
  user = { activeRole: 'officer' };
  vi.mocked(listClassifierValues).mockResolvedValue(data);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => <ClassifierProvider>{children}</ClassifierProvider>;

describe('ClassifierProvider', () => {
  it('ilma kasutajata ei lae midagi', async () => {
    user = null;
    const { result } = renderHook(() => useClassifiers(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.values).toEqual([]);
    expect(listClassifierValues).not.toHaveBeenCalled();
  });

  it('ametnik kasutab ametniku otspunkti, kodanik kodaniku oma', async () => {
    renderHook(() => useClassifiers(), { wrapper });
    await waitFor(() => expect(listClassifierValues).toHaveBeenCalledWith(false));
    cleanup();
    user = { activeRole: 'citizen' };
    renderHook(() => useClassifiers(), { wrapper });
    await waitFor(() => expect(listClassifierValues).toHaveBeenCalledWith(true));
  });

  it('pakub päringuid: getByCode (unikaalsed), getValue, getChildren, ERRU riigid', async () => {
    const { result } = renderHook(() => useClassifiers(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getByCode('TT').map((v) => v.name)).toEqual(['A-nimi', 'B-nimi']);
    expect(result.current.getValue('TT', 'B')?.name).toBe('B-nimi');
    expect(result.current.getValue('TT', 'Z')).toBeUndefined();
    expect(result.current.getChildren('TT', 4).map((v) => v.code)).toEqual(['B']);
    expect(result.current.getErruMemberCountries().map((v) => v.name)).toEqual(['Eesti', 'Läti']);
  });

  it('laadimisviga annab tühja nimekirja ja refetch laeb uuesti', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listClassifierValues).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useClassifiers(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.values).toEqual([]);
    expect(err).toHaveBeenCalled();
    await act(() => result.current.refetch());
    expect(result.current.values).toHaveLength(6);
    err.mockRestore();
  });

  it('ilma pakkujata on kontekst tühi', () => {
    const { result } = renderHook(() => useClassifiers());
    expect(result.current.loading).toBe(true);
    expect(result.current.getByCode('X')).toEqual([]);
    expect(result.current.getValue('X', 'Y')).toBeUndefined();
    expect(result.current.getChildren('X', null)).toEqual([]);
    expect(result.current.getErruMemberCountries()).toEqual([]);
    return act(() => result.current.refetch());
  });
});

describe('useClassifierLabel', () => {
  it('sildid ja valikud', async () => {
    const { result } = renderHook(() => ({ c: useClassifiers(), l: useClassifierLabel() }), { wrapper });
    await waitFor(() => expect(result.current.c.loading).toBe(false));
    expect(result.current.l.label('TT', 'B')).toBe('B-nimi');
    expect(result.current.l.label('TT', 'ZZ')).toBe('ZZ');
    expect(result.current.l.label('TT', null)).toBe('—');
    expect(result.current.l.label('TT', undefined)).toBe('—');
    expect(result.current.l.options('TT')).toEqual([
      { value: 'A', label: 'A-nimi' },
      { value: 'B', label: 'B-nimi' },
    ]);
  });
});

it('renderdab lapsed', async () => {
  render(
    <ClassifierProvider>
      <span>laps</span>
    </ClassifierProvider>,
  );
  expect(screen.getByText('laps')).toBeTruthy();
  await waitFor(() => expect(listClassifierValues).toHaveBeenCalled());
});
