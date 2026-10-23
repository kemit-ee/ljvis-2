// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundFormCreatePage } from './CompoundFormCreatePage';
import * as api from '../../api';
import { driveAll } from '../../testSupport/driveForm';
import { subState, subRefs } from '../../testSupport/subFormPageStub';
import { emptyDriver, emptyTrailer } from './useCompoundForm';

const auth = { perms: new Set<string>(['compound_form.write']) };
const nav = vi.fn();
const search = { value: '' };
const view = { desktop: true };
const schemaState = { techValid: true };
let compound: Record<string, any>;
let onSavedProp: (id?: string) => void = () => {};

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: { number?: number }) => (o?.number ? `${k}#${o.number}` : k) }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => nav,
  useSearchParams: () => [new URLSearchParams(search.value)],
}));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => auth.perms.has(p) }) }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => view.desktop }));
vi.mock('../../../../hooks/useContainerWidth', () => ({ useContainerWidth: () => 1000 }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifierScopeActive: vi.fn(),
  useClassifiers: () => ({ getByCode: () => [{ code: 'EE', name: 'Eesti' }, { code: 'FI', name: 'Soome' }, { code: 'XX', name: 'Vana', isValid: false }] }),
}));
vi.mock('./useCompoundForm', async (orig) => ({
  ...(await orig<typeof import('./useCompoundForm')>()),
  useCompoundForm: (_form: unknown, onSaved: (id?: string) => void) => {
    onSavedProp = onSaved;
    return compound;
  },
}));
vi.mock('../../api', () => ({ saveDriveRestForm: vi.fn(), saveTechnicalCheckForm: vi.fn(), saveAdrForm: vi.fn(), saveTransportInterruptionForm: vi.fn() }));
vi.mock('../drive-rest-form/useDriveRestForm', () => ({
  createDriveRestValidationSchema: () => ({ isValid: async () => true }),
  serializeDriveRestFormValues: (d: unknown) => d,
}));
vi.mock('../technical-check-form/useTechnicalCheckForm', () => ({ createTechnicalCheckValidationSchema: () => ({ isValid: async () => schemaState.techValid }) }));
vi.mock('../adr-form/useAdrForm', () => ({ createAdrValidationSchema: () => ({ isValid: async () => true }) }));
vi.mock('../drive-rest-form/DriveRestFormCreatePage', async () => ({ DriveRestFormCreatePage: (await import('../../testSupport/subFormPageStub')).makeSubPageStub('drive') }));
vi.mock('../technical-check-form/TechnicalCheckFormCreatePage', async () => ({ TechnicalCheckFormCreatePage: (await import('../../testSupport/subFormPageStub')).makeSubPageStub('tech') }));
vi.mock('../adr-form/AdrFormCreatePage', async () => ({ AdrFormCreatePage: (await import('../../testSupport/subFormPageStub')).makeSubPageStub('adr') }));
vi.mock('../transport-interruption-form/TransportInterruptionFormCreatePage', async () => ({
  TransportInterruptionFormCreatePage: (await import('../../testSupport/subFormPageStub')).makeSubPageStub('ti'),
}));
vi.mock('../../components/CompoundForm/RoadOtherFields', () => ({
  RoadOtherFields: (p: { value: string; onChange: (v: string) => void }) => <input data-testid="road-other" value={p.value} onChange={(e) => p.onChange(e.target.value)} />,
}));
vi.mock('../../components/CompanyPickerModal', () => ({
  CompanyPickerModal: (p: { onSelect: (c: unknown) => void; onClose: () => void }) => (
    <div>
      <button onClick={() => p.onSelect({})}>picker-select</button>
      <button onClick={p.onClose}>picker-close</button>
    </div>
  ),
}));
vi.mock('../../components/shared/FileUploadBlock', () => ({ FileUploadBlock: () => <div data-testid="files" /> }));
vi.mock('../../components/shared/MaskedDateField', async () => ({ MaskedDateField: (await import('../../testSupport/tediMock')).tediMock.DateField }));
vi.mock('../../components/shared/MaskedTimeField', async () => ({ MaskedTimeField: (await import('../../testSupport/tediMock')).tediMock.TimeField }));

const errAll = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, `err-${k}`]));
const touchAll = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true]));
const formKeys = [
  'address', 'road', 'kilometer', 'county', 'controlDate', 'controlTime', 'vehicleRegNr', 'vehicleCountryCode',
  'vehicleCategoryCode', 'vehicleCategoryOther', 'companyRegCode', 'companyName', 'companyCountryCode',
  'inspectorFirstName', 'inspectorLastName', 'inspectorOrganisationId', 'inspectorProfession',
];
const trailerKeys = ['regNr', 'countryCode', 'categoryCode', 'categoryOther'];
const driverKeys = ['firstName', 'lastName', 'personalCodeForeign', 'personalCodeEe', 'birthDate'];

const baseValues = (over: Record<string, unknown> = {}) => ({
  controlCountryCode: 'EE', address: '', road: 'muu_tee', roadOther: 'x', kilometer: '12', county: '1', city: '10',
  controlDate: '2026-01-02', controlTime: '10:30:00', road_type: 'Riigimaantee', vehicleRegNr: '123ABC', vehicleMake: '', vehicleModel: '',
  vehicleCountryCode: 'EE', vehicleVin: '', vehicleFirstRegistration: '2020-01-01', vehicleBodyType: '', vehicleCategoryCode: 'OTHER_2012',
  vehicleCategoryOther: 'L1', vehicleMileage: '', roadTaxStatus: 'Tasumata', roadTaxNotes: '',
  trailers: [
    { ...emptyTrailer(), regNr: 'T1', categoryCode: 'OTHER_2012', categoryOther: 'O1', firstRegistration: '2019-01-01' },
    { ...emptyTrailer(), regNr: '', categoryCode: 'C_2012' },
  ],
  companyRegCode: '1', companyName: 'F', companyCountryCode: 'FI', companyCounty: 'a', companyCity: 'b', companyAddressLine1: '', companyPostalCode: '',
  companyOwnerFirstName: '', companyOwnerLastName: '', companyActivityLicenceCopyNumber: '',
  drivers: [{ ...emptyDriver(), birthDate: '1990-01-01' }, { ...emptyDriver(), firstName: 'Mati', personalCodeEe: '1', citizenshipCode: 'EE', birthDate: '1991-01-01' }],
  driverNotApplicable: false, inspectorFirstName: 'I', inspectorLastName: 'L', inspectorOrganisationId: 'PPA', inspectorUnit: 'U', inspectorProfession: 'P',
  ...over,
});

const makeCompound = (values: Record<string, unknown>, withErrors: boolean) => ({
  formik: {
    values,
    touched: withErrors ? { ...touchAll(formKeys), trailers: [touchAll(trailerKeys), touchAll(trailerKeys)], drivers: [touchAll(driverKeys), touchAll(driverKeys)] } : {},
    errors: withErrors ? { ...errAll(formKeys), trailers: [errAll(trailerKeys), errAll(trailerKeys)], drivers: [errAll(driverKeys), errAll(driverKeys)] } : {},
    setFieldValue: vi.fn(),
    setTouched: vi.fn(),
    validateForm: vi.fn(async () => ({}) as Record<string, string>),
    handleSubmit: vi.fn(() => onSavedProp('42')),
  },
  structureUnits: [{ code: 'U', name: 'Üksus' }], orgOptions: [{ label: 'P', value: 'PPA' }], roads: [{ code: 'muu_tee', name: 'Muu' }, { code: 'R1', name: 'Tee' }],
  trailerCategories: [{ code: 'C_2012', name: 'O3' }, { code: 'OTHER_2012', name: 'Muu' }],
  vehicleCategories: [{ code: 'A_2012', name: 'N2' }, { code: 'OTHER_2012', name: 'Muu' }, { code: 'ZZ', name: 'Z' }],
  counties: [{ id: 1, name: 'Harju' }], citiesParishes: [{ id: 10, name: 'Tallinn' }], companyCitiesParishes: [{ id: 10, name: 'Tallinn' }],
  handleCountyChange: vi.fn(), handleCompanyCountyChange: vi.fn(), handleOrgChange: vi.fn(), handleStructuralUnitChange: vi.fn(),
  companySearchError: withErrors, setCompanySearchError: vi.fn(), vehicleSearchError: withErrors, setVehicleSearchError: vi.fn(),
  handleCompanySearch: vi.fn(), handleCompanyNameSearch: vi.fn(), companyPickerResults: withErrors ? [{ companyName: 'A' }] : [],
  onCompanyPicked: vi.fn(), closeCompanyPicker: vi.fn(), handleVehicleSearch: vi.fn(),
  trailerSearchError: withErrors ? 0 : null, setTrailerSearchError: vi.fn(), handleTrailerSearch: vi.fn(),
  mtrSearchError: withErrors ? 'forms.compound.mtrError.requestFailed' : null, setMtrSearchError: vi.fn(), handleMtrSearch: vi.fn(),
  driverSearchError: withErrors ? 0 : null, setDriverSearchError: vi.fn(), driverSearchNotFound: withErrors ? 1 : null, setDriverSearchNotFound: vi.fn(),
  driverSearchLoading: withErrors ? 0 : null, handleDriverPersonSearch: vi.fn(),
  availableForms: [
    { labelKey: 'l.driver', route: '/sp-driver', hasParent: true },
    { labelKey: 'l.vehicle', route: '/vehicle-technical', hasParent: true },
    { labelKey: 'l.adr', route: '/adr', hasParent: true },
    { labelKey: 'l.ti', route: '/transport-interruption', hasParent: true },
    { labelKey: 'l.unknown', route: '/something-else', hasParent: true },
  ],
});

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
};
const renderPage = async () => {
  render(<CompoundFormCreatePage />);
  await settle();
};
const pick = async (label: string) => {
  await act(async () => {
    fireEvent.click(screen.getByText(label));
  });
  await settle();
};
const saveBtn = () => screen.getAllByText('common.save').pop() as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  auth.perms = new Set(['compound_form.write']);
  search.value = '';
  view.desktop = true;
  schemaState.techValid = true;
  subState.refMode = 'full';
  subState.hasErrors = false;
  subState.submitSaves = true;
  subState.getFormDataUndefined = false;
  for (const k of Object.keys(subRefs)) delete subRefs[k];
  compound = makeCompound(baseValues(), false);
  window.scrollTo = vi.fn() as never;
  vi.mocked(api.saveDriveRestForm).mockResolvedValue([{ id: 'd1' }] as never);
  vi.mocked(api.saveTechnicalCheckForm).mockResolvedValue([{ id: 't1' }] as never);
  vi.mocked(api.saveAdrForm).mockResolvedValue([{ id: 'a1' }] as never);
  vi.mocked(api.saveTransportInterruptionForm).mockResolvedValue([{ id: 'ti1' }] as never);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CompoundFormCreatePage', () => {
  it('ilma kirjutusõiguseta on keelatud', async () => {
    auth.perms = new Set();
    await renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('üldosa väljad (vigadega, välisriigi ettevõte, meeskonnaliige)', async () => {
    compound = makeCompound(baseValues(), true);
    await renderPage();
    expect(screen.getAllByTestId('helper').length).toBeGreaterThan(15);
    driveAll(document, { skip: (el) => el.closest('[data-testid^="drive"], [data-testid^="tech"], [data-testid^="adr"], [data-testid^="ti"]') != null });
    await settle();
    expect(compound.formik.setFieldValue).toHaveBeenCalled();
    for (const fn of ['handleCompanySearch', 'handleCompanyNameSearch', 'handleVehicleSearch', 'handleTrailerSearch', 'handleMtrSearch', 'handleDriverPersonSearch', 'handleOrgChange', 'handleStructuralUnitChange', 'handleCountyChange', 'onCompanyPicked', 'closeCompanyPicker', 'setCompanySearchError', 'setVehicleSearchError', 'setTrailerSearchError', 'setMtrSearchError', 'setDriverSearchError', 'setDriverSearchNotFound']) {
      expect(compound[fn], fn).toHaveBeenCalled();
    }
  });

  it('minimaalne üldosa: eesti ettevõte, üks juht, mobiilivaade, haagisteta', async () => {
    view.desktop = false;
    compound = makeCompound(
      baseValues({ road: '', address: 'Tänav', trailers: [], drivers: [emptyDriver()], companyCountryCode: 'EE', companyName: '', vehicleCategoryCode: 'A_2012', controlCountryCode: 'FI', county: '', controlTime: undefined, controlDate: '' }),
      false,
    );
    await renderPage();
    driveAll(document, { skip: (el) => el.closest('[data-testid^="drive"], [data-testid^="tech"], [data-testid^="adr"], [data-testid^="ti"]') != null });
    await settle();
    expect(compound.formik.setFieldValue).toHaveBeenCalledWith('trailers', [emptyTrailer()]);
  });

  it('eelvalitud tüübid URL-ist avavad saki ja sulgemine/lisamine töötab', async () => {
    search.value = 'types=driver,adr,teammate,vehicle-technical,trailer-technical,transport-interruption,bogus,driver';
    await renderPage();
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(4);
    // vahekaardi vahetamine salvestab/taastab andmed
    for (const tab of screen.getAllByRole('tab')) {
      await act(async () => {
        fireEvent.click(tab);
      });
      await settle();
    }
    // sulgemisnupud
    while (screen.queryAllByLabelText('closing').length > 0) {
      await act(async () => {
        fireEvent.click(screen.getAllByLabelText('closing')[0]);
      });
      await settle();
    }
  });

  it('?type= parameeter ja tundmatu tüüp', async () => {
    search.value = 'type=adr';
    await renderPage();
    expect(screen.getByTestId('adr')).toBeTruthy();
    cleanup();
    search.value = 'type=teammate';
    await renderPage();
    expect(screen.queryByTestId('drive-teammate')).toBeNull();
  });

  it('vormide lisamine ripploendist ja alamlehtede tagasikutsed', async () => {
    await renderPage();
    for (const l of ['l.driver', 'l.vehicle', 'l.adr', 'l.ti', 'l.unknown']) await pick(l);
    expect(screen.getByTestId('drive-driver')).toBeTruthy();
    for (const e of Array.from(document.querySelectorAll('[data-cb]'))) {
      await act(async () => {
        fireEvent.click(e);
      });
    }
    await settle();
    // trailer- ja meeskonnaliikme juhtnupud
    for (const label of ['forms.compound.addTrailerControlForm', 'forms.compound.addTeammateControlForm']) {
      for (const b of screen.queryAllByText(label)) {
        await act(async () => {
          fireEvent.click(b);
        });
      }
    }
    await settle();
    for (const label of ['forms.compound.editTrailerControlForm', 'forms.compound.editTeammateControlForm']) {
      for (const b of screen.queryAllByText(label)) {
        await act(async () => {
          fireEvent.click(b);
        });
      }
    }
    await settle();
    for (const b of screen.queryAllByText('forms.compound.removeTrailer').concat(screen.queryAllByText('forms.compound.removeTeammate'))) {
      await act(async () => {
        fireEvent.click(b);
      });
    }
    await settle();
  });

  it('salvestus: kõik alamvormid ref.handleSubmit kaudu, siis navigeerimine', async () => {
    search.value = 'types=driver,adr,vehicle-technical,transport-interruption';
    await renderPage();
    await pick('l.driver').catch(() => undefined);
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(compound.formik.handleSubmit).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith('/control-forms/compound/42', { state: { justCreated: true } });
  });

  it('salvestus: ref puudub → alamvormid salvestatakse otse API kaudu', async () => {
    search.value = 'types=driver,adr,vehicle-technical,transport-interruption';
    subState.refMode = 'none';
    compound = makeCompound(baseValues({ trailers: [{ ...emptyTrailer(), regNr: 'T1' }] }), false);
    await renderPage();
    // lisa teammate ja haagise tehnovorm
    for (const label of ['forms.compound.addTeammateControlForm', 'forms.compound.addTrailerControlForm']) {
      for (const b of screen.queryAllByText(label)) {
        await act(async () => {
          fireEvent.click(b);
        });
      }
    }
    await settle();
    // täida salvestatud andmed
    for (const e of Array.from(document.querySelectorAll('[data-cb$=":onValuesChange:a"], [data-cb$=":onValuesChange:b"]'))) {
      await act(async () => {
        fireEvent.click(e);
      });
    }
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(api.saveDriveRestForm).toHaveBeenCalled();
    expect(api.saveAdrForm).toHaveBeenCalled();
    expect(api.saveTechnicalCheckForm).toHaveBeenCalled();
    expect(api.saveTransportInterruptionForm).toHaveBeenCalled();
    expect(nav).toHaveBeenCalled();
  });

  it('salvestus: tulemus ilma id-ta ei märgi salvestatuks; ADR täidetud väljadega', async () => {
    search.value = 'types=adr,transport-interruption,vehicle-technical,driver';
    subState.refMode = 'none';
    vi.mocked(api.saveAdrForm).mockResolvedValue([{}] as never);
    vi.mocked(api.saveTechnicalCheckForm).mockResolvedValue([{}] as never);
    vi.mocked(api.saveTransportInterruptionForm).mockResolvedValue([{}] as never);
    vi.mocked(api.saveDriveRestForm).mockResolvedValue([{}] as never);
    await renderPage();
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(nav).toHaveBeenCalled();
  });

  it('salvestus: refMode noSubmit (ref olemas, handleSubmit puudub)', async () => {
    search.value = 'types=driver,adr';
    subState.refMode = 'noSubmit';
    await renderPage();
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(api.saveDriveRestForm).toHaveBeenCalled();
  });

  it('salvestus: valideerimisviga (üldosa ja alamvormid) peatab ja lülitab üldosale', async () => {
    search.value = 'types=driver,adr';
    subState.hasErrors = true;
    compound.formik.validateForm.mockResolvedValue({ address: 'x' });
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getAllByRole('tab')[1]);
    });
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(screen.getByText('forms.validationErrorNote')).toBeTruthy();
    expect(nav).not.toHaveBeenCalled();
    expect(compound.formik.setTouched).toHaveBeenCalled();
  });

  it('salvestus: alamvormi vigade korral (ref puudub, skeem ebaõnnestub)', async () => {
    search.value = 'types=vehicle-technical';
    subState.refMode = 'none';
    schemaState.techValid = false;
    await renderPage();
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await settle();
    expect(screen.getByText('forms.validationErrorNote')).toBeTruthy();
  });

  it('salvestus: üldvormi id ei tule → 15 s ootamise järel viga', async () => {
    search.value = 'types=driver';
    compound.formik.handleSubmit.mockImplementation(() => {});
    await renderPage();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      fireEvent.click(saveBtn());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000);
    });
    expect(err).toHaveBeenCalled();
    expect(screen.getByText('forms.validationErrorNote')).toBeTruthy();
    err.mockRestore();
  });

  it('salvestus on keelatud ilma avatud vahekaartideta', async () => {
    await renderPage();
    expect(saveBtn().disabled).toBe(true);
  });

  it('getFormData tagastab undefined', async () => {
    search.value = 'types=driver,adr';
    subState.getFormDataUndefined = true;
    await renderPage();
    for (const tab of screen.getAllByRole('tab')) {
      await act(async () => {
        fireEvent.click(tab);
      });
    }
    await settle();
  });
});
