import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { ClassifierEntry } from '../../../classifiers/types';
import type {
  TechnicalCheckForm,
  TechnicalCheckVariant,
  PartSummaryEntry,
  PartDefectEntry,
  PartSeverity,
} from '../../types';
import { confirmTechnicalCheckForm, saveTechnicalCheckForm, publishTechnicalCheckForm } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';

/** Parts excluded from the trailer variant (LJVIS2-72 §0/§4). */
const TRAILER_EXCLUDED_PARTS = ['CAA_2', 'CAA_3', 'CAA_7', 'CAA_9'];
/** EU_INFRINGEMENT codes not applicable to the trailer variant. */
const TRAILER_EXCLUDED_VIOLATIONS = ['MSI203', 'MSI204', 'VSI847', 'SI926'];
/** The 5 EU_INFRINGEMENT codes shown on the vehicle variant (all of them). */
const VEHICLE_VIOLATION_CODES = ['MSI203', 'MSI204', 'MSI302', 'VSI847', 'SI926'];
const DRIVING_BAN_VIOLATION_CODE = 'MSI302';

const resultLevel = (resultType: string): number => {
  switch (resultType) {
    case 'driving_ban':
      return 2;
    case 'extraordinary_inspection':
    case 'extraordinary_inspection_ta':
      return 1;
    default:
      return 0;
  }
};

const computeAutoResult = (defects: PartDefectEntry[]): 'ok' | 'extraordinary_inspection' | 'driving_ban' => {
  if (defects.some((d) => d.severity === 'EOV')) return 'driving_ban';
  if (defects.some((d) => d.severity === 'OV')) return 'extraordinary_inspection';
  return 'ok';
};

export function createTechnicalCheckValidationSchema(
  t: (key: string) => string,
) {
  return Yup.object({
    proceedingReferenceNumber: Yup.string().when('proceedingType', {
      is: (proceedingType: string) => !!proceedingType,
      then: (schema) => schema.required(t('forms.technical_check.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    notes: Yup.string().max(2000, t('forms.technical_check.validation.notesMaxLength')),
    partsSummary: Yup.array().test(
      'at-least-one-checked',
      t('forms.technical_check.validation.checkError'),
      function (value) {
        const resultType: string = (this.parent as { resultType?: string }).resultType ?? 'ok';
        if (resultType !== 'ok') return true;
        return (value ?? []).some(
          (p: { status: string }) => p.status === 'checked' || p.status === 'non_compliant',
        );
      },
    ),
  });
}

export function useTechnicalCheckForm(
  variant: TechnicalCheckVariant,
  form: TechnicalCheckForm | undefined,
  onSaved: (id?: string) => void,
  compoundFormKey?: number,
  isEditLocked = false,
  onPublished?: () => void,
) {
  const { t } = useTranslation();
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);
  const compoundFormKeyOverride = useRef<number | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode, getChildren } = useClassifiers();

  const allParts = useMemo(() => getByCode('TECHNICAL_CHECK').filter((c) => c.isValid !== false), [getByCode]);

  const parts: ClassifierEntry[] = useMemo(() => {
    const level1 = allParts
      .filter((p) => p.parentKey === null)
      .sort((a, b) => {
        const numA = parseInt(a.code.replace(/^\D+/, ''), 10);
        const numB = parseInt(b.code.replace(/^\D+/, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.code.localeCompare(b.code);
      });
    return variant === 'trailer'
      ? level1.filter((p) => !TRAILER_EXCLUDED_PARTS.includes(p.code))
      : level1;
  }, [allParts, variant]);

  const defectsByPartKey = useMemo(() => {
    const map = new Map<number, ClassifierEntry[]>();
    parts.forEach((part) => {
      const children = [...getChildren('TECHNICAL_CHECK', part.classifierValueKey)].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }),
      );
      map.set(part.classifierValueKey, children);
    });
    return map;
  }, [parts, getChildren]);

  const euViolations = useMemo(() => {
    const all = getByCode('EU_INFRINGEMENT').filter((v) =>
      v.isValid !== false && VEHICLE_VIOLATION_CODES.includes(v.code),
    );
    return variant === 'trailer'
      ? all.filter((v) => !TRAILER_EXCLUDED_VIOLATIONS.includes(v.code))
      : all;
  }, [getByCode, variant]);

  const validationSchema = createTechnicalCheckValidationSchema(t);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      compoundFormKey: form?.compoundFormKey ?? compoundFormKey,
      subFormNumber: form?.subFormNumber ?? '',
      version: form?.version ?? 1,
      status: form?.status ?? 'saved',
      partsSummary: (() => {
        const raw = form?.partsSummary;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (Array.isArray(parsed) ? parsed : parts.map((p) => ({ partCode: p.code, status: 'not_checked' }))) as PartSummaryEntry[];
      })(),
      partsDefects: (() => {
        const raw = form?.partsDefects;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (Array.isArray(parsed) ? parsed : []) as PartDefectEntry[];
      })(),
      resultType: form?.resultType ?? 'ok',
      resultTransportInterruption: form?.resultTransportInterruption ?? false,
      eraYvMntRegnr: form?.eraYvMntRegnr ?? false,
      eraYvMntVintin: form?.eraYvMntVintin ?? false,
      eraYvMntAxles: form?.eraYvMntAxles ?? false,
      eraYvMntPlaces: form?.eraYvMntPlaces ?? false,
      eraYvMntRebuilt: form?.eraYvMntRebuilt ?? false,
      proceedingType: form?.proceedingType ?? '',
      proceedingReferenceNumber: form?.proceedingReferenceNumber ?? '',
      violations: (() => {
        const raw = form?.violations;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (Array.isArray(parsed) ? parsed : []) as string[];
      })(),
      notes: form?.notes ?? '',
      extraordinaryInspectionDate: form?.extraordinaryInspectionDate ?? '',
      enforcementDecision: form?.enforcementDecision ?? '',
      proceedingClosureBasis: form?.proceedingClosureBasis ?? '',
      trailerRegNr: form?.trailerRegNr ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const isConfirming = pendingConfirm.current;
        const isPublishing = pendingPublish.current;
        pendingConfirm.current = false;
        pendingPublish.current = false;
        if (isPublishing && form?.id) {
          await publishTechnicalCheckForm(variant, form.id);
          onPublished?.();
          return;
        }
        const isReconfirmedEdit = !isConfirming && form?.status === 'confirmed';
        const nextStatus = isConfirming || isReconfirmedEdit ? 'confirmed' : 'saved';
        const payload = {
          ...values,
          status: nextStatus,
          id: form?.id ?? '',
          compoundFormKey: compoundFormKeyOverride.current ?? values.compoundFormKey,
          partsSummary: JSON.stringify(values.partsSummary ?? []),
          partsDefects: JSON.stringify(values.partsDefects ?? []),
          violations: JSON.stringify(values.violations ?? []),
        } as unknown as TechnicalCheckForm;
        compoundFormKeyOverride.current = undefined;
        const result = isConfirming
          ? await confirmTechnicalCheckForm(variant, payload)
          : await saveTechnicalCheckForm(variant, payload);
        onSaved((result[0] as { id?: string })?.id);
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`forms.technical_check.validation.api.${code}`),
          setFormError,
        );
        if (!handled) {
          console.error('Save failed', e);
        }
      }
    },
  });

  const triggerConfirm = () => {
    pendingConfirm.current = true;
    return formik.submitForm();
  };

  const triggerPublish = () => {
    pendingPublish.current = true;
    return formik.submitForm();
  };

  /** Pure: given the current form values and the defect change, returns the
   * result-type / violations updates (auto-escalation / -downgrade, auto MSI302
   * on driving_ban). Returned as a partial so callers can fold it into ONE
   * atomic setValues — multiple sequential formik.setFieldValue calls clobber
   * each other (each reads the same stale values snapshot), which is why the
   * defect/summary updates were being lost. */
  const computeResultChanges = (
    values: typeof formik.values,
    previousDefects: PartDefectEntry[],
    newDefects: PartDefectEntry[],
  ): { resultType?: string; violations?: string[] } => {
    const changes: { resultType?: string; violations?: string[] } = {};
    const oldAutoLevel = resultLevel(computeAutoResult(previousDefects));
    const autoResult = computeAutoResult(newDefects);
    const autoLevel = resultLevel(autoResult);
    const currentLevel = resultLevel(values.resultType);
    const wasTa = values.resultType === 'extraordinary_inspection_ta';

    if (currentLevel < autoLevel || values.resultType === 'ok') {
      changes.resultType = autoResult;
    } else if (autoLevel < oldAutoLevel && currentLevel === oldAutoLevel) {
      changes.resultType = wasTa && autoLevel >= 1 ? 'extraordinary_inspection_ta' : autoResult;
    }

    const currentViolations = values.violations ?? [];
    if (autoResult === 'driving_ban' && !currentViolations.includes(DRIVING_BAN_VIOLATION_CODE)) {
      changes.violations = [...currentViolations, DRIVING_BAN_VIOLATION_CODE];
    }
    return changes;
  };

  /** Applies the outcome of the "Ei vasta nõuetele" defect-selection modal for one part. */
  const applyPartDefects = (partCode: string, selected: { defectCode: string; severity: PartSeverity }[]) => {
    const v = formik.values;
    const previousDefects = v.partsDefects ?? [];
    const otherDefects = previousDefects.filter((d) => d.partCode !== partCode);
    const newDefects: PartDefectEntry[] = [
      ...otherDefects,
      ...selected.map((s) => ({ partCode, defectCode: s.defectCode, severity: s.severity })),
    ];

    const prevSummary = v.partsSummary ?? [];
    const summary = prevSummary.some((p) => p.partCode === partCode)
      ? prevSummary.map((p) =>
          p.partCode === partCode ? { ...p, status: 'non_compliant' as const } : p,
        )
      : [...prevSummary, { partCode, status: 'non_compliant' as const }];

    // Append a note line per newly selected defect (defect removal does not remove the note — LJVIS2-72 §4).
    let notes = v.notes ?? '';
    if (selected.length > 0) {
      const defectNames = defectsByPartKey.get(
        parts.find((p) => p.code === partCode)?.classifierValueKey ?? -1,
      ) ?? [];
      const noteLines = selected.map((s) => {
        const defect = defectNames.find((d) => d.code === s.defectCode);
        return `${defect?.name ?? s.defectCode} – ${s.severity}`;
      });
      notes = [notes, ...noteLines].filter(Boolean).join('\n').slice(0, 2000);
    }

    // Single atomic update — see computeResultChanges note.
    formik.setValues({
      ...v,
      partsDefects: newDefects,
      partsSummary: summary,
      notes,
      ...computeResultChanges(v, previousDefects, newDefects),
    });
  };

  const setPartStatus = (partCode: string, status: PartSummaryEntry['status']) => {
    const v = formik.values;
    const prevSummary = v.partsSummary ?? [];
    const summary = prevSummary.some((p) => p.partCode === partCode)
      ? prevSummary.map((p) => (p.partCode === partCode ? { ...p, status } : p))
      : [...prevSummary, { partCode, status }];

    // 'non_compliant' normally arrives via the modal flow (applyPartDefects);
    // if it is set directly, only the summary status changes — defects and the
    // auto-derived result are left to the modal.
    if (status === 'non_compliant') {
      formik.setValues({ ...v, partsSummary: summary });
      return;
    }
    const previousDefects = v.partsDefects ?? [];
    const newDefects = previousDefects.filter((d) => d.partCode !== partCode);
    formik.setValues({
      ...v,
      partsSummary: summary,
      partsDefects: newDefects,
      ...computeResultChanges(v, previousDefects, newDefects),
    });
  };

  /** Removes a single defect from the results table (LJVIS2-72 §4, UC-11/UC-12).
   * Does NOT remove the corresponding auto-generated "Märkused" line. If the part
   * has no remaining defects afterwards, its summary status reverts to "checked". */
  const removeDefect = (partCode: string, defectCode: string) => {
    const v = formik.values;
    const previousDefects = v.partsDefects ?? [];
    const newDefects = previousDefects.filter(
      (d) => !(d.partCode === partCode && d.defectCode === defectCode),
    );
    const partHasRemainingDefects = newDefects.some((d) => d.partCode === partCode);
    const summary = partHasRemainingDefects
      ? v.partsSummary ?? []
      : (v.partsSummary ?? []).map((p) =>
          p.partCode === partCode ? { ...p, status: 'checked' as const } : p,
        );

    formik.setValues({
      ...v,
      partsDefects: newDefects,
      partsSummary: summary,
      ...computeResultChanges(v, previousDefects, newDefects),
    });
  };

  const setResultType = (resultType: string) => {
    const autoLevel = resultLevel(computeAutoResult(formik.values.partsDefects ?? []));
    if (resultLevel(resultType) < autoLevel) return; // may not downgrade below the auto-computed minimum
    formik.setFieldValue('resultType', resultType);
    if (resultType !== 'extraordinary_inspection_ta') {
      formik.setFieldValue('eraYvMntRegnr', false);
      formik.setFieldValue('eraYvMntVintin', false);
      formik.setFieldValue('eraYvMntAxles', false);
      formik.setFieldValue('eraYvMntPlaces', false);
      formik.setFieldValue('eraYvMntRebuilt', false);
    }
    if (resultType === 'ok') {
      formik.setFieldValue('violations', []);
      formik.setFieldValue('proceedingType', '');
      formik.setFieldValue('proceedingReferenceNumber', '');
    }
    if (resultType === 'driving_ban') {
      const currentViolations = formik.values.violations ?? [];
      if (!currentViolations.includes(DRIVING_BAN_VIOLATION_CODE)) {
        formik.setFieldValue('violations', [...currentViolations, DRIVING_BAN_VIOLATION_CODE]);
      }
    }
  };

  const isDrivingBanTriggerActive = resultLevel(computeAutoResult(formik.values.partsDefects ?? [])) >= 2;

  const toggleViolation = (code: string, checked: boolean) => {
    // MSI302 cannot be unchecked by a regular user while an EOV defect forces
    // driving_ban. An administrator (control_form.edit_locked) may override
    // this regardless of form status — LJVIS2-72 §4, UC-13.
    if (
      code === DRIVING_BAN_VIOLATION_CODE &&
      !checked &&
      isDrivingBanTriggerActive &&
      !isEditLocked
    ) {
      return;
    }
    const current = formik.values.violations ?? [];
    formik.setFieldValue(
      'violations',
      checked ? [...current, code] : current.filter((c) => c !== code),
    );
  };

  return {
    formik,
    parts,
    defectsByPartKey,
    euViolations,
    applyPartDefects,
    setPartStatus,
    removeDefect,
    setResultType,
    toggleViolation,
    isDrivingBanTriggerActive,
    triggerConfirm,
    triggerPublish,
    formError,
    setFormError,
    compoundFormKeyOverride,
  };
}
