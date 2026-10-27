// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
  outcome: vi.fn(),
  listOrgs: vi.fn(),
  searchVehicleByRegNr: vi.fn(),
  searchMtr: vi.fn(),
  searchPerson: vi.fn(),
  onCompanyFound: undefined as undefined | ((c: object) => void),
  onVehicleFound: undefined as undefined | ((v: object) => void),
  searchByRegCode: vi.fn(),
  searchByName: vi.fn(),
  searchVehicle: vi.fn(),
  user: { firstname: 'Ann', lastname: 'Insp', organisationcode: 'TRAM', structuralunit: 'U1', jobtitle: 'Insp', organisationid: 7 } as Record<string, unknown>,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../organisations/api', () => ({ listOrganisations: h.listOrgs }));
vi.mock('../../api', () => ({
  saveTramForm: h.save,
  confirmTramForm: h.confirm,
  publishTramForm: h.publish,
  saveProceedingOutcome: h.outcome,
}));
vi.mock('../../../xroad/api', () => ({
  searchVehicleByRegNr: h.searchVehicleByRegNr,
  searchMtrSoidukikaart: h.searchMtr,
  searchPersonByCode: h.searchPerson,
}));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('../../../classifiers/ClassifierProvider.tsx', () => {
  const ehak = [
    { classifierValueKey: 1, name: 'Harju maakond', parentKey: null, isValid: true, classifierCode: 'EHAK', code: 'H' },
    { classifierValueKey: 2, name: 'Vana', parentKey: null, isValid: false, classifierCode: 'EHAK', code: 'V' },
  ];
  const values = [
    { classifierCode: 'DOC_RIGHT_CHECK', code: 'D1', isValid: true },
    { classifierCode: 'DOC_RIGHT_CHECK', code: 'D2', isValid: false },
    { classifierCode: 'DRIVING_VIOLATION', code: 'V1', isValid: true },
  ];
  return {
    useClassifiers: () => ({
      values,
      getByCode: (c: string) => {
        if (c === 'EHAK') return ehak;
        if (c === 'STRUCTURE_UNIT')
          return [
            { code: 'U1', name: 'Üksus', description: 'TRAM', isValid: true },
            { code: 'U2', name: 'Muu', description: 'KLIM', isValid: true },
          ];
        return [{ code: `${c}-1`, name: `${c} 1`, isValid: true }, { code: `${c}-2`, name: 'x', isValid: false }];
      },
      getChildren: (_c: string, key: number) =>
        key === 1 ? [{ classifierValueKey: 11, name: 'Tallinn' }, { classifierValueKey: 12, name: 'Tartu' }] : [],
    }),
  };
});
vi.mock('../../../xroad/hooks/useCompanySearch', () => ({
  useCompanySearch: (o: { onCompanyFound: (c: object) => void }) => {
    h.onCompanyFound = o.onCompanyFound;
    return {
      searchByRegCode: h.searchByRegCode,
      searchByName: h.searchByName,
      error: false,
      setError: vi.fn(),
      pickerResults: [],
      handleCompanyPicked: vi.fn(),
      closePicker: vi.fn(),
    };
  },
}));
vi.mock('../../../xroad/hooks/useVehicleSearch', () => ({
  useVehicleSearch: (o: { onVehicleFound: (v: object) => void }) => {
    h.onVehicleFound = o.onVehicleFound;
    return { searchByRegNr: h.searchVehicle, error: false, setError: vi.fn() };
  },
}));

import { useTramControlCard, emptyDriver, emptyTrailer } from './useTramControlCard';
import { ApiError } from '../../../../shared/api/client';
import type { TramControlCard } from '../../types';

const valid = {
  id: '5',
  version: 1,
  formNumber: 'TRAM-1',
  status: 'saved',
  controlCountryCode: 'EE',
  address: 'Tee 1',
  county: '1',
  controlDate: '2026-02-03',
  controlTime: '10:00:00',
  vehicleRegNr: '123ABC',
  vehicleCountryCode: 'EE',
  vehicleCategoryCode: 'A_2012',
  inspectorFirstName: 'Ann',
  inspectorLastName: 'I',
  inspectorOrganisationId: 'TRAM',
  inspectorProfession: 'Insp',
  transportType: 'cargo',
  resultType: 'ok',
  drivers: [{ ...emptyDriver(), firstName: 'Jaan', lastName: 'Juht', birthDate: '1990-01-01', personalCodeEe: '39001010000' }],
  trailers: [],
  companyCountryCode: 'EE',
  companyRegCode: '123',
  transportClasses: [{ a: 1 }],
} as unknown as TramControlCard;

beforeEach(() => {
  vi.clearAllMocks();
  h.user = { firstname: 'Ann', lastname: 'Insp', organisationcode: 'TRAM', structuralunit: 'U1', jobtitle: 'Insp', organisationid: 7 };
  h.save.mockResolvedValue([{ id: '99' }]);
  h.confirm.mockResolvedValue([{ id: '5' }]);
  h.publish.mockResolvedValue([{ id: '5' }]);
  h.outcome.mockResolvedValue([]);
  h.listOrgs.mockResolvedValue([
    { id: 7, code: 'TRAM', name: 'Transpordiamet' },
    { id: 8, code: 'KLIM', name: 'Kliimaministeerium' },
  ]);
});
afterEach(cleanup);

const setup = (form?: TramControlCard, cbs: Partial<Record<'onSaved' | 'onConfirmed' | 'onResetToSaved' | 'onPublished', ReturnType<typeof vi.fn>>> = {}) => {
  const onSaved = (cbs.onSaved ?? vi.fn()) as ReturnType<typeof vi.fn> & ((id?: string) => void);
  const hook = renderHook(() => useTramControlCard(form, onSaved, cbs.onConfirmed as never, cbs.onResetToSaved as never, cbs.onPublished as never));
  return { ...hook, onSaved };
};

describe('algseis ja klassifikaatorid', () => {
  it('emptyDriver / emptyTrailer', () => {
    expect(emptyDriver().firstName).toBe('');
    expect(emptyTrailer().regNr).toBe('');
  });

  it('uue kaardi vaikeväärtused tulevad kasutajalt', async () => {
    const { result } = setup();
    expect(result.current.formik.values.inspectorFirstName).toBe('Ann');
    expect(result.current.formik.values.inspectorOrganisationId).toBe('TRAM');
    expect(result.current.formik.values.drivers).toHaveLength(1);
    await waitFor(() => expect(result.current.orgOptions).toHaveLength(2));
    expect(result.current.counties).toEqual([{ id: 1, name: 'Harju maakond' }]);
    expect(result.current.roads).toEqual([{ code: 'ROAD_NAME-1', name: 'ROAD_NAME 1' }]);
    expect(result.current.trailerCategories).toHaveLength(1);
    expect(result.current.vehicleCategories).toHaveLength(1);
    expect(result.current.docRightChecks).toHaveLength(1);
    expect(result.current.drivingViolations).toHaveLength(1);
    expect(result.current.massDimensions).toHaveLength(1);
    expect(result.current.tachographTypes).toHaveLength(1);
    expect(result.current.transportClassItems).toHaveLength(1);
    expect(result.current.cargoCabotageViolations).toHaveLength(1);
    expect(result.current.passengerCabotageViolations).toHaveLength(1);
    expect(result.current.docRightOtherDocs).toHaveLength(1);
    expect(result.current.structureUnits).toEqual([{ code: 'U1', name: 'Üksus' }]);
  });

  it('organisatsioonide laadimise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.listOrgs.mockRejectedValue(new Error('x'));
    setup();
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('JSON-stringina tulnud massiivid parsitakse', () => {
    const { result } = setup({
      ...valid,
      drivers: JSON.stringify(valid.drivers),
      trailers: JSON.stringify([{ regNr: 'T1', countryCode: 'EE', categoryCode: 'C_2012' }]),
      files: '[]',
    } as unknown as TramControlCard);
    expect(result.current.formik.values.drivers).toHaveLength(1);
    expect(result.current.formik.values.trailers).toHaveLength(1);
  });

  it('puuduva organisatsioonikoodi korral leitakse see organisationid järgi', async () => {
    h.user = { ...h.user, organisationcode: '' };
    const { result } = setup({ ...valid, inspectorOrganisationId: '' } as unknown as TramControlCard);
    await waitFor(() => expect(result.current.formik.values.inspectorOrganisationId).toBe('TRAM'));
  });

  it('organisatsiooni- ja üksusevahetus; numbriline org id leiab üksused', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.orgOptions).toHaveLength(2));
    act(() => result.current.handleOrgChange({ value: 'KLIM', label: 'x' }));
    expect(result.current.formik.values.inspectorOrganisationId).toBe('KLIM');
    expect(result.current.structureUnits).toEqual([{ code: 'U2', name: 'Muu' }]);
    act(() => result.current.handleOrgChange(null));
    expect(result.current.formik.values.inspectorOrganisationId).toBe('');
    act(() => result.current.handleStructuralUnitChange({ value: 'U2', label: 'x' }));
    expect(result.current.formik.values.inspectorUnit).toBe('U2');
    act(() => result.current.handleStructuralUnitChange(null));
    expect(result.current.formik.values.inspectorUnit).toBe('');
  });

  it('linnad sõltuvad maakonnast ja valiku muutmine lähtestab linna', async () => {
    const { result } = setup({ ...valid, county: '1', companyCounty: '1', city: 'x', companyCity: 'y' } as unknown as TramControlCard);
    expect(result.current.citiesParishes).toHaveLength(2);
    expect(result.current.companyCitiesParishes).toHaveLength(2);
    act(() => result.current.handleCountyChange());
    act(() => result.current.handleCompanyCountyChange());
    expect(result.current.formik.values.city).toBe('');
    expect(result.current.formik.values.companyCity).toBe('');
    const r2 = setup(valid);
    expect(r2.result.current.companyCitiesParishes).toEqual([]);
  });
});

describe('salvestamine', () => {
  it('valideerimine nõuab väljad', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).not.toHaveBeenCalled();
    expect(result.current.formik.errors.controlDate).toBeTruthy();
    expect(result.current.formik.errors.address).toBeTruthy();
  });

  it('salvestab uue kaardi (id puudub) ja kutsub onSaved tulemuse id-ga', async () => {
    const { result, onSaved } = setup({ ...valid, id: undefined, status: undefined } as unknown as TramControlCard);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).toHaveBeenCalled();
    expect(h.save.mock.calls[0][0]).toMatchObject({ status: 'saved', transportEmptyRun: 'false', transportClasses: '[{"a":1}]' });
    expect(onSaved).toHaveBeenCalledWith('99');
  });

  it('olemasoleva salvestatud kaardi salvestamine', async () => {
    const { result, onSaved } = setup(valid);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save.mock.calls[0][0]).toMatchObject({ id: '5', status: 'saved', driver1PersonalCodeEe: '39001010000', driver2PersonalCodeEe: '' });
    expect(onSaved).toHaveBeenCalledWith('5');
  });

  it('kinnitamine', async () => {
    const onConfirmed = vi.fn();
    const { result } = setup(valid, { onConfirmed });
    await act(async () => {
      result.current.triggerConfirm(true);
    });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(h.confirm.mock.calls[0][0]).toMatchObject({ status: 'confirmed', notifyCarrier: 'true' });
  });

  it('kinnitamine vaikimisi ilma teavituseta', async () => {
    const onConfirmed = vi.fn();
    const { result } = setup(valid, { onConfirmed });
    await act(async () => {
      result.current.triggerConfirm();
    });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(h.confirm.mock.calls[0][0]).toMatchObject({ notifyCarrier: 'false' });
  });

  it('avalikustamine', async () => {
    const onPublished = vi.fn();
    const { result } = setup({ ...valid, status: 'confirmed' } as TramControlCard, { onPublished });
    await act(async () => {
      result.current.triggerPublish();
    });
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    expect(h.publish).toHaveBeenCalledWith('5');
  });

  it('kinnitatud kaardi muutmine jääb kinnitatuks', async () => {
    const onConfirmed = vi.fn();
    const { result } = setup({ ...valid, status: 'confirmed' } as TramControlCard, { onConfirmed });
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save.mock.calls[0][0].status).toBe('confirmed');
    expect(onConfirmed).toHaveBeenCalled();
  });

  it('avaldatud kaardi muutmine jääb avaldatuks', async () => {
    const onPublished = vi.fn();
    const { result } = setup({ ...valid, status: 'published' } as TramControlCard, { onPublished });
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save.mock.calls[0][0].status).toBe('published');
    expect(onPublished).toHaveBeenCalled();
  });

  it('triggerSaveAsSaved langetab staatuse ja kutsub onResetToSaved; ilma selleta onSaved', async () => {
    const onResetToSaved = vi.fn();
    const { result } = setup({ ...valid, status: 'confirmed' } as TramControlCard, { onResetToSaved });
    await act(async () => {
      result.current.triggerSaveAsSaved();
    });
    await waitFor(() => expect(onResetToSaved).toHaveBeenCalled());
    expect(h.save.mock.calls[0][0].status).toBe('saved');
    const r2 = setup({ ...valid, status: 'confirmed' } as TramControlCard);
    await act(async () => {
      r2.result.current.triggerSaveAsSaved();
    });
    await waitFor(() => expect(r2.onSaved).toHaveBeenCalled());
  });

  it('triggerSaveWithCurrentStatus säilitab staatuse', async () => {
    const onConfirmed = vi.fn();
    const { result } = setup({ ...valid, status: 'confirmed' } as TramControlCard, { onConfirmed });
    await act(async () => {
      result.current.triggerSaveWithCurrentStatus();
    });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(h.save.mock.calls[0][0].status).toBe('confirmed');
  });

  it('serveri valideerimisviga (JSON stringina) läheb väljale; muu viga logitakse', async () => {
    const { result } = setup(valid);
    h.save.mockRejectedValueOnce(
      new ApiError('x', 422, JSON.stringify({ type: 'VALIDATION_ERROR', field: 'address', code: 'bad' })),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.address).toBe('forms.foreign_violation.validation.api.bad');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.save.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('juhi andmeid ei nõuta, kui "ei ole asjakohane"; teise juhi sünniaeg on kohustuslik', async () => {
    const empty = { ...emptyDriver() };
    const { result } = setup({ ...valid, driverNotApplicable: true, transportType: '', drivers: [empty] } as unknown as TramControlCard);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).toHaveBeenCalled();
    h.save.mockClear();
    const r2 = setup({ ...valid, drivers: [valid.drivers![0], { ...empty }] } as unknown as TramControlCard);
    await act(async () => {
      await r2.result.current.formik.submitForm();
    });
    expect(h.save).not.toHaveBeenCalled();
    expect(JSON.stringify(r2.result.current.formik.errors)).toContain('birthDate');
  });

  it('juhi andmed puuduvad: nõutakse ees- ja perekonnanimi ja sünniaeg', async () => {
    const { result } = setup({ ...valid, drivers: [emptyDriver()] } as unknown as TramControlCard);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const s = JSON.stringify(result.current.formik.errors);
    expect(s).toContain('firstName');
    expect(s).toContain('lastName');
    expect(s).toContain('birthDate');
  });
});

describe('otsingud', () => {
  it('ettevõtte otsing: registrikoodi järgi või nime järgi', () => {
    const { result } = setup(valid);
    result.current.handleCompanySearch();
    expect(h.searchByRegCode).toHaveBeenCalledWith('123');
    const r2 = setup({ ...valid, companyRegCode: ' ', companyName: 'Firma' } as unknown as TramControlCard);
    r2.result.current.handleCompanySearch();
    expect(h.searchByName).toHaveBeenCalledWith('Firma');
    r2.result.current.handleCompanyNameSearch();
    expect(h.searchByName).toHaveBeenCalledTimes(2);
  });

  it('leitud ettevõte täidab väljad ja lahendab EHAK nimede järgi', () => {
    const { result } = setup(valid);
    act(() =>
      h.onCompanyFound!({ companyName: 'Firma', street: 'Tee 2', city: 'Põhja-Tallinna linnaosa, Tallinn, Harju maakond', postalCode: '10111', registryCode: '999' }),
    );
    expect(result.current.formik.values.companyCounty).toBe('1');
    expect(result.current.formik.values.companyCity).toBe('11');
    expect(result.current.formik.values.companyRegCode).toBe('999');
    act(() => h.onCompanyFound!({ companyName: 'F2', street: '', city: 'Tundmatu, Harju maakond', postalCode: '' }));
    expect(result.current.formik.values.companyCounty).toBe('1');
    expect(result.current.formik.values.companyCity).toBe('');
    act(() => h.onCompanyFound!({ companyName: 'F3', street: '', city: 'Tundmatu, Mingi maakond', postalCode: '' }));
    expect(result.current.formik.values.companyCounty).toBe('');
    act(() => h.onCompanyFound!({ companyName: 'F4', street: '', city: 'Harju', postalCode: '' }));
    expect(result.current.formik.values.companyCounty).toBe('');
  });

  it('sõiduki otsing ja leitud sõiduk (kategooriate kaardistus)', () => {
    const { result } = setup(valid);
    result.current.handleVehicleSearch();
    expect(h.searchVehicle).toHaveBeenCalledWith('123ABC');
    act(() => h.onVehicleFound!({ make: 'Volvo', model: 'FH', vin: 'V', bodyType: 'T', categoryCode: ' N3 ', firstRegistrationDate: '2020-01-01' }));
    expect(result.current.formik.values.vehicleCategoryCode).toBe('B_2012');
    expect(result.current.formik.values.vehicleCountryCode).toBe('EE');
    act(() => h.onVehicleFound!({ categoryCode: 'M1' }));
    expect(result.current.formik.values.vehicleCategoryCode).toBe('OTHER_2012');
    expect(result.current.formik.values.vehicleCategoryOther).toBe('M1');
    act(() => h.onVehicleFound!({}));
    expect(result.current.formik.values.vehicleCategoryCode).toBe('');
    expect(result.current.formik.values.vehicleMake).toBe('');
  });

  it('haagise otsing', async () => {
    const { result } = setup({ ...valid, trailers: [{ regNr: 'T1' }, { regNr: '' }] } as unknown as TramControlCard);
    await act(async () => {
      await result.current.handleTrailerSearch(1);
    });
    expect(result.current.trailerSearchError).toBe(1);
    h.searchVehicleByRegNr.mockResolvedValueOnce([]);
    await act(async () => {
      await result.current.handleTrailerSearch(0);
    });
    expect(result.current.trailerSearchError).toBe(0);
    h.searchVehicleByRegNr.mockResolvedValueOnce([{ make: 'Krone', model: 'M', vin: 'V', bodyType: 'B', categoryCode: 'O3', firstRegistrationDate: '2019-01-01' }]);
    await act(async () => {
      await result.current.handleTrailerSearch(0);
    });
    expect(result.current.trailerSearchError).toBeNull();
    expect(result.current.formik.values.trailers[0]).toMatchObject({ categoryCode: 'C_2012', make: 'Krone', countryCode: 'EE' });
    h.searchVehicleByRegNr.mockResolvedValueOnce([{ categoryCode: 'O1' }]);
    await act(async () => {
      await result.current.handleTrailerSearch(0);
    });
    expect(result.current.formik.values.trailers[0]).toMatchObject({ categoryCode: 'OTHER_2012', categoryOther: 'O1', make: '' });
    h.searchVehicleByRegNr.mockResolvedValueOnce([{}]);
    await act(async () => {
      await result.current.handleTrailerSearch(0);
    });
    h.searchVehicleByRegNr.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await result.current.handleTrailerSearch(0);
    });
    expect(result.current.trailerSearchError).toBe(0);
    act(() => result.current.setTrailerSearchError(null));
  });

  it('juhi isikuotsing', async () => {
    const { result } = setup({ ...valid, drivers: [{ ...emptyDriver(), personalCodeEe: '39001010000', firstName: 'Vana' }, emptyDriver()] } as unknown as TramControlCard);
    await act(async () => {
      await result.current.handleDriverPersonSearch(1);
    });
    expect(result.current.driverSearchError).toBe(1);
    h.searchPerson.mockResolvedValueOnce(null);
    await act(async () => {
      await result.current.handleDriverPersonSearch(0);
    });
    expect(result.current.driverSearchNotFound).toBe(0);
    expect(result.current.driverSearchLoading).toBeNull();
    h.searchPerson.mockResolvedValueOnce({ firstName: 'Mari', lastName: 'Maasikas', citizenshipCode: 'EE', dateOfBirth: '1990-01-01' });
    await act(async () => {
      await result.current.handleDriverPersonSearch(0);
    });
    expect(result.current.formik.values.drivers[0]).toMatchObject({ firstName: 'Mari', birthDate: '1990-01-01', citizenshipCode: 'EE' });
    h.searchPerson.mockResolvedValueOnce({});
    await act(async () => {
      await result.current.handleDriverPersonSearch(0);
    });
    expect(result.current.formik.values.drivers[0].firstName).toBe('Mari');
    h.searchPerson.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await result.current.handleDriverPersonSearch(0);
    });
    expect(result.current.driverSearchError).toBe(0);
    act(() => {
      result.current.setDriverSearchError(null);
      result.current.setDriverSearchNotFound(null);
    });
  });

  it('MTR otsing: kõik tulemused', async () => {
    const { result } = setup(valid);
    h.searchMtr.mockResolvedValueOnce(null);
    await act(async () => {
      await result.current.handleMtrSearch();
    });
    expect(result.current.mtrSearchError).toBe('forms.compound.mtrError.companyNotFound');
    h.searchMtr.mockResolvedValueOnce({ vehicleCards: [{ registrationNumber: 'X', vehicles: [{ registrationNumber: 'OTHER' }] }] });
    await act(async () => {
      await result.current.handleMtrSearch();
    });
    expect(result.current.mtrSearchError).toBe('forms.compound.mtrError.licenceNotFound');
    h.searchMtr.mockResolvedValueOnce({ vehicleCards: [{ registrationNumber: 'LIC-1', vehicles: [{ registrationNumber: ' 123abc ' }] }] });
    await act(async () => {
      await result.current.handleMtrSearch();
    });
    expect(result.current.formik.values.companyActivityLicenceCopyNumber).toBe('LIC-1');
    expect(result.current.mtrSearchError).toBeNull();
    h.searchMtr.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await result.current.handleMtrSearch();
    });
    expect(result.current.mtrSearchError).toBe('forms.compound.mtrError.requestFailed');
    act(() => result.current.setMtrSearchError(null));
  });

  it('MTR otsing: mitte-eesti ettevõte ja puuduvad väljad', async () => {
    const a = setup({ ...valid, companyCountryCode: 'LV' } as unknown as TramControlCard);
    await act(async () => {
      await a.result.current.handleMtrSearch();
    });
    expect(a.result.current.mtrSearchError).toBe('forms.compound.mtrError.notEstonianCompany');
    const b = setup({ ...valid, companyRegCode: '' } as unknown as TramControlCard);
    await act(async () => {
      await b.result.current.handleMtrSearch();
    });
    expect(b.result.current.mtrSearchError).toBe('forms.compound.mtrError.missingFields');
  });
});
