// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';
import {
  confirmTechnicalCheckForm,
  publishTechnicalCheckForm,
  saveProceedingOutcome,
  saveTechnicalCheckForm,
} from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { TechnicalCheckForm } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const parts = [
    { code: 'CAA_10', name: 'Veose kinnitamine', classifierValueKey: 10, parentKey: null, isValid: true },
    { code: 'CAA_2', name: 'Piduri', classifierValueKey: 2, parentKey: null, isValid: true },
    { code: 'CAA_1', name: 'Rool', classifierValueKey: 1, parentKey: null, isValid: true },
    { code: 'CAA_OLD', name: 'Vana', classifierValueKey: 99, parentKey: null, isValid: false },
    { code: 'ABC', name: 'Tähed', classifierValueKey: 50, parentKey: null, isValid: true },
    { code: 'CAA_1_1', name: 'Rooli mängu', classifierValueKey: 11, parentKey: 1, isValid: true },
    { code: 'CAA_1_2', name: 'Rooli kate', classifierValueKey: 12, parentKey: 1, isValid: true },
  ];
  const violations = [
    { code: 'MSI203', isValid: true },
    { code: 'MSI302', isValid: true },
    { code: 'SI926', isValid: true },
    { code: 'OTHER', isValid: true },
    { code: 'VSI847', isValid: false },
  ];
  const ctx = {
    getByCode: (code: string) => (code === 'TECHNICAL_CHECK' ? parts : code === 'EU_INFRINGEMENT' ? violations : []),
    getChildren: (_code: string, key: number) => parts.filter((p) => p.parentKey === key),
  };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  confirmTechnicalCheckForm: vi.fn(),
  saveTechnicalCheckForm: vi.fn(),
  publishTechnicalCheckForm: vi.fn(),
  saveProceedingOutcome: vi.fn(),
}));

const existing = (over: Record<string, unknown> = {}) =>
  ({ id: '5', compoundFormKey: 9, status: 'saved', version: 2, ...over }) as unknown as TechnicalCheckForm;

const setup = (variant: 'vehicle' | 'trailer' = 'vehicle', form?: TechnicalCheckForm, onSaved = vi.fn(), onPublished?: () => void) => {
  const stable = form;
  return renderHook(() => useTechnicalCheckForm(variant, stable, onSaved, 3, onPublished));
};

const run = async (fn: () => unknown) => {
  await act(async () => {
    await fn();
  });
};

describe('useTechnicalCheckForm', () => {
  beforeEach(() => {
    vi.mocked(saveTechnicalCheckForm).mockReset().mockResolvedValue([{ id: '77' }] as never);
    vi.mocked(confirmTechnicalCheckForm).mockReset().mockResolvedValue([{ id: '78' }] as never);
    vi.mocked(publishTechnicalCheckForm).mockReset().mockResolvedValue(undefined as never);
    vi.mocked(saveProceedingOutcome).mockReset().mockResolvedValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('classifier derived data', () => {
    it('sorts the vehicle parts numerically and falls back to code order', () => {
      const { result } = setup('vehicle');
      expect(result.current.parts.map((p) => p.code)).toEqual(['ABC', 'CAA_1', 'CAA_2', 'CAA_10']);
      expect(result.current.euViolations.map((v) => v.code)).toEqual(['MSI203', 'MSI302', 'SI926']);
      expect(result.current.defectsByPartKey.get(1)?.map((c) => c.code)).toEqual(['CAA_1_1', 'CAA_1_2']);
      expect(result.current.formik.values.partsSummary).toHaveLength(4);
      expect(result.current.formik.values.compoundFormKey).toBe(3);
    });

    it('drops the excluded parts and violations for the trailer', () => {
      const { result } = setup('trailer');
      expect(result.current.parts.map((p) => p.code)).toEqual(['ABC', 'CAA_1', 'CAA_10']);
      expect(result.current.euViolations.map((v) => v.code)).toEqual(['MSI302']);
    });
  });

  describe('initial values', () => {
    it('decodes JSON strings and normalizes legacy part summaries', () => {
      const { result } = setup(
        'vehicle',
        existing({
          partsSummary: JSON.stringify([
            { partCode: 'A', status: 'checked' },
            { partCode: 'B', status: 'non_compliant' },
            { partCode: 'C', status: 'other' },
            { partCode: 'D', checked: true },
            { partCode: 'E', hasDefect: true },
          ]),
          partsDefects: '[{"partCode":"A","defectCode":"X","severity":"OV"}]',
          violations: '["MSI203"]',
        }),
      );
      const v = result.current.formik.values;
      expect(v.partsSummary).toEqual([
        { partCode: 'A', checked: true, hasDefect: false },
        { partCode: 'B', checked: true, hasDefect: true },
        { partCode: 'C', checked: false, hasDefect: false },
        { partCode: 'D', checked: true, hasDefect: false },
        { partCode: 'E', checked: false, hasDefect: true },
      ]);
      expect(v.partsDefects).toHaveLength(1);
      expect(v.violations).toEqual(['MSI203']);
    });

    it('accepts already decoded arrays and non-array values', () => {
      const { result } = setup(
        'vehicle',
        existing({ partsSummary: [{ partCode: 'A', checked: true, hasDefect: false }], partsDefects: null, violations: 'null' }),
      );
      expect(result.current.formik.values.partsDefects).toEqual([]);
      expect(result.current.formik.values.violations).toEqual([]);
      expect(result.current.formik.values.partsSummary).toHaveLength(1);
    });
  });

  describe('defect handling', () => {
    it('escalates to a driving ban for an EOV defect and writes note lines', async () => {
      const { result } = setup('vehicle', existing({ notes: 'oma tekst\nRool: vana rida' }));
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'CAA_1_1', severity: 'EOV' }]));
      const v = result.current.formik.values;
      expect(v.resultType).toBe('driving_ban');
      expect(v.violations).toEqual(['MSI302']);
      expect(v.partsDefects).toEqual([{ partCode: 'CAA_1', defectCode: 'CAA_1_1', severity: 'EOV' }]);
      expect(v.notes).toBe('oma tekst\nRool: Rooli mängu (EOV)');
      expect(result.current.isDrivingBanTriggerActive).toBe(true);
      expect(v.partsSummary.find((p) => p.partCode === 'CAA_1')).toEqual({ partCode: 'CAA_1', checked: true, hasDefect: true });
    });

    it('adds an entry to the summary when the part is missing and uses the code for unknown defects', async () => {
      const { result } = setup('vehicle', existing({ partsSummary: [] }));
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'NOPE', severity: 'OV' }]));
      expect(result.current.formik.values.partsSummary).toEqual([{ partCode: 'CAA_1', checked: true, hasDefect: true }]);
      expect(result.current.formik.values.resultType).toBe('extraordinary_inspection');
      expect(result.current.formik.values.notes).toContain('NOPE');
    });

    it('handles an unknown part code', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('UNKNOWN', [{ defectCode: 'D', severity: 'OV' }]));
      expect(result.current.formik.values.notes).toContain(': D');
    });

    it('ignores CAA_10 defects when scoring the result', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('CAA_10', [{ defectCode: 'X', severity: 'EOV' }]));
      expect(result.current.formik.values.resultType).toBe('ok');
      expect(result.current.isDrivingBanTriggerActive).toBe(false);
    });

    it('downgrades automatically when a defect is removed', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'CAA_1_1', severity: 'EOV' }]));
      await run(() => result.current.removeDefect('CAA_1', 'CAA_1_1'));
      const v = result.current.formik.values;
      expect(v.resultType).toBe('ok');
      expect(v.violations).toEqual([]);
      expect(v.partsDefects).toEqual([]);
      expect(v.partsSummary.find((p) => p.partCode === 'CAA_1')).toEqual({ partCode: 'CAA_1', checked: true, hasDefect: false });
    });

    it('keeps the technical-assistance inspection level when a defect drops from EOV to OV', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('CAA_1', [
        { defectCode: 'CAA_1_1', severity: 'OV' },
        { defectCode: 'CAA_1_2', severity: 'OV' },
      ]));
      await run(() => result.current.setResultType('extraordinary_inspection_ta'));
      await run(() => result.current.removeDefect('CAA_1', 'CAA_1_2'));
      expect(result.current.formik.values.resultType).toBe('extraordinary_inspection_ta');
    });

    it('downgrades from the matching level to the new automatic result and keeps higher manual choices', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('CAA_1', [
        { defectCode: 'CAA_1_1', severity: 'EOV' },
        { defectCode: 'CAA_1_2', severity: 'OV' },
      ]));
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'CAA_1_2', severity: 'OV' }]));
      expect(result.current.formik.values.resultType).toBe('extraordinary_inspection');
      expect(result.current.formik.values.violations).toEqual([]);
      // manual choice above the automatic level survives a lower automatic change
      await run(() => result.current.setResultType('driving_ban'));
      await run(() => result.current.applyPartDefects('CAA_1', []));
      expect(result.current.formik.values.resultType).toBe('driving_ban');
    });

    it('removes a defect from a part without a summary row', async () => {
      const { result } = setup('vehicle', existing({ partsSummary: [], partsDefects: [{ partCode: 'CAA_2', defectCode: 'Z', severity: 'OV' }] }));
      await run(() => result.current.removeDefect('CAA_2', 'Z'));
      expect(result.current.formik.values.partsSummary).toEqual([{ partCode: 'CAA_2', checked: true, hasDefect: false }]);
    });
  });

  describe('part checking', () => {
    it('adds, toggles and protects the checked flag', async () => {
      const { result } = setup('vehicle', existing({ partsSummary: [] }));
      await run(() => result.current.setPartChecked('CAA_1', true));
      expect(result.current.formik.values.partsSummary).toEqual([{ partCode: 'CAA_1', checked: true, hasDefect: false }]);
      await run(() => result.current.setPartChecked('CAA_1', false));
      expect(result.current.formik.values.partsSummary[0].checked).toBe(false);
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'CAA_1_1', severity: 'OV' }]));
      await run(() => result.current.setPartChecked('CAA_1', false));
      expect(result.current.formik.values.partsSummary[0].checked).toBe(true);
    });
  });

  describe('result type', () => {
    it('clears violations, proceeding and era flags when set to ok', async () => {
      const { result } = setup('vehicle', existing({ resultType: 'extraordinary_inspection_ta', violations: ['MSI203'], proceedingType: 'x', proceedingReferenceNumber: 'r', eraYvMntRegnr: true }));
      await run(() => result.current.setResultType('ok'));
      const v = result.current.formik.values;
      expect(v.violations).toEqual([]);
      expect(v.proceedingType).toBe('');
      expect(v.proceedingReferenceNumber).toBe('');
      expect(v.eraYvMntRegnr).toBe(false);
    });

    it('adds MSI302 once for a driving ban and removes it when leaving', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.setResultType('driving_ban'));
      expect(result.current.formik.values.violations).toEqual(['MSI302']);
      await run(() => result.current.setResultType('driving_ban'));
      expect(result.current.formik.values.violations).toEqual(['MSI302']);
      await run(() => result.current.setResultType('extraordinary_inspection'));
      expect(result.current.formik.values.violations).toEqual([]);
    });

    it('keeps the era flags for the technical-assistance inspection and ignores other non-ban changes', async () => {
      const { result } = setup('vehicle', existing({ eraYvMntRegnr: true }));
      await run(() => result.current.setResultType('extraordinary_inspection_ta'));
      expect(result.current.formik.values.eraYvMntRegnr).toBe(true);
      expect(result.current.formik.values.resultType).toBe('extraordinary_inspection_ta');
    });

    it('refuses to go below the automatic minimum', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.applyPartDefects('CAA_1', [{ defectCode: 'CAA_1_1', severity: 'EOV' }]));
      await run(() => result.current.setResultType('ok'));
      expect(result.current.formik.values.resultType).toBe('driving_ban');
    });

    it('toggles violations', async () => {
      const { result } = setup('vehicle');
      await run(() => result.current.toggleViolation('MSI203', true));
      expect(result.current.formik.values.violations).toEqual(['MSI203']);
      await run(() => result.current.toggleViolation('MSI203', false));
      expect(result.current.formik.values.violations).toEqual([]);
    });
  });

  describe('submitting', () => {
    const checked = [{ partCode: 'CAA_1', checked: true, hasDefect: false }];

    it('saves and reports the id', async () => {
      const onSaved = vi.fn();
      const { result } = setup('vehicle', existing({ partsSummary: checked, notes: 'a\nb' }), onSaved);
      result.current.compoundFormKeyOverride.current = 44;
      await run(() => result.current.formik.submitForm());
      const payload = vi.mocked(saveTechnicalCheckForm).mock.calls[0][1] as unknown as Record<string, unknown>;
      expect(payload.status).toBe('saved');
      expect(payload.notes).toBe('a b');
      expect(payload.compoundFormKey).toBe(44);
      expect(payload.partsSummary).toBe(JSON.stringify(checked));
      expect(onSaved).toHaveBeenCalledWith('77', false);
      expect(result.current.compoundFormKeyOverride.current).toBeUndefined();
    });

    it('re-confirms a confirmed form on a plain save', async () => {
      const { result } = setup('vehicle', existing({ status: 'confirmed', partsSummary: checked }));
      await run(() => result.current.formik.submitForm());
      expect((vi.mocked(saveTechnicalCheckForm).mock.calls[0][1] as unknown as Record<string, unknown>).status).toBe('confirmed');
    });

    it('confirms with the carrier notification flag', async () => {
      const onSaved = vi.fn();
      const { result } = setup('trailer', existing({ partsSummary: checked }), onSaved);
      await run(() => result.current.triggerConfirm(true));
      expect(confirmTechnicalCheckForm).toHaveBeenCalledWith('trailer', expect.objectContaining({ notifyCarrier: 'true' }));
      expect(onSaved).toHaveBeenCalledWith('78', true);
      await run(() => result.current.triggerConfirm());
      expect(confirmTechnicalCheckForm).toHaveBeenLastCalledWith('trailer', expect.objectContaining({ notifyCarrier: 'false' }));
    });

    it('publishes with the proceeding outcome for both variants', async () => {
      const onPublished = vi.fn();
      const base = { partsSummary: checked, proceedingType: 'x', proceedingReferenceNumber: 'R', enforcementDecision: 'D', proceedingClosureBasis: 'B' };
      const vehicle = setup('vehicle', existing(base), vi.fn(), onPublished);
      await run(() => vehicle.result.current.triggerPublish());
      expect(saveProceedingOutcome).toHaveBeenCalledWith('vehicle_technical', '5', 'D', 'B');
      expect(publishTechnicalCheckForm).toHaveBeenCalledWith('vehicle', '5');
      const trailer = setup('trailer', existing(base), vi.fn(), onPublished);
      await run(() => trailer.result.current.triggerPublish());
      expect(saveProceedingOutcome).toHaveBeenCalledWith('trailer_technical', '5', 'D', 'B');
      expect(onPublished).toHaveBeenCalledTimes(2);
    });

    it('publishes without an outcome when no proceeding exists', async () => {
      const { result } = setup('vehicle', existing({ partsSummary: checked }));
      await run(() => result.current.triggerPublish());
      expect(saveProceedingOutcome).not.toHaveBeenCalled();
      expect(publishTechnicalCheckForm).toHaveBeenCalled();
    });

    it('maps validation errors and logs unexpected failures', async () => {
      const { result } = setup('vehicle', existing({ partsSummary: checked }));
      vi.mocked(saveTechnicalCheckForm).mockRejectedValueOnce(
        new ApiError('bad', 422, { type: 'VALIDATION_ERROR', field: 'notes', code: 'tooLong' }),
      );
      await run(() => result.current.formik.submitForm());
      await waitFor(() => expect(result.current.formik.errors.notes).toBe('forms.technical_check.validation.api.tooLong'));
      vi.mocked(saveTechnicalCheckForm).mockRejectedValueOnce(new ApiError('bad', 422, { type: 'VALIDATION_ERROR', code: 'general' }));
      await run(() => result.current.formik.submitForm());
      expect(result.current.formError).toBe('forms.technical_check.validation.api.general');
      vi.mocked(saveTechnicalCheckForm).mockRejectedValueOnce(new Error('boom'));
      await run(() => result.current.formik.submitForm());
      expect(console.error).toHaveBeenCalled();
      await run(() => result.current.setFormError(null));
    });
  });
});
