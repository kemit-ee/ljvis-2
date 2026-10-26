// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    Select: stubs.SelectStub,
    TextField: stubs.TextFieldStub,
    ChoiceGroup: stubs.ChoiceGroupStub,
  };
});
vi.mock('../shared/MaskedDateField', async () => {
  const stubs = await import('../../testing/tediStubs');
  return { MaskedDateField: stubs.DateFieldStub };
});
vi.mock('../shared/FileUploadBlock.tsx', async () => {
  const stubs = await import('../../testing/commonStubs');
  return { FileUploadBlock: stubs.FileUploadBlockStub };
});

import { GoodReputeFormFields } from './GoodReputeFormFields';

const countries = [
  { value: 'EE', label: 'Eesti' },
  { value: 'LV', label: 'Läti' },
];

const setup = (opts: {
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  readOnly?: boolean;
  searchError?: boolean;
  searchNotFound?: boolean;
  isDesktop?: boolean;
}) => {
  const setFieldValue = vi.fn();
  const handlers = {
    onSearchPerson: vi.fn(),
    onSearchErrorClose: vi.fn(),
    onSearchNotFoundClose: vi.fn(),
  };
  const formik = {
    values: { fitnessStatus: 'fit', ...opts.values },
    errors: opts.errors ?? {},
    touched: opts.touched ?? {},
    setFieldValue,
  };
  render(
    <GoodReputeFormFields
      formik={formik as never}
      readOnly={opts.readOnly ?? false}
      countryOptions={countries}
      searchLoading={false}
      searchError={!!opts.searchError}
      searchNotFound={!!opts.searchNotFound}
      isDesktop={opts.isDesktop ?? true}
      {...handlers}
    />,
  );
  return { setFieldValue, ...handlers };
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GoodReputeFormFields', () => {
  it('väljade muutmine kutsub setFieldValue', () => {
    const { setFieldValue } = setup({});
    const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    type('personalCode', '123');
    type('firstName', 'A');
    type('lastName', 'B');
    type('placeOfBirth', 'T');
    type('certificateNumber', 'N');
    type('dateOfBirth', '1990-01-02');
    type('certificateIssueDate', '2020-02-03');
    type('certificateCountryCode', 'LV');
    for (const f of [
      'personalCode', 'firstName', 'lastName', 'placeOfBirth', 'certificateNumber',
      'dateOfBirth', 'certificateIssueDate', 'certificateCountryCode',
    ]) {
      expect(setFieldValue.mock.calls.some((c) => c[0] === f)).toBe(true);
    }
    expect(setFieldValue).toHaveBeenCalledWith('certificateCountryCode', 'LV');
  });

  it('riigi tühjendamine annab tühja stringi', () => {
    const { setFieldValue } = setup({ values: { certificateCountryCode: 'EE' } });
    expect(screen.getByTestId('certificateCountryCode')).toBeTruthy();
    fireEvent.change(screen.getByTestId('certificateCountryCode'), { target: { value: 'nope' } });
    expect(setFieldValue).toHaveBeenCalled();
  });

  it('sobivuse muutmine nullib unfit kuupäevad', () => {
    const { setFieldValue } = setup({});
    fireEvent.click(screen.getByTestId('fitnessStatus-unfit'));
    expect(setFieldValue).toHaveBeenCalledWith('fitnessStatus', 'unfit');
    expect(setFieldValue).toHaveBeenCalledWith('unfitFromDate', '');
    expect(setFieldValue).toHaveBeenCalledWith('unfitUntilDate', '');
  });

  it('readOnly režiimis sobivuse valik ei muuda midagi ja otsingunupp puudub', () => {
    const { setFieldValue } = setup({ readOnly: true, values: { fitnessStatus: 'fit' } });
    expect(screen.queryByText('common.search')).toBeNull();
    const radio = screen.getByTestId('fitnessStatus-unfit') as HTMLInputElement;
    expect(radio.disabled).toBe(true);
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it('unfit näitab kuupäevi ja nende muutmine töötab', () => {
    const { setFieldValue } = setup({ values: { fitnessStatus: 'unfit', unfitFromDate: '2026-01-01' }, isDesktop: false });
    fireEvent.change(screen.getByTestId('unfitFromDate'), { target: { value: '2026-02-02' } });
    fireEvent.change(screen.getByTestId('unfitUntilDate'), { target: { value: '2026-03-03' } });
    expect(setFieldValue).toHaveBeenCalledWith('unfitFromDate', '2026-02-02');
    expect(setFieldValue).toHaveBeenCalledWith('unfitUntilDate', '2026-03-03');
  });

  it('veateated ja otsinguteated renderduvad, sulgemine kutsub käsitlejaid', () => {
    const h = setup({
      searchError: true,
      searchNotFound: true,
      values: { fitnessStatus: 'unfit', formNumber: 'GR-1' },
      touched: {
        personalCode: true, firstName: true, lastName: true, dateOfBirth: true,
        certificateNumber: true, certificateIssueDate: true, certificateCountryCode: true,
        unfitFromDate: true, unfitUntilDate: true,
      },
      errors: {
        personalCode: 'E1', firstName: 'E2', lastName: 'E3', dateOfBirth: 'E4', certificateNumber: 'E5',
        certificateIssueDate: 'E6', certificateCountryCode: 'E7', unfitFromDate: 'E8', unfitUntilDate: 'E9',
      },
    });
    expect(screen.getByText('forms.good_repute.driver.searchInvalid')).toBeTruthy();
    expect(screen.getByText('forms.good_repute.driver.searchNotFound')).toBeTruthy();
    expect(screen.getByText('E1')).toBeTruthy();
    expect(screen.getByTestId('file-upload').getAttribute('data-form-number')).toBe('GR-1');
    fireEvent.click(screen.getByText('common.search'));
    expect(h.onSearchPerson).toHaveBeenCalled();
    for (const btn of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(btn);
  });
});
