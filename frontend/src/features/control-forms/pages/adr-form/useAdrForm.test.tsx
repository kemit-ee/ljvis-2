// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdrValidationSchema, serializeAdrFormPayload, useAdrForm } from './useAdrForm';
import { confirmAdrForm, publishAdrForm, saveAdrForm, saveProceedingOutcome } from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { AdrForm } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o?.index ? `${key}#${o.index}` : key) }),
}));
vi.mock('../../../classifiers/ClassifierProvider.tsx', () => {
  const rows = [
    { classifierValueKey: 1, name: 'Harju', parentKey: null, isValid: true, code: 'H' },
    { classifierValueKey: 2, name: 'Vana', parentKey: null, isValid: false, code: 'V' },
    { classifierValueKey: 3, name: 'Tallinn', parentKey: 1, isValid: true, code: 'T' },
  ];
  const checkpoints = [
    { code: 'CP1', name: 'Veodokumendid', parentKey: null },
    { code: 'CP1_SUB', name: 'Alam', parentKey: 7 },
  ];
  const ctx = { getByCode: (code: string) => (code === 'EHAK' ? rows : code === 'ADR_CONTROL_CHECKPOINT' ? checkpoints : []) };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  confirmAdrForm: vi.fn(),
  saveAdrForm: vi.fn(),
  publishAdrForm: vi.fn(),
  saveProceedingOutcome: vi.fn(),
}));

const t = (key: string) => key;
const record = (over = {}) => ({
  riskCategory: '', adrReference: '', responsibleParticipants: [] as string[],
  reg2016403Code: null, reg2016403Severity: null, notes: '', ...over,
});

const existing = (over: Partial<AdrForm> = {}) => ({ id: '4', compoundFormKey: 9, status: 'saved', version: 3, ...over }) as unknown as AdrForm;

describe('serializeAdrFormPayload', () => {
  it('serializes objects, drops blank ones and filters untouched checkpoints', () => {
    const out = serializeAdrFormPayload({
      driverAssistant: { name: 'A' },
      lastLoadAddress: { city: '', street: null },
      nextLoadAddress: undefined,
      dangerousGoods: undefined,
      containerTypes: ['x'],
      infringements: [{ checkpointCode: 'a', inspectionStatus: 'ok', records: [] }, { checkpointCode: 'b', inspectionStatus: '', records: [] }],
      otherInfringements: [
        { title: 'T', inspectionStatus: '', records: [] },
        { title: '', inspectionStatus: 'x', records: [] },
        { title: '', inspectionStatus: '', records: [record()] },
        { title: '', inspectionStatus: '', records: [] },
      ],
      correctiveMeasures: undefined,
    } as unknown as AdrForm) as unknown as Record<string, string>;
    expect(out.driverAssistant).toBe('{"name":"A"}');
    expect(out.lastLoadAddress).toBe('');
    expect(out.nextLoadAddress).toBe('');
    expect(out.dangerousGoods).toBe('[]');
    expect(out.containerTypes).toBe('["x"]');
    expect(JSON.parse(out.infringements)).toHaveLength(1);
    expect(JSON.parse(out.otherInfringements)).toHaveLength(3);
    expect(out.correctiveMeasures).toBe('[]');
  });

  it('copes with every list being absent', () => {
    const out = serializeAdrFormPayload({ lastLoadAddress: { city: 'T' }, nextLoadAddress: { city: 'U' } } as unknown as AdrForm) as unknown as Record<string, string>;
    expect(out.infringements).toBe('[]');
    expect(out.otherInfringements).toBe('[]');
    expect(out.lastLoadAddress).toBe('{"city":"T"}');
    expect(out.nextLoadAddress).toBe('{"city":"U"}');
  });
});

describe('createAdrValidationSchema', () => {
  const schema = createAdrValidationSchema(t);

  it('requires the reference number only with a proceeding type', async () => {
    expect(await schema.isValid({ proceedingType: '', proceedingReferenceNumber: '' })).toBe(true);
    expect(await schema.isValid({ proceedingType: 'x', proceedingReferenceNumber: '' })).toBe(false);
    expect(await schema.isValid({ proceedingType: 'x', proceedingReferenceNumber: '1' })).toBe(true);
  });

  it('requires the exemption provision only when an exemption is applied', async () => {
    expect(await schema.isValid({ exemptionApplied: false })).toBe(true);
    expect(await schema.isValid({ exemptionApplied: true, exemptionAdrProvision: '' })).toBe(false);
    expect(await schema.isValid({ exemptionApplied: true, exemptionAdrProvision: '1.1' })).toBe(true);
  });

  it('rejects quantities with a trailing separator and overlong notes', async () => {
    expect(await schema.isValid({ dangerousGoods: [{ quantity: '12,' }] })).toBe(false);
    expect(await schema.isValid({ dangerousGoods: [{ quantity: '12.5' }, { quantity: '' }] })).toBe(true);
    expect(await schema.isValid({ notes: 'x'.repeat(4001) })).toBe(false);
  });
});

describe('useAdrForm', () => {
  beforeEach(() => {
    vi.mocked(saveAdrForm).mockReset().mockResolvedValue([{ id: '99' }] as never);
    vi.mocked(confirmAdrForm).mockReset().mockResolvedValue([{ id: '98' }] as never);
    vi.mocked(publishAdrForm).mockReset().mockResolvedValue(undefined as never);
    vi.mocked(saveProceedingOutcome).mockReset().mockResolvedValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('builds defaults and the county list from valid top-level classifier values', () => {
    const { result } = renderHook(() => useAdrForm(undefined, vi.fn(), 12));
    expect(result.current.counties).toEqual([{ id: 1, name: 'Harju' }]);
    const v = result.current.formik.values;
    expect(v.compoundFormKey).toBe(12);
    expect(v.resultType).toBe('ok');
    expect(v.dangerousGoods).toEqual([]);
    expect(v.driverAssistant).toEqual({});
  });

  it('decodes JSON-encoded columns and tolerates garbage', () => {
    const { result } = renderHook(() =>
      useAdrForm(
        existing({
          driverAssistant: '{"name":"A"}' as never,
          lastLoadAddress: '[1]' as never,
          nextLoadAddress: '{oops' as never,
          dangerousGoods: '[{"unNumber":"1"}]' as never,
          containerTypes: '{"a":1}' as never,
          infringements: '[oops' as never,
          otherInfringements: 'null' as never,
          correctiveMeasures: ['m'] as never,
        }),
        vi.fn(),
      ),
    );
    const v = result.current.formik.values;
    expect(v.driverAssistant).toEqual({ name: 'A' });
    expect(v.lastLoadAddress).toEqual([1]);
    expect(v.nextLoadAddress).toEqual({});
    expect(v.dangerousGoods).toEqual([{ unNumber: '1' }]);
    expect(v.containerTypes).toEqual([]);
    expect(v.infringements).toEqual([]);
    expect(v.otherInfringements).toEqual([]);
    expect(v.correctiveMeasures).toEqual(['m']);
  });

  it('manages dangerous goods, measures and container types', async () => {
    const { result } = renderHook(() => useAdrForm(existing(), vi.fn()));
    await act(async () => {
      await result.current.addDangerousGood();
    });
    await waitFor(() => expect(result.current.formik.values.dangerousGoods).toHaveLength(1));
    await act(async () => {
      await result.current.addDangerousGood();
    });
    await waitFor(() => expect(result.current.formik.values.dangerousGoods).toHaveLength(2));
    await act(async () => {
      await result.current.updateDangerousGood(1, { unNumber: '1203' });
    });
    await waitFor(() => expect(result.current.formik.values.dangerousGoods[1].unNumber).toBe('1203'));
    expect(result.current.formik.values.dangerousGoods[0].unNumber).toBe('');
    await act(async () => {
      await result.current.removeDangerousGood(0);
    });
    await waitFor(() => expect(result.current.formik.values.dangerousGoods).toHaveLength(1));

    await act(async () => {
      await result.current.toggleCorrectiveMeasure('a', true);
    });
    await waitFor(() => expect(result.current.formik.values.correctiveMeasures).toEqual(['a']));
    await act(async () => {
      await result.current.toggleCorrectiveMeasure('a', false);
    });
    await waitFor(() => expect(result.current.formik.values.correctiveMeasures).toEqual([]));
    await act(async () => {
      await result.current.toggleContainerType('c', true);
    });
    await waitFor(() => expect(result.current.formik.values.containerTypes).toEqual(['c']));
    await act(async () => {
      await result.current.toggleContainerType('c', false);
    });
    await waitFor(() => expect(result.current.formik.values.containerTypes).toEqual([]));
  });

  it('sets driver assistant and addresses', async () => {
    const stable = existing();
    const { result } = renderHook(() => useAdrForm(stable, vi.fn()));
    await act(async () => {
      await result.current.setDriverAssistant({ name: 'X' } as never);
    });
    await act(async () => {
      await result.current.setLastLoadAddress({ city: 'L' } as never);
    });
    await act(async () => {
      await result.current.setNextLoadAddress({ city: 'N' } as never);
    });
    await waitFor(() => expect(result.current.formik.values.nextLoadAddress).toEqual({ city: 'N' }));
    expect(result.current.formik.values.driverAssistant).toEqual({ name: 'X' });
    expect(result.current.formik.values.lastLoadAddress).toEqual({ city: 'L' });
  });

  it('manages checkpoint entries and their records', async () => {
    const { result } = renderHook(() => useAdrForm(existing(), vi.fn()));
    expect(result.current.getCheckpoint('CP1')).toEqual({ checkpointCode: 'CP1', inspectionStatus: '', infringementDetected: false, records: [] });
    await act(async () => {
      await result.current.setCheckpoint('CP1', { inspectionStatus: 'ok' as never });
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').inspectionStatus).toBe('ok'));
    await act(async () => {
      await result.current.setCheckpoint('CP1', { infringementDetected: true });
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').infringementDetected).toBe(true));
    await act(async () => {
      await result.current.addRecord('CP1');
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').records).toHaveLength(1));
    await act(async () => {
      await result.current.updateRecord('CP1', 0, { notes: 'märge', responsibleParticipants: ['C'], reg2016403Code: 'X' as never });
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').records[0].notes).toBe('märge'));
    expect(result.current.getCheckpoint('CP1').records[0].reg2016403Code).toBe('X');
    await act(async () => {
      await result.current.updateRecord('CP1', 0, { responsibleParticipants: [] });
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').records[0].reg2016403Code).toBeNull());
    await act(async () => {
      await result.current.addRecord('CP1');
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').records).toHaveLength(2));
    await act(async () => {
      await result.current.removeRecord('CP1', 0);
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP1').records).toHaveLength(1));
    await act(async () => {
      await result.current.addRecord('CP2');
    });
    await waitFor(() => expect(result.current.getCheckpoint('CP2').records).toHaveLength(1));
  });

  it('manages other infringements and their records', async () => {
    const { result } = renderHook(() => useAdrForm(existing(), vi.fn()));
    await act(async () => {
      await result.current.addOtherInfringement();
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements).toHaveLength(1));
    await act(async () => {
      await result.current.updateOtherInfringement(0, { title: 'Muu' });
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements[0].title).toBe('Muu'));
    await act(async () => {
      await result.current.addOtherRecord(0);
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements[0].records).toHaveLength(1));
    await act(async () => {
      await result.current.updateOtherRecord(0, 0, { notes: 'n' });
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements[0].records[0].notes).toBe('n'));
    await act(async () => {
      await result.current.addOtherRecord(0);
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements[0].records).toHaveLength(2));
    await act(async () => {
      await result.current.removeOtherRecord(0, 1);
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements[0].records).toHaveLength(1));
    await act(async () => {
      await result.current.addOtherRecord(5);
    });
    expect(result.current.formik.values.otherInfringements).toHaveLength(1);
    await act(async () => {
      await result.current.addOtherInfringement();
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements).toHaveLength(2));
    await act(async () => {
      await result.current.removeOtherInfringement(0);
    });
    await waitFor(() => expect(result.current.formik.values.otherInfringements).toHaveLength(1));
  });

  it('saves with serialized payload and a composed notes summary', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useAdrForm(
        existing({
          notes: 'a\nb',
          lastLoadAddress: { city: 'Tln' } as never,
          infringements: [
            { checkpointCode: 'CP1', inspectionStatus: 'ok', records: [record({ notes: 'esimene' })] },
            { checkpointCode: 'UNKNOWN', inspectionStatus: 'ok', records: [record({ notes: 'teine' })] },
            { checkpointCode: 'EMPTY', inspectionStatus: '', records: [] },
          ] as never,
          otherInfringements: [
            { title: 'Oma', inspectionStatus: 'x', records: [record({ notes: 'kolmas' })] },
            { title: ' ', inspectionStatus: 'x', records: [record({ notes: 'neljas' })] },
          ] as never,
        }),
        onSaved,
      ),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const payload = vi.mocked(saveAdrForm).mock.calls[0][0] as unknown as Record<string, string>;
    expect(payload.status).toBe('saved');
    expect(payload.notes).toBe('a b');
    expect(payload.driverAssistant).toBe('');
    expect(payload.lastLoadAddress).toBe('{"city":"Tln"}');
    expect(payload.infringementNotesSummary).toBe(
      'Veodokumendid, Rikkumine 1: esimene; UNKNOWN, Rikkumine 1: teine; Oma, Rikkumine 1: kolmas; forms.adr.otherInfringements.fallbackLabel#2, Rikkumine 1: neljas',
    );
    expect(JSON.parse(payload.infringements)).toHaveLength(2);
    expect(onSaved).toHaveBeenCalledWith('99', false);
  });

  it('keeps a confirmed form confirmed and applies the compound key override', async () => {
    const { result } = renderHook(() => useAdrForm(existing({ status: 'confirmed' }), vi.fn()));
    result.current.pendingCompoundFormKey.current = 77;
    await act(async () => {
      await result.current.formik.submitForm();
    });
    const payload = vi.mocked(saveAdrForm).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(payload.status).toBe('confirmed');
    expect(payload.compoundFormKey).toBe(77);
  });

  it('confirms through the confirm endpoint', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useAdrForm(existing(), onSaved));
    await act(async () => {
      await result.current.triggerConfirm();
    });
    expect(confirmAdrForm).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith('98', true);
  });

  it('publishes, saving the proceeding outcome first when there is a proceeding', async () => {
    const onPublished = vi.fn();
    const { result } = renderHook(() =>
      useAdrForm(existing({ proceedingType: 'misdemeanor', proceedingReferenceNumber: 'R1', enforcementDecision: 'D', proceedingClosureBasis: 'B' }), vi.fn(), undefined, onPublished),
    );
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(saveProceedingOutcome).toHaveBeenCalledWith('adr', '4', 'D', 'B');
    expect(publishAdrForm).toHaveBeenCalledWith('4');
    expect(onPublished).toHaveBeenCalled();
  });

  it('publishes without an outcome call when there is no proceeding', async () => {
    const { result } = renderHook(() => useAdrForm(existing(), vi.fn()));
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(saveProceedingOutcome).not.toHaveBeenCalled();
    expect(publishAdrForm).toHaveBeenCalledWith('4');
  });

  it('maps validation errors and logs other failures', async () => {
    const { result } = renderHook(() => useAdrForm(existing(), vi.fn()));
    vi.mocked(saveAdrForm).mockRejectedValueOnce(
      new ApiError('bad', 422, { type: 'VALIDATION_ERROR', field: 'notes', code: 'tooLong' }),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.notes).toBe('forms.adr.validation.api.tooLong');
    vi.mocked(saveAdrForm).mockRejectedValueOnce(new ApiError('bad', 422, { type: 'VALIDATION_ERROR', code: 'general' }));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formError).toBe('forms.adr.validation.api.general');
    vi.mocked(saveAdrForm).mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(console.error).toHaveBeenCalled();
  });
});
