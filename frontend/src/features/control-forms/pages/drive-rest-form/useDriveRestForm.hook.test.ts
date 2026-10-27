// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
  outcome: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../api', () => ({
  saveDriveRestForm: h.save,
  confirmDriveRestForm: h.confirm,
  publishDriveRestForm: h.publish,
  saveProceedingOutcome: h.outcome,
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const values = [
    { classifierValueKey: 1, classifierCode: 'DOC_RIGHT_CHECK', code: 'D1', isValid: true, parentKey: null },
    { classifierValueKey: 2, classifierCode: 'DOC_RIGHT_CHECK', code: 'D2', isValid: false, parentKey: null },
    { classifierValueKey: 10, classifierCode: 'DRIVING_VIOLATION', code: 'MAIN', isValid: true, parentKey: null },
    { classifierValueKey: 11, classifierCode: 'DRIVING_VIOLATION', code: 'ROOMA_I', isValid: true, parentKey: null },
    { classifierValueKey: 12, classifierCode: 'DRIVING_VIOLATION', code: 'R2', isValid: true, parentKey: 11 },
    { classifierValueKey: 13, classifierCode: 'DRIVING_VIOLATION', code: 'R3', isValid: true, parentKey: 12 },
    { classifierValueKey: 14, classifierCode: 'DRIVING_VIOLATION', code: 'LAHETAMINE', isValid: true, parentKey: null },
    { classifierValueKey: 15, classifierCode: 'DRIVING_VIOLATION', code: 'L2', isValid: true, parentKey: 14 },
    { classifierValueKey: 16, classifierCode: 'DRIVING_VIOLATION', code: 'OLD', isValid: false, parentKey: null },
  ];
  return {
    useClassifiers: () => ({
      values,
      getByCode: (c: string) => [
        { code: `${c}-1`, isValid: true },
        { code: `${c}-2`, isValid: false },
      ],
    }),
  };
});

import { createDriveRestValidationSchema, useDriveRestForm } from './useDriveRestForm';
import type { DriveRestForm } from '../../types';

const t = (k: string) => k;

const base = {
  id: '5',
  compoundFormKey: 3,
  status: 'saved',
  transportType: 'cargo',
  resultType: 'ok',
  spApplicability: 'applicable',
  atpViolationFound: 'false',
} as unknown as DriveRestForm;

beforeEach(() => {
  vi.clearAllMocks();
  h.save.mockResolvedValue([{ id: '99' }]);
  h.confirm.mockResolvedValue([{ id: '5' }]);
  h.publish.mockResolvedValue([{ id: '5' }]);
  h.outcome.mockResolvedValue([]);
});
afterEach(cleanup);

describe('createDriveRestValidationSchema', () => {
  const validate = (values: object) => createDriveRestValidationSchema(t).validate(values, { abortEarly: false });

  it('nõuab põhiväljad', async () => {
    await expect(validate({})).rejects.toMatchObject({ errors: expect.arrayContaining(['forms.sp_form.validation.required']) });
  });

  it('menetluse viitenumber on nõutav, v.a. üldmenetlus', async () => {
    const ok = { transportType: 'a', resultType: 'b', spApplicability: 'c', checkedDaysCount: '5', workDaysCount: '3' };
    await expect(validate({ ...ok, proceedingType: 'YLD' })).resolves.toBeTruthy();
    await expect(validate({ ...ok, proceedingType: 'KOH' })).rejects.toBeTruthy();
    await expect(validate({ ...ok, proceedingType: 'KOH', proceedingReferenceNumber: 'X' })).resolves.toBeTruthy();
  });

  it('ATP kirjeldus on nõutav rikkumise korral', async () => {
    const ok = { transportType: 'a', resultType: 'b', spApplicability: 'c' };
    await expect(validate({ ...ok, atpViolationFound: 'true' })).rejects.toBeTruthy();
    await expect(validate({ ...ok, atpViolationFound: 'true', atpViolationDescription: 'x' })).resolves.toBeTruthy();
  });

  it('päevade arvu reeglid', async () => {
    const ok = { transportType: 'a', resultType: 'b', spApplicability: 'c' };
    await expect(validate({ ...ok, checkedDaysCount: '123' })).rejects.toBeTruthy();
    await expect(validate({ ...ok, workDaysCount: '5', checkedDaysCount: '' })).rejects.toBeTruthy();
    await expect(validate({ ...ok, workDaysCount: '9', checkedDaysCount: '5' })).rejects.toBeTruthy();
    await expect(validate({ ...ok, workDaysCount: '', checkedDaysCount: '' })).resolves.toBeTruthy();
  });
});

describe('useDriveRestForm klassifikaatorid', () => {
  it('jagab sõidurikkumised põhi-, Rooma I ja lähetamise osadeks', () => {
    const { result } = renderHook(() => useDriveRestForm(undefined, vi.fn(), 'driver'));
    expect(result.current.docRightChecks).toHaveLength(1);
    expect(result.current.drivingViolations).toHaveLength(6);
    expect(result.current.rooma1Violations.map((c) => c.code)).toEqual(['ROOMA_I', 'R2', 'R3']);
    expect(result.current.postingViolations.map((c) => c.code)).toEqual(['LAHETAMINE', 'L2']);
    expect(result.current.drivingViolationsMain.map((c) => c.code)).toEqual(['MAIN']);
    expect(result.current.cargoCabotageViolations).toHaveLength(1);
    expect(result.current.passengerCabotageViolations).toHaveLength(1);
    expect(result.current.transportClasses).toHaveLength(1);
    expect(result.current.docRightOtherDocs).toHaveLength(1);
    expect(result.current.tachographTypes).toHaveLength(1);
    expect(result.current.massDimensions).toHaveLength(1);
  });

  it('JSON-stringina tulnud massiivid parsitakse', () => {
    const json = JSON.stringify([{ a: 1 }]);
    const { result } = renderHook(() =>
      useDriveRestForm(
        {
          ...base,
          transportClasses: json,
          cabotageViolations: json,
          documentChecks: json,
          otherDocuments: json,
          violations5612006: json,
          violations1652014: json,
          violations200215: json,
          violations5932008: json,
          violations20201057: json,
          massDimensionMeasurements: json,
          erruPoints: json,
        } as unknown as DriveRestForm,
        vi.fn(),
        'driver',
      ),
    );
    expect(result.current.formik.values.transportClasses).toEqual([{ a: 1 }]);
    expect(result.current.formik.values.erruPoints).toEqual([{ a: 1 }]);
    const arr = renderHook(() =>
      useDriveRestForm({ ...base, transportClasses: [{ b: 2 }] } as unknown as DriveRestForm, vi.fn(), 'driver'),
    );
    expect(arr.result.current.formik.values.transportClasses).toEqual([{ b: 2 }]);
  });
});

describe('useDriveRestForm salvestamine', () => {
  it('salvestab ja kutsub onSaved; PPA nullib liini väljad', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useDriveRestForm({ ...base, liiniNumber: '7', liiniNimetus: 'L' } as unknown as DriveRestForm, onSaved, 'driver', 3),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).toHaveBeenCalledWith('driver', expect.objectContaining({ status: 'saved', liiniNumber: '', liiniNimetus: '', compoundFormKey: 3 }));
    expect(onSaved).toHaveBeenCalledWith('99', false);
  });

  it('TRAM säilitab liini väljad ja pendingCompoundFormKey kirjutab võtme üle', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useDriveRestForm({ ...base, liiniNumber: '7' } as unknown as DriveRestForm, onSaved, 'teammate', undefined, undefined, 'TRAM'),
    );
    result.current.pendingCompoundFormKey.current = 55;
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save).toHaveBeenCalledWith('teammate', expect.objectContaining({ liiniNumber: '7', compoundFormKey: 55 }));
    await waitFor(() => expect(result.current.pendingCompoundFormKey.current).toBeUndefined());
  });

  it('kinnitamine saadab teavituse lipu', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useDriveRestForm(base, onSaved, 'driver'));
    await act(async () => {
      result.current.triggerConfirm(true);
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('5', true));
    expect(h.confirm).toHaveBeenCalledWith('driver', expect.objectContaining({ status: 'confirmed', notifyCarrier: 'true' }));
    await act(async () => {
      result.current.triggerConfirm();
    });
    await waitFor(() => expect(h.confirm).toHaveBeenCalledTimes(2));
    expect(h.confirm.mock.calls[1][1].notifyCarrier).toBe('false');
  });

  it('kinnitatud vormi redigeerimine jääb kinnitatuks', async () => {
    const { result } = renderHook(() => useDriveRestForm({ ...base, status: 'confirmed' } as DriveRestForm, vi.fn(), 'driver'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(h.save.mock.calls[0][1].status).toBe('confirmed');
  });

  it('avalikustamine ilma ja menetlusega', async () => {
    const onPublished = vi.fn();
    const a = renderHook(() => useDriveRestForm(base, vi.fn(), 'driver', undefined, onPublished));
    await act(async () => {
      a.result.current.triggerPublish();
    });
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    expect(h.publish).toHaveBeenCalledWith('driver', '5');
    expect(h.outcome).not.toHaveBeenCalled();
    const b = renderHook(() =>
      useDriveRestForm({ ...base, proceedingReferenceNumber: 'M-1', enforcementDecision: 'otsus' } as unknown as DriveRestForm, vi.fn(), 'teammate', undefined, onPublished),
    );
    await act(async () => {
      b.result.current.triggerPublish();
    });
    await waitFor(() => expect(h.outcome).toHaveBeenCalledWith('sp_teammate', '5', 'otsus', ''));
  });

  it('avalikustamine ilma tagasikutseta ei kuku', async () => {
    const { result } = renderHook(() => useDriveRestForm(base, vi.fn(), 'driver'));
    await act(async () => {
      result.current.triggerPublish();
    });
    await waitFor(() => expect(h.publish).toHaveBeenCalled());
  });

  it('salvestamise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.save.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useDriveRestForm(base, vi.fn(), 'driver'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
