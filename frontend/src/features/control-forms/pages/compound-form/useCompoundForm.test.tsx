// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompoundForm, emptyDriver, emptyTrailer } from './useCompoundForm';
import * as api from '../../api';
import { ApiError } from '../../../../shared/api/client';
import { searchVehicleByRegNr, searchMtrSoidukikaart, searchPersonByCode } from '../../../xroad/api';
import { listOrganisations } from '../../../organisations/api';

const auth = {
  user: { firstname: 'Ines', lastname: 'Inspektor', organisationcode: 'PPA', structuralunit: 'U1', jobtitle: 'Ametnik', organisationid: 7 } as Record<string, unknown>,
  permissions: ['sp_driver_form.write'],
};
const classifiers: Record<string, unknown[]> = {};
let companyCb: (c: Record<string, string>) => void = () => {};
let vehicleCb: (v: Record<string, string>) => void = () => {};
const companyHook = {
  searchByRegCode: vi.fn(),
  searchByName: vi.fn(),
  error: false,
  setError: vi.fn(),
  pickerResults: [],
  handleCompanyPicked: vi.fn(),
  closePicker: vi.fn(),
};
const vehicleHook = { searchByRegNr: vi.fn(), error: false, setError: vi.fn() };

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../classifiers/ClassifierProvider.tsx', () => ({
  useClassifiers: () => ({
    getByCode: (code: string) => classifiers[code] ?? [],
    getChildren: (code: string, parent: number) =>
      (classifiers[code] ?? []).filter((e) => (e as { parentKey: number }).parentKey === parent),
  }),
}));
vi.mock('../../../organisations/api', () => ({ listOrganisations: vi.fn() }));
vi.mock('../../../xroad/api', () => ({
  searchVehicleByRegNr: vi.fn(),
  searchMtrSoidukikaart: vi.fn(),
  searchPersonByCode: vi.fn(),
}));
vi.mock('../../../xroad/hooks/useCompanySearch', () => ({
  useCompanySearch: (o: { onCompanyFound: typeof companyCb }) => {
    companyCb = o.onCompanyFound;
    return companyHook;
  },
}));
vi.mock('../../../xroad/hooks/useVehicleSearch', () => ({
  useVehicleSearch: (o: { onVehicleFound: typeof vehicleCb }) => {
    vehicleCb = o.onVehicleFound;
    return vehicleHook;
  },
}));
vi.mock('../../formRoutes.ts', () => ({
  FORM_CONFIG: {
    a: { labelKey: 'a', route: '/a', hasParent: true },
    b: { labelKey: 'b', route: '/trailer-technical', hasParent: true },
    c: { labelKey: 'c', route: '/sp-teammate', hasParent: true },
    d: { labelKey: 'd', route: '/d', hasParent: false },
  },
  getAvailableFormKeys: () => ['a', 'b', 'c', 'd'],
}));
vi.mock('../../api', () => ({
  saveCompoundForm: vi.fn(),
  confirmCompoundForm: vi.fn(),
  publishCompoundForm: vi.fn(),
  saveTramForm: vi.fn(),
  confirmTramForm: vi.fn(),
  publishTramForm: vi.fn(),
}));

const validForm = (over: Record<string, unknown> = {}) =>
  ({
    id: '5',
    version: 2,
    formNumber: 'K-1',
    controlCountryCode: 'EE',
    address: 'Tänav 1',
    county: '1',
    controlDate: '2026-01-02',
    controlTime: '10:00',
    vehicleRegNr: ' 123ABC ',
    vehicleCountryCode: 'EE',
    vehicleCategoryCode: 'A_2012',
    status: 'saved',
    trailers: [],
    drivers: [{ ...emptyDriver(), firstName: ' Mari ', lastName: 'M', birthDate: '1990-01-01', personalCodeEe: '49001010000' }],
    inspectorFirstName: 'I',
    inspectorLastName: 'L',
    inspectorOrganisationId: 'PPA',
    inspectorProfession: 'P',
    roadTaxStatus: 'Ei kohaldu',
    ...over,
  }) as never;

const setup = (form: unknown, extra: Partial<Parameters<typeof useCompoundForm>> = [] as never, authority: 'PPA' | 'TRAM' = 'PPA') => {
  const onSaved = vi.fn();
  const onConfirmed = vi.fn();
  const onPublished = vi.fn();
  const onResetToSaved = vi.fn();
  const e = extra as unknown as unknown[];
  const hook = renderHook(() =>
    useCompoundForm(
      form as never,
      onSaved,
      onConfirmed,
      e[0] as boolean | undefined,
      onResetToSaved,
      onPublished,
      authority,
      e[1] as never,
    ),
  );
  return { hook, onSaved, onConfirmed, onPublished, onResetToSaved };
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(classifiers)) delete classifiers[k];
  vi.mocked(listOrganisations).mockResolvedValue([{ id: 7, code: 'PPA', name: 'Politsei' }] as never);
  vi.mocked(api.saveCompoundForm).mockResolvedValue([{ id: 'new1' }] as never);
  vi.mocked(api.saveTramForm).mockResolvedValue([{ id: 'new2' }] as never);
  auth.user.organisationcode = 'PPA';
});

describe('algväärtused ja klassifikaatorid', () => {
  it('annab tühjad abifunktsioonid ja vaikeväärtused', () => {
    expect(emptyTrailer().regNr).toBe('');
    const { hook } = setup(undefined);
    expect(hook.result.current.formik.values.controlCountryCode).toBe('EE');
    expect(hook.result.current.formik.values.inspectorFirstName).toBe('Ines');
    expect(hook.result.current.formik.values.drivers).toHaveLength(1);
  });

  it('TRAM vaikimisi asutus, parsib JSON-stringid, puhastab vana „Ei kohaldu"', () => {
    auth.user.organisationcode = null;
    const { hook } = setup(
      validForm({ inspectorOrganisationId: undefined, trailers: JSON.stringify([emptyTrailer()]), drivers: JSON.stringify([emptyDriver()]) }),
      [] as never,
      'TRAM',
    );
    const v = hook.result.current.formik.values;
    expect(v.inspectorOrganisationId).toBe('TRAM');
    expect(v.trailers).toHaveLength(1);
    expect(v.roadTaxStatus).toBe('');
  });

  it('koostab valikud klassifikaatoritest ja arvestab organisatsiooni', async () => {
    classifiers.EHAK = [
      { classifierValueKey: 1, name: 'Harju', parentKey: null, isValid: true },
      { classifierValueKey: 2, name: 'Vana', parentKey: null, isValid: false },
      { classifierValueKey: 10, name: 'Tallinn', parentKey: 1 },
    ];
    classifiers.ROAD_NAME = [{ code: 'R1', name: 'Tee', isValid: true }];
    classifiers.TRAILER_CATEGORY = [{ code: 'C', name: 'C' }];
    classifiers.VEHICLE_CATEGORY = [{ code: 'V', name: 'V' }];
    classifiers.STRUCTURE_UNIT = [
      { code: 'U1', name: 'Üksus', description: 'PPA' },
      { code: 'U2', name: 'Muu', description: 'TA' },
    ];
    const { hook } = setup(validForm({ county: '1', companyCounty: '1' }));
    await waitFor(() => expect(hook.result.current.orgOptions).toHaveLength(1));
    const r = hook.result.current;
    expect(r.counties).toEqual([{ id: 1, name: 'Harju' }]);
    expect(r.roads).toEqual([{ code: 'R1', name: 'Tee' }]);
    expect(r.trailerCategories).toHaveLength(1);
    expect(r.vehicleCategories).toHaveLength(1);
    expect(r.citiesParishes).toEqual([{ id: 10, name: 'Tallinn' }]);
    expect(r.companyCitiesParishes).toEqual([{ id: 10, name: 'Tallinn' }]);
    expect(r.structureUnits).toEqual([{ code: 'U1', name: 'Üksus' }]);
    act(() => r.handleOrgChange({ value: 'TA', label: 'TA' }));
    expect(hook.result.current.formik.values.inspectorOrganisationId).toBe('TA');
    act(() => hook.result.current.handleOrgChange(null));
    act(() => hook.result.current.handleStructuralUnitChange({ value: 'U1', label: 'x' }));
    expect(hook.result.current.formik.values.inspectorUnit).toBe('U1');
    act(() => hook.result.current.handleStructuralUnitChange(null));
    expect(hook.result.current.formik.values.inspectorUnit).toBe('');
    act(() => hook.result.current.handleCountyChange());
    act(() => hook.result.current.handleCompanyCountyChange());
  });

  it('täidab asutuse koodi organisationid järgi, kui profiilis puudub', async () => {
    auth.user.organisationcode = '';
    const { hook } = setup(validForm({ inspectorOrganisationId: undefined }));
    await waitFor(() => expect(hook.result.current.formik.values.inspectorOrganisationId).toBe('PPA'));
  });

  it('organisatsioonide laadimise viga logitakse; vormid filtreeritakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listOrganisations).mockRejectedValue(new Error('x'));
    const { hook } = setup(validForm());
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(hook.result.current.availableForms).toEqual([{ labelKey: 'a', route: '/a', hasParent: true }]);
    err.mockRestore();
  });
});

describe('salvestamine', () => {
  it('uus vorm salvestatakse ja onSaved saab uue id', async () => {
    const { hook, onSaved } = setup(validForm({ id: undefined, trailers: [emptyTrailer()] }));
    await act(async () => {
      await hook.result.current.formik.setFieldValue('trailers', []);
    });
    await act(() => hook.result.current.formik.submitForm());
    expect(api.saveCompoundForm).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith('new1');
    const payload = vi.mocked(api.saveCompoundForm).mock.calls[0][0] as unknown as Record<string, string>;
    expect(payload.vehicleRegNr).toBe('123ABC');
    expect(payload.driver1PersonalCodeEe).toBe('49001010000');
    expect(JSON.parse(payload.drivers)[0].firstName).toBe('Mari');
  });

  it('TRAM kasutab oma API-t', async () => {
    const { hook, onSaved } = setup(validForm({ id: undefined }), [] as never, 'TRAM');
    await act(() => hook.result.current.formik.submitForm());
    expect(api.saveTramForm).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith('new2');
  });

  it('olemasolev salvestatud vorm: onSaved; forceSaved → onResetToSaved', async () => {
    const { hook, onSaved, onResetToSaved } = setup(validForm());
    await act(() => hook.result.current.formik.submitForm());
    expect(onSaved).toHaveBeenCalledWith('5');
    await act(async () => {
      hook.result.current.triggerSaveAsSaved();
    });
    await waitFor(() => expect(onResetToSaved).toHaveBeenCalled());
  });

  it('triggerConfirm kinnitab', async () => {
    const { hook, onConfirmed } = setup(validForm());
    vi.mocked(api.confirmCompoundForm).mockResolvedValue(undefined as never);
    await act(async () => {
      hook.result.current.triggerConfirm();
    });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
  });

  it('triggerPublish avalikustab', async () => {
    const { hook, onPublished } = setup(validForm({ status: 'confirmed' }));
    vi.mocked(api.publishCompoundForm).mockResolvedValue(undefined as never);
    await act(async () => {
      hook.result.current.triggerPublish();
    });
    await waitFor(() => expect(api.publishCompoundForm).toHaveBeenCalledWith('5'));
    expect(onPublished).toHaveBeenCalled();
  });

  it('saved + kõik alamvormid kinnitatud → kinnitatud staatus', async () => {
    const { hook, onConfirmed } = setup(validForm(), [true] as never);
    vi.mocked(api.confirmCompoundForm).mockResolvedValue(undefined as never);
    await act(() => hook.result.current.formik.submitForm());
    expect(api.confirmCompoundForm).toHaveBeenCalled();
    expect(onConfirmed).toHaveBeenCalled();
  });

  it('saved + kõik avaldatud → salvestab avaldatuna ja kutsub onPublished', async () => {
    const getStatus = vi.fn(() => ({ allConfirmedOrPublished: true, allPublished: true }));
    const { hook, onPublished } = setup(validForm(), [true, getStatus] as never);
    await act(() => hook.result.current.formik.submitForm());
    expect(api.saveCompoundForm).toHaveBeenCalled();
    expect(onPublished).toHaveBeenCalled();
  });

  it('confirmed vorm jääb kinnitatuks, avaldatud avaldatuks', async () => {
    const getStatus = vi.fn(() => ({ allConfirmedOrPublished: true, allPublished: false }));
    const a = setup(validForm({ status: 'confirmed' }), [true, getStatus] as never);
    vi.mocked(api.confirmCompoundForm).mockResolvedValue(undefined as never);
    await act(() => a.hook.result.current.formik.submitForm());
    expect(api.confirmCompoundForm).toHaveBeenCalledTimes(1);

    const b = setup(validForm({ status: 'published' }), [true, getStatus] as never);
    await act(() => b.hook.result.current.formik.submitForm());
    expect(b.onPublished).toHaveBeenCalled();
  });

  it('triggerSaveAfterSubFormDelete ja triggerSaveWithCurrentStatus', async () => {
    const a = setup(validForm({ status: 'published' }));
    await act(async () => {
      a.hook.result.current.triggerSaveAfterSubFormDelete(true);
    });
    await waitFor(() => expect(a.onPublished).toHaveBeenCalled());

    const b = setup(validForm({ status: 'saved' }));
    await act(async () => {
      b.hook.result.current.triggerSaveAfterSubFormDelete(false);
    });
    await waitFor(() => expect(b.onResetToSaved).toHaveBeenCalled());

    const c = setup(validForm({ status: 'confirmed' }), [false] as never);
    vi.mocked(api.confirmCompoundForm).mockResolvedValue(undefined as never);
    await act(async () => {
      c.hook.result.current.triggerSaveWithCurrentStatus();
    });
    await waitFor(() => expect(c.onConfirmed).toHaveBeenCalled());
  });

  it('valideerimisvead blokeerivad salvestuse', async () => {
    const { hook } = setup(
      validForm({
        id: undefined,
        address: '',
        road: 'muu_tee',
        roadOther: '',
        county: '',
        companyName: 'Firma',
        companyCountryCode: '',
        vehicleCategoryCode: 'OTHER_2012',
        trailers: [{ ...emptyTrailer(), categoryCode: 'OTHER_2012' }],
        drivers: [{ ...emptyDriver() }, { ...emptyDriver() }],
      }),
    );
    await act(() => hook.result.current.formik.submitForm());
    const errs = hook.result.current.formik.errors as Record<string, unknown>;
    expect(errs.roadOther).toBe('forms.foreign_violation.validation.required');
    expect(errs.kilometer).toBeTruthy();
    expect(errs.vehicleCategoryOther).toBeTruthy();
    expect(errs.companyCountryCode).toBeTruthy();
    expect(errs.drivers).toBeTruthy();
    expect(api.saveCompoundForm).not.toHaveBeenCalled();
  });

  it('address-or-road reegel; driverNotApplicable vabastab nime nõudest', async () => {
    const a = setup(validForm({ address: '', road: '' }));
    await act(() => a.hook.result.current.formik.submitForm());
    expect((a.hook.result.current.formik.errors as Record<string, string>).address).toBeTruthy();

    const b = setup(validForm({ driverNotApplicable: true, drivers: [{ ...emptyDriver(), birthDate: '1990-01-01' }] }));
    await act(() => b.hook.result.current.formik.submitForm());
    expect(api.saveCompoundForm).toHaveBeenCalled();
  });

  it('tundmatu viga logitakse; 422 valideerimisviga seatakse väljale', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.saveCompoundForm).mockRejectedValueOnce(new Error('boom'));
    const a = setup(validForm());
    await act(() => a.hook.result.current.formik.submitForm());
    expect(err).toHaveBeenCalledWith('Save failed', expect.any(Error));

    const body = JSON.stringify({ type: 'VALIDATION_ERROR', field: 'vehicleRegNr', code: 'dup' });
    vi.mocked(api.saveCompoundForm).mockRejectedValueOnce(new ApiError('x', 422, body));
    const b = setup(validForm());
    await act(() => b.hook.result.current.formik.submitForm());
    expect((b.hook.result.current.formik.errors as Record<string, string>).vehicleRegNr).toBe(
      'forms.foreign_violation.validation.api.dup',
    );
    err.mockRestore();
  });
});

describe('otsingud', () => {
  it('ettevõtte otsing: regKood eelistatud; callback täidab ja lahendab EHAK', async () => {
    classifiers.EHAK = [
      { classifierValueKey: 1, name: 'Harju maakond', parentKey: null },
      { classifierValueKey: 10, name: 'Tallinn', parentKey: 1 },
    ];
    const { hook } = setup(validForm({ companyRegCode: '123', companyName: 'F' }));
    act(() => hook.result.current.handleCompanySearch());
    expect(companyHook.searchByRegCode).toHaveBeenCalledWith('123');
    await act(async () => {
      await hook.result.current.formik.setFieldValue('companyRegCode', ' ');
    });
    act(() => hook.result.current.handleCompanySearch());
    expect(companyHook.searchByName).toHaveBeenCalledWith('F');
    act(() => hook.result.current.handleCompanyNameSearch());
    await act(async () => {
      companyCb({ companyName: 'Uus', street: 'S', city: 'Kesklinn, Tallinn, Harju maakond', postalCode: '1', registryCode: 'RC' });
    });
    await waitFor(() => expect(hook.result.current.formik.values.companyCounty).toBe('1'));
    expect(hook.result.current.formik.values.companyCity).toBe('10');
    expect(hook.result.current.formik.values.companyRegCode).toBe('RC');
    await act(async () => {
      companyCb({ companyName: 'U2', street: 'S', city: 'Ainult', postalCode: '1', registryCode: '' });
      companyCb({ companyName: 'U3', street: 'S', city: 'X, Tundmatu maakond', postalCode: '1', registryCode: '' });
      companyCb({ companyName: 'U4', street: 'S', city: 'Tundmatu, Harju maakond', postalCode: '1', registryCode: '' });
    });
  });

  it('sõiduki otsing täidab väljad ja kategooria kaardistuse', async () => {
    const { hook } = setup(validForm());
    act(() => hook.result.current.handleVehicleSearch());
    expect(vehicleHook.searchByRegNr).toHaveBeenCalled();
    for (const [code, expected] of [['N2', 'A_2012'], ['Z9', 'OTHER_2012'], [undefined, '']] as const) {
      act(() => vehicleCb({ make: 'M', model: 'X', vin: 'V', bodyType: 'B', categoryCode: code as string, firstRegistrationDate: '2020-01-01' }));
      await waitFor(() => expect(hook.result.current.formik.values.vehicleCategoryCode).toBe(expected));
    }
    act(() => vehicleCb({}));
  });

  it('haagise otsing: tühi regNr, ei leitud, leitud, viga', async () => {
    const { hook } = setup(validForm({ trailers: [{ ...emptyTrailer(), regNr: '' }, { ...emptyTrailer(), regNr: 'TR1' }] }));
    await act(() => hook.result.current.handleTrailerSearch(0));
    expect(hook.result.current.trailerSearchError).toBe(0);
    vi.mocked(searchVehicleByRegNr).mockResolvedValueOnce([]);
    await act(() => hook.result.current.handleTrailerSearch(1));
    expect(hook.result.current.trailerSearchError).toBe(1);
    vi.mocked(searchVehicleByRegNr).mockResolvedValueOnce([{ make: 'T', categoryCode: 'O3' }] as never);
    await act(() => hook.result.current.handleTrailerSearch(1));
    expect(hook.result.current.trailerSearchError).toBeNull();
    expect(hook.result.current.formik.values.trailers[1].categoryCode).toBe('C_2012');
    vi.mocked(searchVehicleByRegNr).mockResolvedValueOnce([{ categoryCode: 'O1' }] as never);
    await act(() => hook.result.current.handleTrailerSearch(1));
    expect(hook.result.current.formik.values.trailers[1].categoryOther).toBe('O1');
    vi.mocked(searchVehicleByRegNr).mockResolvedValueOnce([{}] as never);
    await act(() => hook.result.current.handleTrailerSearch(1));
    vi.mocked(searchVehicleByRegNr).mockRejectedValueOnce(new Error('x'));
    await act(() => hook.result.current.handleTrailerSearch(1));
    expect(hook.result.current.trailerSearchError).toBe(1);
  });

  it('juhi isikuotsing', async () => {
    const { hook } = setup(validForm({ drivers: [{ ...emptyDriver(), personalCodeEe: 'vigane' }, { ...emptyDriver(), personalCodeEe: '39001010000', firstName: 'Vana' }] }));
    await act(() => hook.result.current.handleDriverPersonSearch(0));
    expect(hook.result.current.driverSearchError).toBe(0);
    vi.mocked(searchPersonByCode).mockResolvedValueOnce(null as never);
    await act(() => hook.result.current.handleDriverPersonSearch(1));
    expect(hook.result.current.driverSearchNotFound).toBe(1);
    expect(hook.result.current.driverSearchLoading).toBeNull();
    vi.mocked(searchPersonByCode).mockResolvedValueOnce({ firstName: 'Uus', lastName: 'L', citizenshipCode: 'EST', dateOfBirth: '1980-01-01' } as never);
    await act(() => hook.result.current.handleDriverPersonSearch(1));
    expect(hook.result.current.formik.values.drivers[1].firstName).toBe('Uus');
    vi.mocked(searchPersonByCode).mockResolvedValueOnce({} as never);
    await act(() => hook.result.current.handleDriverPersonSearch(1));
    expect(hook.result.current.formik.values.drivers[1].firstName).toBe('Uus');
    vi.mocked(searchPersonByCode).mockRejectedValueOnce(new Error('x'));
    await act(() => hook.result.current.handleDriverPersonSearch(1));
    expect(hook.result.current.driverSearchError).toBe(1);
  });

  it('MTR otsing: kõik harud', async () => {
    const { hook } = setup(validForm({ companyCountryCode: 'FI', companyRegCode: '', vehicleRegNr: '123abc' }));
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBe('forms.compound.mtrError.notEstonianCompany');
    await act(async () => {
      await hook.result.current.formik.setFieldValue('companyCountryCode', 'EE');
    });
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBe('forms.compound.mtrError.missingFields');
    await act(async () => {
      await hook.result.current.formik.setFieldValue('companyRegCode', '999');
    });
    vi.mocked(searchMtrSoidukikaart).mockResolvedValueOnce(null as never);
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBe('forms.compound.mtrError.companyNotFound');
    vi.mocked(searchMtrSoidukikaart).mockResolvedValueOnce({ vehicleCards: [{ registrationNumber: 'X', vehicles: [{ registrationNumber: 'OTHER' }] }] } as never);
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBe('forms.compound.mtrError.licenceNotFound');
    vi.mocked(searchMtrSoidukikaart).mockResolvedValueOnce({ vehicleCards: [{ registrationNumber: 'LIC-7', vehicles: [{ registrationNumber: ' 123ABC ' }] }] } as never);
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBeNull();
    expect(hook.result.current.formik.values.companyActivityLicenceCopyNumber).toBe('LIC-7');
    vi.mocked(searchMtrSoidukikaart).mockRejectedValueOnce(new Error('x'));
    await act(() => hook.result.current.handleMtrSearch());
    expect(hook.result.current.mtrSearchError).toBe('forms.compound.mtrError.requestFailed');
  });
});
