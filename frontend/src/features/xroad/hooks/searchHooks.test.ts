// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import { useCompanySearch } from './useCompanySearch';
import { usePersonSearch } from './usePersonSearch';
import { useVehicleSearch } from './useVehicleSearch';

afterEach(() => vi.restoreAllMocks());

const company = (n: string) => ({ name: n }) as never;

describe('useCompanySearch', () => {
  it('searchByRegCode: tühi kood ei tee midagi', async () => {
    const spy = vi.spyOn(api, 'searchCompanyByRegCode');
    const onFound = vi.fn();
    const { result } = renderHook(() => useCompanySearch({ onCompanyFound: onFound }));
    await act(() => result.current.searchByRegCode('  '));
    await act(() => result.current.searchByRegCode());
    expect(spy).not.toHaveBeenCalled();
  });

  it('searchByRegCode leidis', async () => {
    vi.spyOn(api, 'searchCompanyByRegCode').mockResolvedValue([company('A')]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useCompanySearch({ onCompanyFound: onFound }));
    await act(() => result.current.searchByRegCode(' 123 '));
    expect(onFound).toHaveBeenCalledWith(company('A'));
    expect(result.current.error).toBe(false);
  });

  it('searchByRegCode tulemusteta ja veaga seab vea', async () => {
    const spy = vi.spyOn(api, 'searchCompanyByRegCode').mockResolvedValue([]);
    const { result } = renderHook(() => useCompanySearch({ onCompanyFound: vi.fn() }));
    await act(() => result.current.searchByRegCode('1'));
    expect(result.current.error).toBe(true);
    spy.mockRejectedValue(new Error('x'));
    await act(() => result.current.searchByRegCode('1'));
    expect(result.current.error).toBe(true);
  });

  it('searchByName: tühi nimi, tulemusteta, viga', async () => {
    const spy = vi.spyOn(api, 'searchCompanyByName').mockResolvedValue([]);
    const { result } = renderHook(() => useCompanySearch({ onCompanyFound: vi.fn() }));
    await act(() => result.current.searchByName(' '));
    expect(spy).not.toHaveBeenCalled();
    await act(() => result.current.searchByName('AS'));
    expect(result.current.error).toBe(true);
    spy.mockRejectedValue(new Error('x'));
    await act(() => result.current.searchByName('AS'));
    expect(result.current.error).toBe(true);
    await act(() => result.current.searchByName());
  });

  it('searchByName: üks tulemus kutsub otse, mitu avab valiku', async () => {
    const spy = vi.spyOn(api, 'searchCompanyByName').mockResolvedValue([company('A')]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useCompanySearch({ onCompanyFound: onFound }));
    await act(() => result.current.searchByName('A'));
    expect(onFound).toHaveBeenCalledWith(company('A'));

    spy.mockResolvedValue([company('A'), company('B')]);
    await act(() => result.current.searchByName('A'));
    expect(result.current.pickerResults).toHaveLength(2);

    act(() => result.current.handleCompanyPicked(company('B')));
    expect(onFound).toHaveBeenLastCalledWith(company('B'));
    expect(result.current.pickerResults).toEqual([]);

    await act(() => result.current.searchByName('A'));
    act(() => result.current.closePicker());
    expect(result.current.pickerResults).toEqual([]);
    act(() => result.current.setError(true));
    expect(result.current.error).toBe(true);
  });
});

describe('usePersonSearch', () => {
  it('vigane isikukood seab vea', async () => {
    const spy = vi.spyOn(api, 'searchPersonByCode');
    const { result } = renderHook(() => usePersonSearch({ onPersonFound: vi.fn() }));
    await act(() => result.current.searchByPersonalCode('123'));
    await act(() => result.current.searchByPersonalCode());
    expect(result.current.error).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('leitud, ei leitud ja viga', async () => {
    const spy = vi.spyOn(api, 'searchPersonByCode').mockResolvedValue({ firstName: 'A' } as never);
    const onFound = vi.fn();
    const { result } = renderHook(() => usePersonSearch({ onPersonFound: onFound }));
    await act(() => result.current.searchByPersonalCode('39001010000'));
    expect(onFound).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    spy.mockResolvedValue(null);
    await act(() => result.current.searchByPersonalCode('39001010000'));
    expect(result.current.notFound).toBe(true);

    spy.mockRejectedValue(new Error('x'));
    await act(() => result.current.searchByPersonalCode('39001010000'));
    expect(result.current.error).toBe(true);

    act(() => {
      result.current.setError(false);
      result.current.setNotFound(false);
    });
    expect(result.current.error).toBe(false);
  });
});

describe('useVehicleSearch', () => {
  it('tühi number seab vea', async () => {
    const { result } = renderHook(() => useVehicleSearch({ onVehicleFound: vi.fn() }));
    await act(() => result.current.searchByRegNr(' '));
    expect(result.current.error).toBe(true);
    act(() => result.current.setError(false));
    expect(result.current.error).toBe(false);
  });

  it('leitud, tühi ja viga', async () => {
    const spy = vi.spyOn(api, 'searchVehicleByRegNr').mockResolvedValue([{ regNr: '1' } as never]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useVehicleSearch({ onVehicleFound: onFound }));
    await act(() => result.current.searchByRegNr(' 123ABC '));
    expect(spy).toHaveBeenCalledWith('123ABC');
    expect(onFound).toHaveBeenCalled();
    spy.mockResolvedValue([]);
    await act(() => result.current.searchByRegNr('1'));
    expect(result.current.error).toBe(true);
    spy.mockRejectedValue(new Error('x'));
    await act(() => result.current.searchByRegNr('1'));
    expect(result.current.error).toBe(true);
  });
});
