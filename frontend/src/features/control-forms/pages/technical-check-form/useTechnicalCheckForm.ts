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
import { confirmTechnicalCheckForm, saveTechnicalCheckForm } from '../../api';
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
  });
}

export function useTechnicalCheckForm(
  variant: TechnicalCheckVariant,
  form: TechnicalCheckForm | undefined,
  onSaved: (id?: string) => void,
  compoundFormKey?: number,
  isEditLocked = false,
) {
  const { t } = useTranslation();
  const pendingConfirm = useRef(false);
  const compoundFormKeyOverride = useRef<number | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode, getChildren } = useClassifiers();

  const allParts = useMemo(() => getByCode('TECHNICAL_CHECK'), [getByCode]);

  const parts: ClassifierEntry[] = useMemo(() => {
    const level1 = allParts
      .filter((p) => p.parentKey === null)
      .sort((a, b) => a.code.localeCompare(b.code));
    return variant === 'trailer'
      ? level1.filter((p) => !TRAILER_EXCLUDED_PARTS.includes(p.code))
      : level1;
  }, [allParts, variant]);

  const defectsByPartKey = useMemo(() => {
    const map = new Map<number, ClassifierEntry[]>();
    parts.forEach((part) => {
      map.set(part.classifierValueKey, getChildren('TECHNICAL_CHECK', part.classifierValueKey));
    });
    return map;
  }, [parts, getChildren]);

  const euViolations = useMemo(() => {
    const all = getByCode('EU_INFRINGEMENT').filter((v) =>
      VEHICLE_VIOLATION_CODES.includes(v.code),
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
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const isConfirming = pendingConfirm.current;
        pendingConfirm.current = false;
        const payload = {
          ...values,
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

  /** Applies the outcome of the "Ei vasta nõuetele" defect-selection modal for one part. */
  const applyPartDefects = (partCode: string, selected: { defectCode: string; severity: PartSeverity }[]) => {
    const previousDefects = formik.values.partsDefects ?? [];
    const otherDefects = previousDefects.filter((d) => d.partCode !== partCode);
    const newDefects: PartDefectEntry[] = [
      ...otherDefects,
      ...selected.map((s) => ({ partCode, defectCode: s.defectCode, severity: s.severity })),
    ];
    formik.setFieldValue('partsDefects', newDefects);

    const summary = (formik.values.partsSummary ?? []).map((p) =>
      p.partCode === partCode ? { ...p, status: 'non_compliant' as const } : p,
    );
    formik.setFieldValue('partsSummary', summary);

    // Append a note line per newly selected defect (defect removal does not remove the note — LJVIS2-72 §4).
    if (selected.length > 0) {
      const defectNames = defectsByPartKey.get(
        parts.find((p) => p.code === partCode)?.classifierValueKey ?? -1,
      ) ?? [];
      const noteLines = selected.map((s) => {
        const defect = defectNames.find((d) => d.code === s.defectCode);
        return `${defect?.name ?? s.defectCode} – ${s.severity}`;
      });
      const prevNotes = formik.values.notes ?? '';
      const combined = [prevNotes, ...noteLines].filter(Boolean).join('\n').slice(0, 2000);
      formik.setFieldValue('notes', combined);
    }

    recomputeResult(previousDefects, newDefects);
  };

  const setPartStatus = (partCode: string, status: PartSummaryEntry['status']) => {
    const summary = (formik.values.partsSummary ?? []).map((p) =>
      p.partCode === partCode ? { ...p, status } : p,
    );
    formik.setFieldValue('partsSummary', summary);
    if (status !== 'non_compliant') {
      const previousDefects = formik.values.partsDefects ?? [];
      const newDefects = previousDefects.filter((d) => d.partCode !== partCode);
      formik.setFieldValue('partsDefects', newDefects);
      recomputeResult(previousDefects, newDefects);
    }
  };

  /** Removes a single defect from the results table (LJVIS2-72 §4, UC-11/UC-12).
   * Does NOT remove the corresponding auto-generated "Märkused" line. If the part
   * has no remaining defects afterwards, its summary status reverts to "checked". */
  const removeDefect = (partCode: string, defectCode: string) => {
    const previousDefects = formik.values.partsDefects ?? [];
    const newDefects = previousDefects.filter(
      (d) => !(d.partCode === partCode && d.defectCode === defectCode),
    );
    formik.setFieldValue('partsDefects', newDefects);

    const partHasRemainingDefects = newDefects.some((d) => d.partCode === partCode);
    if (!partHasRemainingDefects) {
      const summary = (formik.values.partsSummary ?? []).map((p) =>
        p.partCode === partCode ? { ...p, status: 'checked' as const } : p,
      );
      formik.setFieldValue('partsSummary', summary);
    }

    recomputeResult(previousDefects, newDefects);
  };

  const recomputeResult = (previousDefects: PartDefectEntry[], newDefects: PartDefectEntry[]) => {
    const oldAutoLevel = resultLevel(computeAutoResult(previousDefects));
    const autoResult = computeAutoResult(newDefects);
    const autoLevel = resultLevel(autoResult);
    const currentLevel = resultLevel(formik.values.resultType);
    const wasTa = formik.values.resultType === 'extraordinary_inspection_ta';

    if (currentLevel < autoLevel || formik.values.resultType === 'ok') {
      // Escalate — always follows the auto-computed minimum upward.
      formik.setFieldValue('resultType', autoResult);
    } else if (autoLevel < oldAutoLevel && currentLevel === oldAutoLevel) {
      // Defects were removed and the current result was itself auto-derived
      // (not manually escalated beyond it) — follow the downgrade too
      // (LJVIS2-72 §4, UC-11: "result resets to Tehniliselt korras
      // (or to the OV level, if OV are still present)"). Preserve the TA
      // variant of extraordinary_inspection if it was selected and still applicable.
      formik.setFieldValue(
        'resultType',
        wasTa && autoLevel >= 1 ? 'extraordinary_inspection_ta' : autoResult,
      );
    }

    // MSI302 is only ever auto-ADDED here (LJVIS2-72 §4: "MSI302 automaatselt
    // märgitud" when driving_ban is triggered). Auto-removal is intentionally
    // not implemented — removing it once set requires control_form.edit_locked
    // (an administrator, per Eda Rembel's 21.07.2026 13:13 comment) and is done
    // manually via the violations checklist (see toggleViolation).
    const currentViolations = formik.values.violations ?? [];
    if (autoResult === 'driving_ban' && !currentViolations.includes(DRIVING_BAN_VIOLATION_CODE)) {
      formik.setFieldValue('violations', [...currentViolations, DRIVING_BAN_VIOLATION_CODE]);
    }
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
    formError,
    compoundFormKeyOverride,
  };
}
