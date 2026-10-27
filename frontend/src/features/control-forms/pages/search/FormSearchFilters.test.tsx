// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormSearchFilters as Filters } from '../../types';

vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    Select: stubs.SelectStub,
    TextField: stubs.TextFieldStub,
    DateField: stubs.DateFieldStub,
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../api', () => ({ getSearchCarrierCountries: vi.fn() }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: (code: string) =>
      code === 'EHAK'
        ? [
            { classifierValueKey: 2, name: 'Tartu maakond', parentKey: null },
            { classifierValueKey: 1, name: 'Harju maakond', parentKey: null },
            { classifierValueKey: 3, name: 'Tartu linn', parentKey: 2 },
          ]
        : [
            { code: 'LV', name: 'Läti', isValid: true },
            { code: 'EE', name: 'Eesti', isValid: true },
            { code: 'XX', name: 'Vana', isValid: false },
          ],
  }),
}));

import { FormSearchFilters } from './FormSearchFilters';
import { getSearchCarrierCountries } from '../../api';

const baseDraft = {
  dateFrom: '2026-01-01',
  dateTo: '',
  formType: '',
  formNumber: '',
  vehicleRegNr: '',
  companyRegCode: '',
  companyName: '',
  driver: '',
  county: '',
  carrierOrigin: '',
  hasViolation: '',
  status: '',
  vrReportingCountryCode: '',
  vrSanctionCode: '',
} as Filters;

const setup = (draft: Partial<Filters> = {}) => {
  const props = { setField: vi.fn(), onSearch: vi.fn(), onClear: vi.fn() };
  render(<FormSearchFilters draft={{ ...baseDraft, ...draft }} resetKey={0} {...props} />);
  return props;
};

beforeEach(() => {
  vi.mocked(getSearchCarrierCountries).mockResolvedValue([
    { countryCode: 'LV' },
    { countryCode: 'EE' },
    { countryCode: 'SE' },
  ]);
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FormSearchFilters', () => {
  it('väljade muutmine kutsub setField-i', async () => {
    const { setField } = setup();
    await waitFor(() => expect(screen.getByTestId('search-carrier-origin').children.length).toBe(5));
    const type = (id: string, value: string) =>
      fireEvent.change(screen.getByTestId(id), { target: { value } });
    type('search-date-from', '2026-02-02');
    expect(setField).toHaveBeenCalledWith('dateFrom', '2026-02-02');
    type('search-date-to', '');
    type('search-form-type', 'adr');
    expect(setField).toHaveBeenCalledWith('formType', 'adr');
    type('search-form-number', 'F1');
    type('search-vehicle-reg-nr', 'V1');
    type('search-company-reg-code', 'C1');
    type('search-company-name', 'N1');
    type('search-driver', 'D1');
    expect(setField).toHaveBeenCalledWith('driver', 'D1');
    type('search-county', '1');
    expect(setField).toHaveBeenCalledWith('county', '1');
    type('search-carrier-origin', 'country:LV');
    expect(setField).toHaveBeenCalledWith('carrierOrigin', 'country:LV');
    type('search-has-violation', 'true');
    type('search-status', 'saved');
    expect(setField).toHaveBeenCalledWith('status', 'saved');
  });

  it('päritoluvalikus on riigid klassifikaatorist, EE jäetakse välja', async () => {
    setup();
    const select = screen.getByTestId('search-carrier-origin') as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBe(5));
    expect([...select.options].map((o) => o.label)).toEqual([
      'search.carrierOrigin.all',
      'search.carrierOrigin.ee',
      'search.carrierOrigin.foreign',
      'Läti',
      'SE',
    ]);
  });

  it('riikide laadimise viga ei sega filtrit', async () => {
    vi.mocked(getSearchCarrierCountries).mockRejectedValue(new Error('x'));
    setup();
    await waitFor(() =>
      expect((screen.getByTestId('search-carrier-origin') as HTMLSelectElement).options.length).toBe(3),
    );
  });

  it('VR-i valikul ilmuvad riigi ja sanktsiooni valikud', () => {
    const { setField } = setup({ formType: 'foreign_violation' });
    fireEvent.change(screen.getByTestId('search-vr-reporting-country'), { target: { value: 'LV' } });
    expect(setField).toHaveBeenCalledWith('vrReportingCountryCode', 'LV');
    fireEvent.change(screen.getByTestId('search-vr-sanction-code'), { target: { value: 'TRAHV' } });
    expect(setField).toHaveBeenCalledWith('vrSanctionCode', 'TRAHV');
    expect(screen.getByTestId('search-vr-reporting-country').children.length).toBe(2);
  });

  it('muu tüübi korral VR-i valikuid ei ole', () => {
    setup({ formType: 'adr' });
    expect(screen.queryByTestId('search-vr-sanction-code')).toBeNull();
  });

  it('nupud kutsuvad onSearch ja onClear', () => {
    const { onSearch, onClear } = setup();
    fireEvent.click(screen.getByText('common.search'));
    fireEvent.click(screen.getByText('search.clear'));
    expect(onSearch).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });
});
