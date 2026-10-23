// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundFormEditCard } from './CompoundFormEditCard';
import { driveAll, flush } from '../../testSupport/driveForm';
import { emptyDriver, emptyTrailer } from '../../pages/compound-form/useCompoundForm';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../FormVersionsTable/FormVersionsTable', () => ({ FormVersionsTable: () => <div data-testid="versions" /> }));
vi.mock('../FormPrintButton/FormPrintButton', () => ({ FormPrintButton: () => <div data-testid="print" /> }));
vi.mock('./RoadOtherFields', () => ({
  RoadOtherFields: (p: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="road-other" value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));
vi.mock('../CompanyPickerModal', () => ({
  CompanyPickerModal: (p: { onSelect: (c: unknown) => void; onClose: () => void }) => (
    <div>
      <button onClick={() => p.onSelect({ companyName: 'X' })}>picker-select</button>
      <button onClick={p.onClose}>picker-close</button>
    </div>
  ),
}));
vi.mock('../shared/MaskedDateField', async () => ({ MaskedDateField: (await import('../../testSupport/tediMock')).tediMock.DateField }));
vi.mock('../shared/MaskedTimeField', async () => ({ MaskedTimeField: (await import('../../testSupport/tediMock')).tediMock.TimeField }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'EE', name: 'Eesti' },
      { code: 'FI', name: 'Soome' },
      { code: 'XX', name: 'Vana', isValid: false },
    ],
  }),
}));

const errAll = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, `err-${k}`]));
const touchAll = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true]));

const formKeys = [
  'address', 'road', 'kilometer', 'county', 'controlDate', 'controlTime', 'vehicleRegNr', 'vehicleCountryCode',
  'vehicleCategoryCode', 'vehicleCategoryOther', 'companyRegCode', 'companyName', 'companyCountryCode',
  'inspectorFirstName', 'inspectorLastName', 'inspectorOrganisationId', 'inspectorProfession',
];
const trailerKeys = ['regNr', 'countryCode', 'categoryCode', 'categoryOther'];
const driverKeys = ['firstName', 'lastName', 'personalCodeForeign', 'personalCodeEe', 'birthDate'];

const values = (over: Record<string, unknown> = {}) => ({
  id: '5',
  version: 1,
  formNumber: 'KV-1/2026',
  controlCountryCode: 'EE',
  address: 'Tänav',
  road: 'muu_tee',
  roadOther: 'x',
  kilometer: '12',
  county: '1',
  city: '10',
  controlDate: '2026-01-02',
  controlTime: '10:30:00',
  road_type: 'Riigimaantee',
  vehicleRegNr: '123ABC',
  vehicleMake: 'M',
  vehicleModel: 'M',
  vehicleCountryCode: 'EE',
  vehicleVin: 'V',
  vehicleFirstRegistration: '2020-01-01',
  vehicleBodyType: 'B',
  vehicleCategoryCode: 'OTHER_2012',
  vehicleCategoryOther: 'L1',
  vehicleMileage: '5',
  roadTaxStatus: 'Tasumata',
  roadTaxNotes: 'n',
  trailers: [
    { ...emptyTrailer(), regNr: 'T1', categoryCode: 'OTHER_2012', categoryOther: 'O1', firstRegistration: '2019-01-01' },
    { ...emptyTrailer(), regNr: '', categoryCode: 'C_2012' },
  ],
  companyRegCode: '123',
  companyName: 'Firma',
  companyCountryCode: 'FI',
  companyCounty: 'x',
  companyCity: 'y',
  companyAddressLine1: '',
  companyPostalCode: '',
  companyOwnerFirstName: '',
  companyOwnerLastName: '',
  companyActivityLicenceCopyNumber: '',
  drivers: [{ ...emptyDriver(), birthDate: '1990-01-01' }, { ...emptyDriver(), firstName: 'Mati' }],
  driverNotApplicable: false,
  inspectorFirstName: 'I',
  inspectorLastName: 'L',
  inspectorOrganisationId: 'PPA',
  inspectorUnit: 'U1',
  inspectorProfession: 'P',
  ...over,
});

const makeFormik = (v: Record<string, unknown>, withErrors = true) => ({
  values: v,
  touched: withErrors ? { ...touchAll(formKeys), trailers: [touchAll(trailerKeys), touchAll(trailerKeys)], drivers: [touchAll(driverKeys), touchAll(driverKeys)] } : {},
  errors: withErrors ? { ...errAll(formKeys), trailers: [errAll(trailerKeys), errAll(trailerKeys)], drivers: [errAll(driverKeys), errAll(driverKeys)] } : {},
  setFieldValue: vi.fn(),
  handleSubmit: vi.fn(),
});

const fns = () => ({
  setCompanySearchError: vi.fn(), setVehicleSearchError: vi.fn(), setTrailerSearchError: vi.fn(), setMtrSearchError: vi.fn(),
  setDriverSearchError: vi.fn(), setDriverSearchNotFound: vi.fn(), handleDriverPersonSearch: vi.fn(),
  handleOrgChange: vi.fn(), handleStructuralUnitChange: vi.fn(), handleCountyChange: vi.fn(), handleCompanyCountyChange: vi.fn(),
  handleCompanySearch: vi.fn(), handleCompanyNameSearch: vi.fn(), onCompanyPicked: vi.fn(), closeCompanyPicker: vi.fn(),
  handleVehicleSearch: vi.fn(), handleTrailerSearch: vi.fn(), handleMtrSearch: vi.fn(),
  onCancel: vi.fn(), onConfirm: vi.fn(), onDelete: vi.fn(),
  onAddTrailerControlForm: vi.fn(), onEditTrailerControlForm: vi.fn(), onRemoveTrailer: vi.fn(),
  onAddTeammateControlForm: vi.fn(), onEditTeammateControlForm: vi.fn(), onRemoveTeammate: vi.fn(),
});

const baseProps = () => ({
  isDesktop: true,
  containerWidth: 2000,
  orgOptions: [{ label: 'Politsei', value: 'PPA' }],
  structureUnits: [{ code: 'U1', name: 'Üksus' }],
  roads: [{ code: 'muu_tee', name: 'Muu' }, { code: 'R1', name: 'Tee' }],
  trailerCategories: [{ code: 'C_2012', name: 'O3' }, { code: 'OTHER_2012', name: 'Muu' }],
  vehicleCategories: [{ code: 'A_2012', name: 'N2' }, { code: 'OTHER_2012', name: 'Muu' }, { code: 'ZZ', name: 'Tundmatu' }],
  counties: [{ id: 1, name: 'Harju' }, { id: 2, name: 'Tartu' }],
  citiesParishes: [{ id: 10, name: 'Tallinn' }],
  companyCitiesParishes: [{ id: 10, name: 'Tallinn' }],
  canConfirm: true,
  canDelete: true,
  companySearchError: false,
  vehicleSearchError: false,
  trailerSearchError: null,
  mtrSearchError: null,
  formType: 'compound-form',
});

const EditCard = CompoundFormEditCard as unknown as React.ComponentType<Record<string, unknown>>;

describe('CompoundFormEditCard', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as never;
  });
  afterEach(cleanup);

  it('täielik vorm koos vigadega: kõik käsitlejad kutsuvad formik/callback-e', async () => {
    const f = fns();
    const formik = makeFormik(values());
    render(
      <EditCard
        {...baseProps()}
        {...f}
        formik={formik as never}
        companySearchError
        vehicleSearchError
        trailerSearchError={0}
        mtrSearchError="forms.compound.mtrError.requestFailed"
        driverSearchError={0}
        driverSearchNotFound={1}
        driverSearchLoading={0}
        companyPickerResults={[{ companyName: 'A' } as never]}
        trailerFormRegNrs={['T1']}
        teammateFormExists
        versionsRefreshKey={2}
      />,
    );
    await flush();
    expect(screen.getAllByTestId('helper').length).toBeGreaterThan(20);
    expect(screen.getByTestId('versions')).toBeTruthy();
    driveAll();
    await flush();
    expect(formik.setFieldValue).toHaveBeenCalled();
    for (const fn of [
      f.setCompanySearchError, f.setVehicleSearchError, f.setTrailerSearchError, f.setMtrSearchError,
      f.setDriverSearchError, f.setDriverSearchNotFound, f.handleDriverPersonSearch, f.handleOrgChange,
      f.handleStructuralUnitChange, f.handleCountyChange, f.handleCompanyCountyChange, f.handleCompanySearch,
      f.handleCompanyNameSearch, f.onCompanyPicked, f.closeCompanyPicker, f.handleVehicleSearch,
      f.handleTrailerSearch, f.handleMtrSearch, f.onEditTrailerControlForm, f.onRemoveTrailer,
      f.onEditTeammateControlForm, f.onRemoveTeammate,
    ]) {
      expect(fn).toHaveBeenCalled();
    }
  });

  it('minimaalne vorm: aadressi/tee puudumise hoiatus, TRAM kast, ilma callback-ideta', async () => {
    const formik = makeFormik(
      values({
        id: '', road: '', address: '', trailers: [], drivers: [emptyDriver()], companyCountryCode: 'EE', companyName: '',
        companyCounty: '1', companyCity: '10', controlCountryCode: 'FI', county: '', vehicleCategoryCode: 'A_2012', roadTaxStatus: '',
        controlTime: undefined, vehicleFirstRegistration: '', controlDate: '',
      }),
    );
    const props = { ...baseProps(), isDesktop: false, containerWidth: 300 };
    render(
      <EditCard
        {...props}
        {...fns()}
        formik={formik as never}
        formType="tram-card"
        authority="TRAM"
        handleCompanyNameSearch={undefined}
        onAddTrailerControlForm={undefined}
        onEditTrailerControlForm={undefined}
        onRemoveTrailer={undefined}
        onRemoveTeammate={undefined}
      />,
    );
    expect(screen.getByText('forms.compound.addressOrRoadRequired')).toBeTruthy();
    expect(screen.getByText('forms.tram_driver_form')).toBeTruthy();
    expect(screen.queryByTestId('versions')).toBeNull();
    expect(screen.queryByTestId('print')).toBeNull();
    driveAll();
    await flush();
    fireEvent.click(screen.getByText('forms.compound.addTrailer'));
    expect(formik.setFieldValue).toHaveBeenCalledWith('trailers', [emptyTrailer()]);
    fireEvent.click(screen.getByText('forms.compound.addTeammate'));
  });

  it('kolm haagist, haagise kustutus ilma onRemoveTrailer-ita, meeskonnaliikme eemaldus ilma vormita', async () => {
    const three = [emptyTrailer(), emptyTrailer(), emptyTrailer()].map((t, i) => ({ ...t, regNr: i ? `T${i}` : '' }));
    const formik = makeFormik(values({ road: 'R1', trailers: three, drivers: [emptyDriver(), emptyDriver()] }), false);
    render(
      <EditCard
        {...baseProps()}
        {...fns()}
        formik={formik as never}
        onRemoveTrailer={undefined}
        onAddTrailerControlForm={vi.fn()}
        onEditTrailerControlForm={undefined}
        trailerFormRegNrs={[null, 'T1']}
        teammateFormExists={false}
        onRemoveTeammate={undefined}
        onAddTeammateControlForm={undefined}
        onEditTeammateControlForm={undefined}
      />,
    );
    expect((screen.getByText('forms.compound.addTrailer') as HTMLButtonElement).disabled).toBe(true);
    driveAll();
    await flush();
    expect(formik.setFieldValue).toHaveBeenCalledWith('drivers', expect.any(Array));
    expect(formik.setFieldValue).toHaveBeenCalledWith('trailers', expect.any(Array));
  });
});
