// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransportInterruptionForm } from './useTransportInterruptionForm';
import {
  confirmTransportInterruptionForm,
  publishTransportInterruptionForm,
  saveTransportInterruptionForm,
} from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { TransportInterruptionForm } from '../../types';

const authState = vi.hoisted(() => ({ user: { structuralunit: 'UNIT_1' } as { structuralunit?: string } | null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const euCounties = [
    { classifierValueKey: 1, name: 'Harju', parentKey: null },
    { classifierValueKey: 2, name: 'Tallinn', parentKey: 1 },
  ];
  const getByCode = (code: string) => (code === 'EHAK' ? euCounties : []);
  const getValue = (code: string, value: string) =>
    code === 'PPA_STRUCTURE_UNIT_ADDRESS' && value === 'UNIT_1' ? { name: 'Põhja prefektuur' } : undefined;
  const ctx = { getByCode, getValue };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  confirmTransportInterruptionForm: vi.fn(),
  saveTransportInterruptionForm: vi.fn(),
  publishTransportInterruptionForm: vi.fn(),
}));

const existing = (over: Partial<TransportInterruptionForm> = {}) =>
  ({
    id: '7',
    compoundFormKey: 5,
    subFormNumber: 'SP-1',
    version: 2,
    status: 'saved',
    headerText: 'Päis',
    residenceCountry: 'EE',
    residenceRegion: 'Harju',
    residenceCity: 'Tallinn',
    residenceAddressLine: 'Tee 1',
    residencePostalCode: '10111',
    interruptionReason: 'Põhjus',
    legalBases: ['a', 'b'],
    terminationCondition: 'Tingimus',
    personApplications: 'Avaldused',
    ...over,
  }) as unknown as TransportInterruptionForm;

describe('useTransportInterruptionForm', () => {
  beforeEach(() => {
    authState.user = { structuralunit: 'UNIT_1' };
    vi.mocked(saveTransportInterruptionForm).mockReset().mockResolvedValue([{ id: '99' }] as never);
    vi.mocked(confirmTransportInterruptionForm).mockReset().mockResolvedValue([{ id: '98' }] as never);
    vi.mocked(publishTransportInterruptionForm).mockReset().mockResolvedValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('prefills defaults and header text from the officer structural unit for a new form', () => {
    const { result } = renderHook(() => useTransportInterruptionForm(undefined, vi.fn(), 12));
    const v = result.current.formik.values;
    expect(v.headerText).toBe('Põhja prefektuur');
    expect(v.compoundFormKey).toBe(12);
    expect(v.residenceCountry).toBe('EE');
    expect(v.terminationCondition).toContain('KUNI VEO KATKESTAMISE');
    expect(v.legalBases).toEqual([]);
    expect(result.current.counties).toEqual([{ id: 1, name: 'Harju' }]);
  });

  it('leaves the header empty when the user has no structural unit', () => {
    authState.user = null;
    const { result } = renderHook(() => useTransportInterruptionForm(undefined, vi.fn()));
    expect(result.current.formik.values.headerText).toBe('');
  });

  it('keeps the stored header text for an existing form', () => {
    const { result } = renderHook(() => useTransportInterruptionForm(existing({ headerText: undefined }), vi.fn()));
    expect(result.current.formik.values.headerText).toBe('');
    expect(result.current.addressValue).toEqual({
      countryCode: 'EE',
      county: 'Harju',
      city: 'Tallinn',
      street: 'Tee 1',
      postalCode: '10111',
    });
  });

  it('parses legalBases from a JSON string, tolerating bad input', () => {
    const fromString = renderHook(() =>
      useTransportInterruptionForm(existing({ legalBases: '["x","y"]' as unknown as string[] }), vi.fn()),
    );
    expect(fromString.result.current.formik.values.legalBases).toEqual(['x', 'y']);
    const notArray = renderHook(() =>
      useTransportInterruptionForm(existing({ legalBases: '{"a":1}' as unknown as string[] }), vi.fn()),
    );
    expect(notArray.result.current.formik.values.legalBases).toEqual([]);
    const broken = renderHook(() =>
      useTransportInterruptionForm(existing({ legalBases: '[oops' as unknown as string[] }), vi.fn()),
    );
    expect(broken.result.current.formik.values.legalBases).toEqual([]);
    const missing = renderHook(() =>
      useTransportInterruptionForm(existing({ legalBases: undefined }), vi.fn()),
    );
    expect(missing.result.current.formik.values.legalBases).toEqual([]);
  });

  it('updates address fields and toggles legal bases', async () => {
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), vi.fn()));
    act(() => {
      result.current.setAddressValue({ countryCode: 'LV', county: 'K', city: 'Riga', street: 'S', postalCode: 'P1' });
    });
    await waitFor(() => expect(result.current.formik.values.residenceCity).toBe('Riga'));
    expect(result.current.formik.values.residenceCountry).toBe('LV');
    act(() => result.current.toggleLegalBasis('c', true));
    await waitFor(() => expect(result.current.formik.values.legalBases).toEqual(['a', 'b', 'c']));
    act(() => result.current.toggleLegalBasis('a', false));
    await waitFor(() => expect(result.current.formik.values.legalBases).toEqual(['b', 'c']));
  });

  it('validates the postal code length', async () => {
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), vi.fn()));
    await act(async () => {
      await result.current.formik.setFieldValue('residencePostalCode', '12345678901');
    });
    await waitFor(() => expect(result.current.formik.errors.residencePostalCode).toBe(
      'forms.transport_interruption.validation.postalCodeMaxLength',
    ));
  });

  it('saves a saved form and reports the new id', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useTransportInterruptionForm(existing({ headerText: 'a\nb' }), onSaved),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(saveTransportInterruptionForm).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(saveTransportInterruptionForm).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(payload.status).toBe('saved');
    expect(payload.legalBases).toBe('["a","b"]');
    expect(payload.headerText).toBe('a b');
    expect(onSaved).toHaveBeenCalledWith('99', false);
  });

  it('keeps a confirmed form confirmed on a plain save and uses the compound key override', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useTransportInterruptionForm(existing({ status: 'confirmed' }), onSaved),
    );
    result.current.pendingCompoundFormKey.current = 321;
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const payload = vi.mocked(saveTransportInterruptionForm).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(payload.status).toBe('confirmed');
    expect(payload.compoundFormKey).toBe(321);
    expect(result.current.pendingCompoundFormKey.current).toBeUndefined();
  });

  it('confirms through the confirm endpoint', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), onSaved));
    await act(async () => {
      await result.current.triggerConfirm();
    });
    expect(confirmTransportInterruptionForm).toHaveBeenCalledTimes(1);
    expect(saveTransportInterruptionForm).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith('98', true);
  });

  it('publishes an existing form without saving', async () => {
    const onSaved = vi.fn();
    const onPublished = vi.fn();
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), onSaved, undefined, onPublished));
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(publishTransportInterruptionForm).toHaveBeenCalledWith('7');
    expect(onPublished).toHaveBeenCalled();
    expect(saveTransportInterruptionForm).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('maps a 422 validation error to a field error and a form error', async () => {
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), vi.fn()));
    vi.mocked(saveTransportInterruptionForm).mockRejectedValueOnce(
      new ApiError('bad', 422, { type: 'VALIDATION_ERROR', field: 'interruptionReason', code: 'tooLong' }),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.interruptionReason).toBe(
      'forms.transport_interruption.validation.api.tooLong',
    );

    vi.mocked(saveTransportInterruptionForm).mockRejectedValueOnce(
      new ApiError('bad', 422, { type: 'VALIDATION_ERROR', code: 'general' }),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formError).toBe('forms.transport_interruption.validation.api.general');
  });

  it('logs unexpected save failures', async () => {
    const { result } = renderHook(() => useTransportInterruptionForm(existing(), vi.fn()));
    vi.mocked(saveTransportInterruptionForm).mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(console.error).toHaveBeenCalledWith('Save failed', expect.any(Error));
  });
});
