// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompoundFormViewCard } from './CompoundFormViewCard';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../FormVersionsTable/FormVersionsTable', () => ({ FormVersionsTable: () => <div data-testid="versions" /> }));
vi.mock('../FormPrintButton/FormPrintButton', () => ({
  FormPrintButton: (p: { endpoint: string; snapshotId?: string }) => <div data-testid="print">{`${p.endpoint}|${p.snapshotId ?? ''}`}</div>,
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => {
    const data: Record<string, unknown[]> = {
      COUNTRY: [{ code: 'EE', name: 'Eesti' }, { code: 'FI', name: 'Soome' }],
      ROAD_NAME: [{ code: 'R1', name: 'Tallinna-Tartu' }],
      TRAILER_CATEGORY: [{ code: 'C_2012', name: 'O3' }],
      VEHICLE_CATEGORY: [{ code: 'A_2012', name: 'N2' }],
      EHAK: [
        { classifierValueKey: 1, name: 'Harju', parentKey: null },
        { classifierValueKey: 10, name: 'Tallinn', parentKey: 1 },
      ],
      STRUCTURE_UNIT: [{ code: 'U1', name: 'Üksus' }],
    };
    return {
      getByCode: (c: string) => data[c] ?? [],
      getChildren: (c: string, p: number) => (data[c] ?? []).filter((e) => (e as { parentKey: number }).parentKey === p),
    };
  },
}));

const base = {
  id: '5',
  formNumber: 'KV-1/2026',
  controlCountryCode: 'EE',
  address: 'Tänav',
  road: 'R1',
  kilometer: '12',
  roadOther: '',
  county: '1',
  city: '10',
  road_type: 'Riigimaantee',
  controlDate: '2026-01-02',
  controlTime: '10:30:00',
  vehicleRegNr: '123ABC',
  vehicleCountryCode: 'EE',
  vehicleFirstRegistration: '2020-01-01',
  vehicleCategoryCode: 'A_2012',
  companyCountryCode: 'EE',
  companyCounty: '1',
  companyCity: '10',
  inspectorOrganisationId: 'PPA',
  inspectorUnit: 'U1',
  trailers: [{ regNr: 'T1', countryCode: 'FI', categoryCode: 'C_2012', firstRegistration: '2019-05-05' }, { regNr: 'T2' }],
  drivers: [{ firstName: 'Mari', birthDate: '1990-01-01', citizenshipCode: 'EE' }, { firstName: 'Mati' }],
};
const props = { isDesktop: true, canEdit: false, orgOptions: [{ label: 'Politsei', value: 'PPA' }], formType: 'compound-form' };

const ViewCard = CompoundFormViewCard as unknown as React.ComponentType<Record<string, unknown>>;

describe('CompoundFormViewCard', () => {
  afterEach(cleanup);
  const view = (form: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    render(<ViewCard {...props} {...extra} form={form} />);

  it('kuvab vormi kõik plokid töölaua vaates', () => {
    view(base, { snapshotId: 'sn' });
    expect(screen.getByText('KV-1')).toBeTruthy();
    expect((document.getElementById('address') as HTMLInputElement).value).toBe('Tänav');
    expect((document.getElementById('road') as HTMLSelectElement).value).toBe('R1');
    expect((document.getElementById('county') as HTMLSelectElement).value).toBe('1');
    expect((document.getElementById('city') as HTMLSelectElement).value).toBe('10');
    expect((document.getElementById('vehicleCategoryCode') as HTMLInputElement).value).toBe('N2');
    expect((document.getElementById('trailerCategoryCode_0') as HTMLInputElement).value).toBe('O3');
    expect((document.getElementById('companyCounty') as HTMLSelectElement).value).toBe('1');
    expect((document.getElementById('inspectorOrganisation') as HTMLSelectElement).value).toBe('PPA');
    expect(screen.getByText('forms.compound.teammate')).toBeTruthy();
    expect(screen.getByTestId('versions')).toBeTruthy();
    expect(screen.getByTestId('print').textContent).toBe('/v1/control-forms/compound-form/read/print|sn');
  });

  it('mobiilivaade, JSON-stringina haagised/juhid ja välisriigi ettevõte', () => {
    view(
      { ...base, companyCountryCode: 'FI', companyCounty: 'X', companyCity: 'Y', trailers: JSON.stringify(base.trailers), drivers: JSON.stringify(base.drivers), formNumber: undefined },
      { isDesktop: false },
    );
    expect((document.getElementById('companyCounty') as HTMLInputElement).value).toBe('X');
    expect((document.getElementById('companyCity') as HTMLInputElement).value).toBe('Y');
    expect(document.getElementById('driverFirstName_1')).toBeTruthy();
  });

  it('tühi vorm: trailers/drivers puuduvad; TRAM kaardil pole versioone ega printi', () => {
    view({ ...base, id: undefined, trailers: undefined, drivers: undefined, county: '', companyCounty: '', controlDate: '', controlTime: undefined, vehicleFirstRegistration: '' }, { formType: 'tram-card' });
    expect(screen.queryByTestId('versions')).toBeNull();
    expect(screen.queryByTestId('print')).toBeNull();
    expect(screen.queryByText('forms.compound.trailer')).toBeNull();
  });

  it('id olemas, aga TRAM: versioonitabelit pole', () => {
    view(base, { formType: 'tram-card' });
    expect(screen.queryByTestId('versions')).toBeNull();
  });
});
