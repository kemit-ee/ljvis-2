// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
  duplicate: vi.fn(),
  email: vi.fn(),
  listOrgs: vi.fn(),
  persons: vi.fn(),
  onCompanyFound: undefined as undefined | ((c: object) => void),
  onVehicleFound: undefined as undefined | ((v: object) => void),
  searchByRegCode: vi.fn(),
  searchByName: vi.fn(),
  searchVehicle: vi.fn(),
  getChildren: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../api', () => ({
  saveForeignViolationForm: h.save,
  confirmForeignViolationForm: h.confirm,
  publishForeignViolationForm: h.publish,
  checkDuplicateForeignViolationForm: h.duplicate,
  getCarrierRegistryEmail: h.email,
}));
vi.mock('../../../organisations/api', () => ({ listOrganisations: h.listOrgs }));
vi.mock('../../../xroad/api', () => ({ getAssociatedPersons: h.persons }));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { firstname: 'Ann', lastname: 'Inspekt', organisationcode: 'ORG1', structuralunit: 'U1', jobtitle: 'Insp' } }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: (c: string) =>
      c === 'STRUCTURE_UNIT'
        ? [
            { code: 'U1', name: 'Üksus 1', description: 'ORG1' },
            { code: 'U2', name: 'Üksus 2', description: 'ORG2' },
          ]
        : [
            { classifierValueKey: 1, name: 'Harju', parentKey: null, isValid: true },
            { classifierValueKey: 2, name: 'Vana', parentKey: null, isValid: false },
            { classifierValueKey: 3, name: 'Tallinn', parentKey: 1 },
          ],
    getChildren: h.getChildren,
  }),
}));
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

import { useForeignViolationForm } from './useForeignViolationForm';
import { ApiError } from '../../../../shared/api/client';
import type { ForeignViolationForm } from '../../types';

const valid = {
  id: '5',
  formNumber: 'VR-1',
  version: 1,
  reportingCountryCode: 'LV',
  reportingAuthority: 'Amet',
  inspectionCountryCode: 'EE',
  inspectionDate: '2026-02-03',
  dataEntryDate: '2026-02-04',
  inspectorFirstName: 'Ann',
  inspectorLastName: 'I',
  inspectorOrganisationId: 'ORG1',
  sanctionCode: 'KORRAS',
  recommendedMeasureCode: 'PUUDUVAD',
  violations: [],
  additionalSanctionCodes: [],
  companyRegCode: '123',
  vehicleRegNr: 'ABC123',
  notes: 'märkus',
} as unknown as ForeignViolationForm;

beforeEach(() => {
  vi.clearAllMocks();
  h.save.mockResolvedValue([{ id: '99' }]);
  h.confirm.mockResolvedValue([{ id: '5' }]);
  h.publish.mockResolvedValue([{ id: '5' }]);
  h.duplicate.mockResolvedValue([]);
  h.email.mockResolvedValue({ email: 'a@b.ee', found: true });
  h.listOrgs.mockResolvedValue([
    { id: 1, code: 'ORG1', name: 'Org 1' },
    { id: 2, code: 'ORG2', name: 'Org 2' },
  ]);
  h.persons.mockResolvedValue([{ name: 'P' }]);
  h.getChildren.mockReturnValue([{ classifierValueKey: 9, name: 'Linn' }]);
});

afterEach(cleanup);

describe('useForeignViolationForm', () => {
  it('uue vormi vaikeväärtused tulevad kasutajast; organisatsioonid ja üksused laetakse', async () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formik.values.inspectorFirstName).toBe('Ann');
    expect(result.current.formik.values.sanctionCode).toBe('KORRAS');
    await waitFor(() => expect(result.current.orgOptions).toHaveLength(2));
    expect(result.current.orgOptions[0]).toEqual({ label: 'Org 1', value: 'ORG1' });
    expect(result.current.structureUnits).toEqual([{ code: 'U1', name: 'Üksus 1' }]);
    expect(result.current.counties).toEqual([{ id: 1, name: 'Harju' }]);
  });

  it('organisatsioonide laadimise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.listOrgs.mockRejectedValue(new Error('x'));
    renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('organisatsiooni ja üksuse vahetus', async () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    await waitFor(() => expect(result.current.orgOptions).toHaveLength(2));
    act(() => result.current.handleOrgChange({ value: 'ORG2', label: 'x' }));
    expect(result.current.formik.values.inspectorOrganisationId).toBe('ORG2');
    expect(result.current.formik.values.inspectorUnit).toBe('');
    expect(result.current.structureUnits).toEqual([{ code: 'U2', name: 'Üksus 2' }]);
    act(() => result.current.handleOrgChange(null));
    expect(result.current.formik.values.inspectorOrganisationId).toBe('');
    expect(result.current.structureUnits).toEqual([]);
    act(() => result.current.handleStructuralUnitChange({ value: 'U1', label: 'x' }));
    expect(result.current.formik.values.inspectorUnit).toBe('U1');
    act(() => result.current.handleStructuralUnitChange(null));
    expect(result.current.formik.values.inspectorUnit).toBe('');
  });

  it('numbriline organisatsiooni id vanast andmest leiab organisatsiooni; tundmatu annab tühja', async () => {
    const { result } = renderHook(() =>
      useForeignViolationForm({ ...valid, inspectorOrganisationId: '1' } as ForeignViolationForm, vi.fn()),
    );
    await waitFor(() => expect(result.current.structureUnits).toEqual([{ code: 'U1', name: 'Üksus 1' }]));
    const r2 = renderHook(() =>
      useForeignViolationForm({ ...valid, inspectorOrganisationId: 'NOPE' } as ForeignViolationForm, vi.fn()),
    );
    await waitFor(() => expect(r2.result.current.orgOptions).toHaveLength(2));
    expect(r2.result.current.structureUnits).toEqual([]);
  });

  it('valideerimine nõuab väljad', async () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).not.toHaveBeenCalled();
    expect(result.current.formik.errors.reportingCountryCode).toBe('forms.foreign_violation.validation.required');
  });

  it('salvestab payload-i stringistatud väljadega', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useForeignViolationForm(valid, onSaved));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const payload = h.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      id: '5',
      violations: '[]',
      additionalSanctionCodes: '[]',
      notifyCarrier: 'false',
      penaltyExpiredOrProcessed: 'false',
      notes: 'märkus',
    });
    expect(onSaved).toHaveBeenCalledWith('99');
  });

  it('kinnitamine ja avalikustamine; kinnitamine ilma tagasikutseta langeb onSaved peale', async () => {
    const onSaved = vi.fn();
    const onConfirmed = vi.fn();
    const onPublished = vi.fn();
    const { result } = renderHook(() => useForeignViolationForm(valid, onSaved, onConfirmed, onPublished));
    await act(async () => {
      result.current.triggerConfirm();
    });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    await act(async () => {
      result.current.triggerPublish();
    });
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    expect(h.publish).toHaveBeenCalledWith('5');
    const r2 = renderHook(() => useForeignViolationForm(valid, onSaved));
    await act(async () => {
      r2.result.current.triggerConfirm();
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('kinnitamisel on rikkumise sanktsioon kohustuslik', async () => {
    const { result } = renderHook(() =>
      useForeignViolationForm(
        { ...valid, violations: [{ code: 'A', sanctionCode: '' }] } as unknown as ForeignViolationForm,
        vi.fn(),
        vi.fn(),
      ),
    );
    await act(async () => {
      result.current.triggerConfirm();
    });
    await waitFor(() =>
      expect((result.current.formik.errors as Record<string, unknown>).violations).toBeTruthy(),
    );
    expect(h.confirm).not.toHaveBeenCalled();
  });

  it('rikkumistega vorm saadetakse JSON-ina', async () => {
    const { result } = renderHook(() =>
      useForeignViolationForm(
        { ...valid, sanctionCode: '', violations: [{ code: 'A', sanctionCode: 'TRAHV' }] } as unknown as ForeignViolationForm,
        vi.fn(),
      ),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save.mock.calls[0][0].violations).toBe('[{"code":"A","sanctionCode":"TRAHV"}]');
  });

  it('serveri valideerimisviga väljale; muu viga logitakse', async () => {
    const { result } = renderHook(() => useForeignViolationForm(valid, vi.fn()));
    h.save.mockRejectedValueOnce(new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'companyName', code: 'bad' }));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.companyName).toBe('forms.foreign_violation.validation.api.bad');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.save.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('vedaja registri e-post laetakse vormi avamisel; viga annab tühja', async () => {
    const { result } = renderHook(() => useForeignViolationForm(valid, vi.fn()));
    await waitFor(() => expect(result.current.formik.values.carrierRegistryEmail).toBe('a@b.ee'));
    h.email.mockRejectedValue(new Error('x'));
    const r2 = renderHook(() => useForeignViolationForm({ ...valid, id: '6' } as ForeignViolationForm, vi.fn()));
    await waitFor(() => expect(h.email).toHaveBeenCalledTimes(2));
    expect(r2.result.current.formik.values.carrierRegistryEmail).toBe('');
  });
});

describe('duplikaadi kontroll', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('leiab duplikaadi viivitusega ja tühistab puuduvate väljade korral', async () => {
    h.duplicate.mockResolvedValue([{ formNumber: 'VR-0', status: 'saved' }]);
    const { result } = renderHook(() => useForeignViolationForm(valid, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });
    expect(h.duplicate).toHaveBeenCalledWith(expect.objectContaining({ companyRegCode: '123', excludeId: '5' }));
    expect(result.current.duplicateWarning).toEqual({ formNumber: 'VR-0', status: 'saved' });
    await act(async () => {
      await result.current.formik.setFieldValue('vehicleRegNr', '');
    });
    expect(result.current.duplicateWarning).toBeNull();
  });

  it('tühi vastus ja viga nullivad hoiatuse', async () => {
    h.duplicate.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useForeignViolationForm(valid, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });
    expect(result.current.duplicateWarning).toBeNull();
  });
});

describe('otsingud ja seotud valikud', () => {
  it('ettevõtte ja sõiduki otsing kasutavad vormi väärtusi', () => {
    const { result } = renderHook(() => useForeignViolationForm(valid, vi.fn()));
    result.current.handleCompanyRegCodeSearch();
    expect(h.searchByRegCode).toHaveBeenCalledWith('123');
    result.current.handleCompanyNameSearch();
    expect(h.searchByName).toHaveBeenCalled();
    result.current.handleVehicleSearch();
    expect(h.searchVehicle).toHaveBeenCalledWith('ABC123');
  });

  it('leitud ettevõte täidab väljad, seotud isikud ja e-posti', async () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    act(() =>
      h.onCompanyFound!({ companyName: 'Firma', address: 'Tee 1', city: 'Tln', postalCode: '10111', registryCode: '777' }),
    );
    await waitFor(() => expect(result.current.associatedPersons).toEqual([{ name: 'P' }]));
    expect(result.current.formik.values.companyRegCode).toBe('777');
    expect(result.current.formik.values.companyCountryCode).toBe('EE');
    await waitFor(() => expect(result.current.formik.values.carrierRegistryEmail).toBe('a@b.ee'));
    h.persons.mockRejectedValue(new Error('x'));
    h.email.mockRejectedValue(new Error('x'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => h.onCompanyFound!({ companyName: 'Muu', address: '', city: '', postalCode: '' }));
    await waitFor(() => expect(h.email).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.formik.values.carrierRegistryEmail).toBe(''));
    err.mockRestore();
  });

  it('leitud sõiduk täidab väljad (vaikeväärtustega)', () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    act(() => h.onVehicleFound!({ make: 'Volvo', model: 'FH', vin: 'V1', bodyType: 'T', firstRegistrationDate: '2020-01-01' }));
    expect(result.current.formik.values.vehicleMake).toBe('Volvo');
    expect(result.current.formik.values.vehicleCountryCode).toBe('EE');
    act(() => h.onVehicleFound!({}));
    expect(result.current.formik.values.vehicleMake).toBe('');
  });

  it('litsentsikoopia otsing annab vea', async () => {
    const { result } = renderHook(() => useForeignViolationForm(undefined, vi.fn()));
    await act(async () => {
      await result.current.handleLicenceCopyNumberSearch();
    });
    expect(result.current.licenceCopyNumberError).toBe(true);
    act(() => result.current.setLicenceCopyNumberError(false));
    expect(result.current.licenceCopyNumberError).toBe(false);
  });

  it('asukohavalikud sõltuvad maakonnast ja lähtestavad linna', () => {
    const { result } = renderHook(() =>
      useForeignViolationForm(
        { ...valid, companyAddressLine2: '1', inspectionRegion: '1', companyCity: 'x', inspectionCity: 'y' } as ForeignViolationForm,
        vi.fn(),
      ),
    );
    expect(result.current.companyCitiesParishes).toEqual([{ id: 9, name: 'Linn' }]);
    expect(result.current.inspectionCitiesParishes).toEqual([{ id: 9, name: 'Linn' }]);
    act(() => result.current.handleCompanyCountyChange());
    act(() => result.current.handleInspectionRegionChange());
    expect(result.current.formik.values.companyCity).toBe('');
    expect(result.current.formik.values.inspectionCity).toBe('');
  });
});
