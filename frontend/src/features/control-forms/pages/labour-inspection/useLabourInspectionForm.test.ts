// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
  outcome: vi.fn(),
  onCompanyFound: undefined as undefined | ((c: object) => void),
  searchByRegCode: vi.fn(),
  searchByName: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../api', () => ({
  saveLabourInspectionForm: h.save,
  confirmLabourInspectionForm: h.confirm,
  publishLabourInspectionForm: h.publish,
  saveProceedingOutcome: h.outcome,
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({ getByCode: (c: string) => [{ code: c }] }),
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

import { useLabourInspectionForm } from './useLabourInspectionForm';
import { ApiError } from '../../../../shared/api/client';
import type { LabourInspectionForm } from '../../types';

const valid = {
  id: 7,
  formNumber: 'TK-1',
  version: 2,
  inspectorName: 'Insp',
  inspectionDate: '2026-01-01',
  inspectionType: 'passenger',
  companyName: 'Firma',
  companyRegCode: 12345678,
  vehicleCount: 3,
  totalDriversCount: 4,
  controlsMatrix: [],
  violations: [],
  prescriptionComposed: true,
} as unknown as LabourInspectionForm;

beforeEach(() => {
  vi.clearAllMocks();
  h.save.mockResolvedValue([{ id: '99' }]);
  h.confirm.mockResolvedValue([{ id: '7' }]);
  h.publish.mockResolvedValue([{ id: '7' }]);
  h.outcome.mockResolvedValue([]);
});

describe('useLabourInspectionForm', () => {
  it('uue vormi vaikeväärtused ja klassifikaatorid', () => {
    const { result } = renderHook(() => useLabourInspectionForm(undefined, vi.fn()));
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formik.values.inspectionType).toBe('passenger');
    expect(result.current.transportTypes).toEqual([{ code: 'TRANSPORT_TYPE' }]);
    expect(result.current.violationClassifiers).toEqual([{ code: 'LABOUR_INSPECTION_VIOLATION' }]);
  });

  it('valideerimine nõuab väljad ja tulevane kuupäev ei sobi', async () => {
    const { result } = renderHook(() => useLabourInspectionForm(undefined, vi.fn()));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.inspectorName).toBe('forms.labour_inspection.validation.required');
    expect(result.current.formik.errors.companyName).toBeTruthy();
    await act(async () => {
      await result.current.formik.setFieldValue('inspectionDate', '2999-01-01');
    });
    expect(result.current.formik.errors.inspectionDate).toBe(
      'forms.labour_inspection.validation.api.future_date_not_allowed',
    );
  });

  it('salvestab stringistatud payload-iga', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useLabourInspectionForm(valid, onSaved));
    expect(result.current.isEdit).toBe(true);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const payload = h.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      status: 'saved',
      companyRegCode: '12345678',
      vehicleCount: '3',
      prescriptionComposed: 'true',
      controlsMatrix: '[]',
    });
    expect(onSaved).toHaveBeenCalledWith('99');
  });

  it('kinnitamine ja avalikustamine kasutavad õigeid kutseid', async () => {
    const onConfirmed = vi.fn();
    const onPublished = vi.fn();
    const { result } = renderHook(() => useLabourInspectionForm(valid, vi.fn(), onConfirmed, onPublished));
    await act(async () => {
      await result.current.triggerConfirm();
    });
    expect(h.confirm.mock.calls[0][0].status).toBe('confirmed');
    expect(onConfirmed).toHaveBeenCalled();
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(h.publish).toHaveBeenCalledWith(7);
    expect(h.outcome).not.toHaveBeenCalled();
    expect(onPublished).toHaveBeenCalled();
  });

  it('avalikustamine salvestab menetluse tulemuse, kui menetlus on olemas', async () => {
    const { result } = renderHook(() =>
      useLabourInspectionForm(
        { ...valid, proceedingReferenceNumber: 'M-1', enforcementDecision: 'otsus' } as LabourInspectionForm,
        vi.fn(),
        vi.fn(),
        vi.fn(),
      ),
    );
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(h.outcome).toHaveBeenCalledWith('labour_inspection', 7, 'otsus', '');
  });

  it('kinnitamine/avalikustamine ilma tagasikutseta langeb onSaved peale', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useLabourInspectionForm(valid, onSaved));
    await act(async () => {
      await result.current.triggerConfirm();
    });
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(onSaved).toHaveBeenCalledTimes(2);
  });

  it('serveri valideerimisviga väljale ja vormile; muu viga logitakse', async () => {
    const { result } = renderHook(() => useLabourInspectionForm(valid, vi.fn()));
    h.save.mockRejectedValueOnce(new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'companyName', code: 'bad' }));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.companyName).toBe('forms.labour_inspection.validation.api.bad');
    h.save.mockRejectedValueOnce(new ApiError('x', 422, { type: 'VALIDATION_ERROR', code: 'general' }));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formError).toBe('forms.labour_inspection.validation.api.general');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.save.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('maatriksi ridade haldus', async () => {
    const { result } = renderHook(() => useLabourInspectionForm(undefined, vi.fn()));
    act(() => result.current.addMatrixRow(1));
    expect(result.current.formik.values.controlsMatrix).toHaveLength(1);
    act(() => result.current.addMatrixRow(1));
    expect(result.current.formik.values.controlsMatrix).toHaveLength(1);
    act(() => result.current.addMatrixRow(2));
    act(() => result.current.updateMatrixRow(0, { analogRecorderDrivers: 5 }));
    expect(result.current.formik.values.controlsMatrix[0].analogRecorderDrivers).toBe(5);
    act(() => result.current.removeMatrixRow(0));
    expect(result.current.formik.values.controlsMatrix.map((r) => r.transportClass)).toEqual([2]);
  });

  it('rikkumiste lisamine ja eemaldamine', () => {
    const { result } = renderHook(() => useLabourInspectionForm(undefined, vi.fn()));
    act(() => result.current.addViolation({ code: 'A' } as never));
    act(() => result.current.addViolation({ code: 'B' } as never));
    expect(result.current.formik.values.violations).toHaveLength(2);
    act(() => result.current.removeViolation(0));
    expect(result.current.formik.values.violations).toEqual([{ code: 'B' }]);
  });

  it('äriregistri otsing kasutab vormi väärtusi ja täidab leitud ettevõtte', () => {
    const { result } = renderHook(() => useLabourInspectionForm(valid, vi.fn()));
    result.current.handleCompanyRegSearch();
    expect(h.searchByRegCode).toHaveBeenCalledWith('12345678');
    result.current.handleCompanyNameSearch();
    expect(h.searchByName).toHaveBeenCalledWith('Firma');
    act(() => h.onCompanyFound!({ companyName: 'Uus', registryCode: '999' }));
    expect(result.current.formik.values.companyName).toBe('Uus');
    expect(result.current.formik.values.companyRegCode).toBe('999');
    act(() => h.onCompanyFound!({ companyName: 'Muu' }));
    expect(result.current.formik.values.companyRegCode).toBe('999');
  });
});
