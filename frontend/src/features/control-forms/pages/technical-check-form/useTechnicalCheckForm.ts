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
  PartSummaryStatus,
  PartDefectEntry,
  PartSeverity,
} from '../../types';
import { confirmTechnicalCheckForm, saveTechnicalCheckForm, publishTechnicalCheckForm } from '../../api';
import { sanitizeText } from '../../formTextUtils';
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

/** Reads a saved snapshot's partsSummary — old rows still carry the legacy
 * `{partCode, status}` shape (3-way radio), new ones carry
 * `{partCode, checked, hasDefect}`. Normalizes to the new shape so a form
 * saved before this change still displays correctly. */
function normalizePartSummary(
  raw: (Partial<PartSummaryEntry> & { status?: PartSummaryStatus })[],
): PartSummaryEntry[] {
  return raw.map((p) => {
    if (typeof p.checked === 'boolean' || typeof p.hasDefect === 'boolean') {
      return { partCode: p.partCode!, checked: !!p.checked, hasDefect: !!p.hasDefect };
    }
    return {
      partCode: p.partCode!,
      checked: p.status === 'checked' || p.status === 'non_compliant',
      hasDefect: p.status === 'non_compliant',
    };
  });
}

/** Auto-generated "Märkused" line prefix for a given part — lets a later
 * defect edit find and replace exactly this part's own lines without
 * touching other parts' lines or the officer's own free text (p8/p14). */
const noteLinePrefix = (partCode: string) => `${partCode}: `;

function syncPartNoteLines(notes: string, partCode: string, lines: string[]): string {
  const prefix = noteLinePrefix(partCode);
  const otherLines = (notes ?? '').split('\n').filter((l) => l && !l.startsWith(prefix));
  return [...otherLines, ...lines].join('\n').slice(0, 2000);
}

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
        const entries = Array.isArray(parsed)
          ? parsed
          : parts.map((p) => ({ partCode: p.code, checked: false, hasDefect: false }));
        return normalizePartSummary(entries);
      })(),
      partsDefects: (() => {
        const raw = form?.partsDefects;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (Array.isArray(parsed) ? parsed : []) as PartDefectEntry[];
      })(),
      resultType: form?.resultType ?? 'ok',
      resultTransportInterruption: form?.resultTransportInterruption ?? false,
      transportInterruptionAutovs5131: form?.transportInterruptionAutovs5131 ?? false,
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
          proceedingReferenceNumber: sanitizeText(values.proceedingReferenceNumber),
          trailerRegNr: sanitizeText(values.trailerRegNr),
          notes: sanitizeText(values.notes),
          enforcementDecision: sanitizeText(values.enforcementDecision),
          proceedingClosureBasis: sanitizeText(values.proceedingClosureBasis),
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
   * result-type / violations updates (auto-escalation / -downgrade, auto
   * add-or-remove MSI302 to match the FINAL result_type). Returned as a
   * partial so callers can fold it into ONE atomic setValues — multiple
   * sequential formik.setFieldValue calls clobber each other (each reads the
   * same stale values snapshot), which is why the defect/summary updates
   * were being lost. */
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

    const finalResultType = changes.resultType ?? values.resultType;
    const currentViolations = values.violations ?? [];
    const hasDrivingBan = currentViolations.includes(DRIVING_BAN_VIOLATION_CODE);
    if (finalResultType === 'driving_ban' && !hasDrivingBan) {
      changes.violations = [...currentViolations, DRIVING_BAN_VIOLATION_CODE];
    } else if (finalResultType !== 'driving_ban' && hasDrivingBan) {
      // MSI302 is fully automatic — dropping below driving_ban must always
      // clear it too, whether the drop came from removing the triggering
      // defect or from a manual result-type change (15 ettepanekut p10).
      changes.violations = currentViolations.filter((c) => c !== DRIVING_BAN_VIOLATION_CODE);
    }
    return changes;
  };

  /** Applies the outcome of the "Ei vasta nõuetele" defect-selection modal for
   * one part. Selecting a defect always forces checked=true for that part —
   * "hasDefect" implies "checked", and checked never reverts to false once a
   * defect exists (15 ettepanekut p2, EL aruande "Kontrollitud" nõue). */
  const applyPartDefects = (partCode: string, selected: { defectCode: string; severity: PartSeverity }[]) => {
    const v = formik.values;
    const previousDefects = v.partsDefects ?? [];
    const otherDefects = previousDefects.filter((d) => d.partCode !== partCode);
    const newDefects: PartDefectEntry[] = [
      ...otherDefects,
      ...selected.map((s) => ({ partCode, defectCode: s.defectCode, severity: s.severity })),
    ];

    const prevSummary = v.partsSummary ?? [];
    const nextEntry: PartSummaryEntry = { partCode, checked: true, hasDefect: selected.length > 0 };
    const summary = prevSummary.some((p) => p.partCode === partCode)
      ? prevSummary.map((p) => (p.partCode === partCode ? nextEntry : p))
      : [...prevSummary, nextEntry];

    // Replace (not append) this part's own auto-generated note lines with the
    // current selection, so removed/changed defects don't leave stale text
    // behind (15 ettepanekut p8/p14).
    const defectNames = defectsByPartKey.get(
      parts.find((p) => p.code === partCode)?.classifierValueKey ?? -1,
    ) ?? [];
    const noteLines = selected.map((s) => {
      const defect = defectNames.find((d) => d.code === s.defectCode);
      return `${noteLinePrefix(partCode)}${defect?.name ?? s.defectCode} – ${s.severity}`;
    });
    const notes = syncPartNoteLines(v.notes ?? '', partCode, noteLines);

    // Single atomic update — see computeResultChanges note.
    formik.setValues({
      ...v,
      partsDefects: newDefects,
      partsSummary: summary,
      notes,
      ...computeResultChanges(v, previousDefects, newDefects),
    });
  };

  /** Sets "Kontrollitud" directly (not via the defect modal). Cannot be
   * turned off while the part has a recorded defect — hasDefect always
   * implies checked (15 ettepanekut p2). */
  const setPartChecked = (partCode: string, checked: boolean) => {
    const v = formik.values;
    const prevSummary = v.partsSummary ?? [];
    const existing = prevSummary.find((p) => p.partCode === partCode);
    if (!checked && existing?.hasDefect) return;
    const nextEntry: PartSummaryEntry = { partCode, checked, hasDefect: existing?.hasDefect ?? false };
    const summary = existing
      ? prevSummary.map((p) => (p.partCode === partCode ? nextEntry : p))
      : [...prevSummary, nextEntry];
    formik.setFieldValue('partsSummary', summary);
  };

  /** Removes a single defect from the results table (LJVIS2-72 §4, UC-11/UC-12).
   * "Kontrollitud" stays on (15 ettepanekut p2 — the part was checked, that
   * doesn't stop being true because a defect got corrected/removed). The
   * defect's auto-generated "Märkused" line is removed along with it
   * (p8/p14) — remaining defects for the part get their lines rewritten so
   * nothing stale is left over. */
  const removeDefect = (partCode: string, defectCode: string) => {
    const v = formik.values;
    const previousDefects = v.partsDefects ?? [];
    const newDefects = previousDefects.filter(
      (d) => !(d.partCode === partCode && d.defectCode === defectCode),
    );
    const remainingForPart = newDefects.filter((d) => d.partCode === partCode);

    const prevSummary = v.partsSummary ?? [];
    const existing = prevSummary.find((p) => p.partCode === partCode);
    const nextEntry: PartSummaryEntry = {
      partCode,
      checked: existing?.checked ?? true,
      hasDefect: remainingForPart.length > 0,
    };
    const summary = existing
      ? prevSummary.map((p) => (p.partCode === partCode ? nextEntry : p))
      : [...prevSummary, nextEntry];

    const defectNames = defectsByPartKey.get(
      parts.find((p) => p.code === partCode)?.classifierValueKey ?? -1,
    ) ?? [];
    const noteLines = remainingForPart.map((d) => {
      const defect = defectNames.find((dd) => dd.code === d.defectCode);
      return `${noteLinePrefix(partCode)}${defect?.name ?? d.defectCode} – ${d.severity}`;
    });
    const notes = syncPartNoteLines(v.notes ?? '', partCode, noteLines);

    formik.setValues({
      ...v,
      partsDefects: newDefects,
      partsSummary: summary,
      notes,
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
    const currentViolations = formik.values.violations ?? [];
    if (resultType === 'ok') {
      formik.setFieldValue('violations', []);
      formik.setFieldValue('proceedingType', '');
      formik.setFieldValue('proceedingReferenceNumber', '');
    } else if (resultType === 'driving_ban') {
      if (!currentViolations.includes(DRIVING_BAN_VIOLATION_CODE)) {
        formik.setFieldValue('violations', [...currentViolations, DRIVING_BAN_VIOLATION_CODE]);
      }
    } else if (currentViolations.includes(DRIVING_BAN_VIOLATION_CODE)) {
      // Leaving driving_ban (to extraordinary_inspection[_ta]) always clears
      // MSI302 too — it is fully automatic (15 ettepanekut p10).
      formik.setFieldValue(
        'violations',
        currentViolations.filter((c) => c !== DRIVING_BAN_VIOLATION_CODE),
      );
    }
  };

  const isDrivingBanTriggerActive = resultLevel(computeAutoResult(formik.values.partsDefects ?? [])) >= 2;

  const toggleViolation = (code: string, checked: boolean) => {
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
    setPartChecked,
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
