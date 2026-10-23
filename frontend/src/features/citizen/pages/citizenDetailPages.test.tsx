// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
  }),
}));

const api = vi.hoisted(() => ({
  getCitizenCompoundForm: vi.fn(),
  getCitizenCompoundSubForms: vi.fn(),
  getCitizenForeignViolationForm: vi.fn(),
  getCitizenGoodReputeForm: vi.fn(),
  getCitizenLabourInspectionForm: vi.fn(),
}));
vi.mock('../api', () => api);

vi.mock('../../control-forms/pages/foreign-violation-form/useForeignViolationForm', () => ({
  useForeignViolationForm: () => ({ orgOptions: [], structureUnits: [] }),
}));
vi.mock('../../control-forms/components/ForeignViolationForm/ForeignViolationFormFields', () => ({
  ForeignViolationFormFields: () => <div>fv-fields</div>,
}));
vi.mock('../../control-forms/pages/labour-inspection/useLabourInspectionForm', () => ({
  useLabourInspectionForm: () => ({ transportTypes: [], violationClassifiers: [] }),
}));
vi.mock('../../control-forms/components/LabourInspection/LabourInspectionFormFields', () => ({
  LabourInspectionFormFields: () => <div>li-fields</div>,
}));
vi.mock('../../control-forms/components/GoodRepute/GoodReputeFormFields', () => ({
  GoodReputeFormFields: ({ countryOptions }: { countryOptions: unknown[] }) => (
    <div>gr-fields:{countryOptions.length}</div>
  ),
}));
vi.mock('../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'EE', name: 'Eesti', isValid: true },
      { code: 'XX', name: 'Vana', isValid: false },
    ],
  }),
}));

import { CitizenCompoundDetailPage } from './CitizenCompoundDetailPage/CitizenCompoundDetailPage';
import { CitizenSubFormsSection } from './CitizenCompoundDetailPage/CitizenSubFormsSection';
import { CitizenForeignViolationDetailPage } from './CitizenForeignViolationDetailPage/CitizenForeignViolationDetailPage';
import { CitizenGoodReputeDetailPage } from './CitizenGoodReputeDetailPage/CitizenGoodReputeDetailPage';
import { CitizenLabourInspectionDetailPage } from './CitizenLabourInspectionDetailPage/CitizenLabourInspectionDetailPage';
import type { CitizenSubForm } from '../types';

function at(path: string, el: ReactElement, routePath = '/x/:id') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={el} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.getCitizenCompoundSubForms.mockResolvedValue([]);
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const compound = {
  formNumber: 'K-1',
  controlDate: '2026-03-31',
  county: 'Harju',
  address: 'Tn 1',
  vehicleRegNr: '123ABC',
  companyName: 'Firma',
  companyRegCode: '999',
  drivers: [
    { firstName: 'Mari', lastName: 'Maasikas', personalCodeEe: '4000' },
    { firstName: '', lastName: '', personalCodeForeign: 'FX1' },
  ],
};

describe('CitizenCompoundDetailPage', () => {
  it('renders the summary with several drivers and sub-forms', async () => {
    api.getCitizenCompoundForm.mockResolvedValue([compound]);
    api.getCitizenCompoundSubForms.mockResolvedValue([
      { formType: 'adr', formKey: 1, subFormNumber: 'A-1', status: 'published', resultType: 'ok', violations: [], notes: null },
    ]);
    at('/x/5', <CitizenCompoundDetailPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('K-1')).toBeTruthy());
    expect(screen.getByText('Mari Maasikas')).toBeTruthy();
    expect(screen.getByText('FX1')).toBeTruthy();
    expect(screen.getAllByText('citizen.compoundDetail.driverLabel')).toHaveLength(2);
    await waitFor(() => expect(screen.getByText('A-1', { exact: false })).toBeTruthy());
  });

  it('falls back to placeholders for a sparse form without drivers', async () => {
    api.getCitizenCompoundForm.mockResolvedValue({});
    api.getCitizenCompoundSubForms.mockRejectedValue(new Error('x'));
    at('/x/5', <CitizenCompoundDetailPage />);
    await waitFor(() => expect(screen.getByText('citizen.compoundDetail.noDrivers')).toBeTruthy());
    expect(screen.getByText('forms.compound_form')).toBeTruthy();
    expect(screen.getByText('citizen.compoundDetail.subFormsEmpty')).toBeTruthy();
  });

  it('shows a single driver without a numbered label', async () => {
    api.getCitizenCompoundForm.mockResolvedValue({ drivers: [{ firstName: 'A' }] });
    at('/x/5', <CitizenCompoundDetailPage />);
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
    expect(screen.queryByText('citizen.compoundDetail.driverLabel')).toBeNull();
  });

  it('shows not-found on failure and does nothing without id', async () => {
    api.getCitizenCompoundForm.mockRejectedValue(new Error('x'));
    at('/x/5', <CitizenCompoundDetailPage />);
    await waitFor(() => expect(screen.getAllByText('forms.compound_form').length).toBeGreaterThan(0));
    cleanup();
    api.getCitizenCompoundForm.mockClear();
    at('/x', <CitizenCompoundDetailPage />, '/x');
    expect(api.getCitizenCompoundForm).not.toHaveBeenCalled();
  });
});

describe('CitizenSubFormsSection', () => {
  const sub = (over: Partial<CitizenSubForm>): CitizenSubForm => ({
    formType: 'sp_driver',
    formKey: 1,
    subFormNumber: 'S-1',
    status: 'published',
    resultType: null,
    violations: [],
    notes: null,
    ...over,
  });

  it('renders violations with severity/reference, notes and fallbacks', () => {
    render(
      <CitizenSubFormsSection
        subForms={[
          sub({
            resultType: 'violation',
            notes: 'märkus',
            violations: [
              { severityCode: 'MSI', regulation: '561/2006' },
              { riskCategory: 'VSI', adrProvision: '1.2.3' },
              { severityCode: 'SI' },
              { regulation: 'only-ref' },
              {},
            ],
          }),
          sub({ formKey: 2, formType: 'vehicle_technical', subFormNumber: 'V-2', resultType: 'ok' }),
          sub({ formKey: 3, formType: 'kv', subFormNumber: 'KV-3', resultType: 'other' }),
        ]}
      />,
    );
    expect(screen.getByText(/MSI/)).toBeTruthy();
    expect(screen.getByText(/561\/2006/)).toBeTruthy();
    expect(screen.getByText(/1\.2\.3/)).toBeTruthy();
    expect(screen.getByText(/only-ref/)).toBeTruthy();
    expect(screen.getByText(/märkus/)).toBeTruthy();
    expect(screen.getAllByText('citizen.compoundDetail.noViolations')).toHaveLength(1);
  });
});

describe('CitizenForeignViolationDetailPage', () => {
  it('renders the form fields', async () => {
    api.getCitizenForeignViolationForm.mockResolvedValue([{ formNumber: 'VR-1' }]);
    at('/x/1', <CitizenForeignViolationDetailPage />);
    await waitFor(() => expect(screen.getByText('fv-fields')).toBeTruthy());
    expect(screen.getByText('VR-1')).toBeTruthy();
  });

  it('uses the default title without a number and not-found on error', async () => {
    api.getCitizenForeignViolationForm.mockResolvedValueOnce({});
    at('/x/1', <CitizenForeignViolationDetailPage />);
    await waitFor(() => expect(screen.getByText('fv-fields')).toBeTruthy());
    expect(screen.getByText('forms.foreign_violation_form')).toBeTruthy();
    cleanup();
    api.getCitizenForeignViolationForm.mockRejectedValueOnce(new Error('x'));
    at('/x/1', <CitizenForeignViolationDetailPage />);
    await waitFor(() => expect(screen.queryByText('fv-fields')).toBeNull());
    cleanup();
    at('/x', <CitizenForeignViolationDetailPage />, '/x');
  });
});

describe('CitizenGoodReputeDetailPage', () => {
  it('renders fields with valid country options only', async () => {
    api.getCitizenGoodReputeForm.mockResolvedValue({ formNumber: 'G-1' });
    at('/x/1', <CitizenGoodReputeDetailPage />);
    await waitFor(() => expect(screen.getByText('gr-fields:1')).toBeTruthy());
    expect(screen.getByText('G-1')).toBeTruthy();
  });

  it('falls back to the title and not-found', async () => {
    api.getCitizenGoodReputeForm.mockResolvedValueOnce([{}]);
    at('/x/1', <CitizenGoodReputeDetailPage />);
    await waitFor(() => expect(screen.getByText('forms.good_repute_form')).toBeTruthy());
    cleanup();
    api.getCitizenGoodReputeForm.mockRejectedValueOnce(new Error('x'));
    at('/x/1', <CitizenGoodReputeDetailPage />);
    await waitFor(() => expect(screen.queryByText('gr-fields:1')).toBeNull());
    cleanup();
    at('/x', <CitizenGoodReputeDetailPage />, '/x');
  });
});

describe('CitizenLabourInspectionDetailPage', () => {
  it('renders the title with version and fields', async () => {
    api.getCitizenLabourInspectionForm.mockResolvedValue([{ formNumber: 'TI-1', version: 3 }]);
    at('/x/1', <CitizenLabourInspectionDetailPage />);
    await waitFor(() => expect(screen.getByText('TI-1/3')).toBeTruthy());
    expect(screen.getByText('li-fields')).toBeTruthy();
  });

  it('defaults version to 1, falls back to the title and handles errors', async () => {
    api.getCitizenLabourInspectionForm.mockResolvedValueOnce({ formNumber: 'TI-2' });
    at('/x/1', <CitizenLabourInspectionDetailPage />);
    await waitFor(() => expect(screen.getByText('TI-2/1')).toBeTruthy());
    cleanup();
    api.getCitizenLabourInspectionForm.mockResolvedValueOnce({});
    at('/x/1', <CitizenLabourInspectionDetailPage />);
    await waitFor(() => expect(screen.getByText('forms.labour_inspection_form')).toBeTruthy());
    cleanup();
    api.getCitizenLabourInspectionForm.mockRejectedValueOnce(new Error('x'));
    at('/x/1', <CitizenLabourInspectionDetailPage />);
    await waitFor(() => expect(screen.queryByText('li-fields')).toBeNull());
    cleanup();
    at('/x', <CitizenLabourInspectionDetailPage />, '/x');
  });
});
