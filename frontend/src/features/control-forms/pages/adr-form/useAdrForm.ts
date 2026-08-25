import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type {
  AdrForm,
  AdrDriverAssistant,
  AdrAddress,
  DangerousGoodEntry,
  AdrInfringementEntry,
  AdrInfringementCheckStatus,
} from '../../types';
import { confirmAdrForm, saveAdrForm, publishAdrForm } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider.tsx';

const NOTES_MAX_LENGTH = 4000;

export function createAdrValidationSchema(t: (key: string, opts?: Record<string, unknown>) => string) {
  return Yup.object({
    proceedingReferenceNumber: Yup.string().when('proceedingType', {
      is: (proceedingType: string) => !!proceedingType,
      then: (schema) => schema.required(t('forms.adr.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    exemptionAdrProvision: Yup.string().when('exemptionApplied', {
      is: true,
      then: (schema) => schema.required(t('forms.adr.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    dangerousGoods: Yup.array().of(
      Yup.object({
        quantity: Yup.string().test(
          'no-trailing-separator',
          t('forms.adr.dangerousGoods.quantityInvalid'),
          (val) => !val || !/[.,]$/.test(val),
        ),
      }),
    ),
    notes: Yup.string().max(
      NOTES_MAX_LENGTH,
      t('forms.adr.validation.notesMaxLength', { max: NOTES_MAX_LENGTH }),
    ),
  });
}

// RESQL returns JSONB columns cast via `::text`, so object/array fields
// arrive over the wire as JSON-encoded strings, not real objects/arrays.
// Normalize defensively regardless of which shape we get.
function toObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function useAdrForm(
  form: AdrForm | undefined,
  onSaved: (id?: string) => void,
  compoundFormKey?: number,
  onPublished?: () => void,
) {
  const { t } = useTranslation();
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);
  const pendingCompoundFormKey = useRef<number | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();


  const counties = useMemo(
    () =>
      getByCode('EHAK')
        .filter((e) => e.parentKey === null)
        .map((e) => ({ id: e.classifierValueKey, name: e.name })),
    [getByCode],
  );

  const validationSchema = createAdrValidationSchema(t);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      compoundFormKey: form?.compoundFormKey ?? compoundFormKey,
      subFormNumber: form?.subFormNumber ?? '',
      version: form?.version ?? 1,
      status: form?.status ?? 'saved',
      driverAssistant: toObject<AdrDriverAssistant>(form?.driverAssistant, {}),
      driverAdrCertificateNumber: form?.driverAdrCertificateNumber ?? '',
      crewAdrCertificateNumber: form?.crewAdrCertificateNumber ?? '',
      assistantAdrCertificateNumber: form?.assistantAdrCertificateNumber ?? '',
      lastLoadAddress: toObject<AdrAddress>(form?.lastLoadAddress, { countryCode: 'EE' }),
      lastLoadDate: form?.lastLoadDate ?? '',
      nextLoadAddress: toObject<AdrAddress>(form?.nextLoadAddress, { countryCode: 'EE' }),
      dangerousGoods: toArray<DangerousGoodEntry>(form?.dangerousGoods),
      exemptionApplied: form?.exemptionApplied ?? false,
      exemptionAdrProvision: form?.exemptionAdrProvision ?? '',
      containerType: form?.containerType ?? '',
      infringements: toArray<AdrInfringementEntry>(form?.infringements),
      otherViolations: form?.otherViolations ?? '',
      resultType: form?.resultType ?? 'ok',
      proceedingType: form?.proceedingType ?? '',
      proceedingReferenceNumber: form?.proceedingReferenceNumber ?? '',
      correctiveMeasures: toArray<string>(form?.correctiveMeasures),
      sealOpened: form?.sealOpened ?? false,
      sealOpenedDate: form?.sealOpenedDate ?? '',
      sealInstalledDate: form?.sealInstalledDate ?? '',
      notes: form?.notes ?? '',
      enforcementDecision: form?.enforcementDecision ?? '',
      proceedingClosureBasis: form?.proceedingClosureBasis ?? '',
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
          await publishAdrForm(form.id);
          onPublished?.();
          return;
        }
        const isReconfirmedEdit = !isConfirming && form?.status === 'confirmed';
        const nextStatus = isConfirming || isReconfirmedEdit ? 'confirmed' : 'saved';
        const overrideKey = pendingCompoundFormKey.current;
        pendingCompoundFormKey.current = undefined;
        // Empty driver-assistant / address blocks are sent as null so the
        // backend stores them as SQL NULL rather than an empty-but-present
        // JSON object (LJVIS2-141 §4.3/4.5/4.6: these blocks are optional).
        const isBlank = (obj: Record<string, unknown>) =>
          Object.values(obj).every((v) => v == null || v === '');
        const payload = {
          ...values,
          status: nextStatus,
          id: form?.id ?? '',
          compoundFormKey: overrideKey ?? values.compoundFormKey,
          driverAssistant: isBlank(values.driverAssistant)
            ? ''
            : JSON.stringify(values.driverAssistant),
          lastLoadAddress: isBlank(values.lastLoadAddress)
            ? ''
            : JSON.stringify(values.lastLoadAddress),
          nextLoadAddress: isBlank(values.nextLoadAddress)
            ? ''
            : JSON.stringify(values.nextLoadAddress),
          dangerousGoods: JSON.stringify(values.dangerousGoods ?? []),
          // Rows the user never touched (checkStatus still unset) are not persisted.
          infringements: JSON.stringify(
            (values.infringements ?? []).filter((e) => !!e.checkStatus),
          ),
          correctiveMeasures: JSON.stringify(values.correctiveMeasures ?? []),
        } as unknown as AdrForm;
        const result = isConfirming
          ? await confirmAdrForm(payload)
          : await saveAdrForm(payload);
        onSaved((result[0] as { id?: string })?.id);
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`forms.adr.validation.api.${code}`),
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

  const setDriverAssistant = (value: AdrDriverAssistant) =>
    formik.setFieldValue('driverAssistant', value);

  const setLastLoadAddress = (value: AdrAddress) =>
    formik.setFieldValue('lastLoadAddress', value);

  const setNextLoadAddress = (value: AdrAddress) =>
    formik.setFieldValue('nextLoadAddress', value);

  const addDangerousGood = () => {
    const current = formik.values.dangerousGoods ?? [];
    formik.setFieldValue('dangerousGoods', [
      ...current,
      { unNumber: '', packagingGroup: '', quantity: '', unitCode: '' },
    ]);
  };

  const updateDangerousGood = (index: number, patch: Partial<DangerousGoodEntry>) => {
    const current = formik.values.dangerousGoods ?? [];
    formik.setFieldValue(
      'dangerousGoods',
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeDangerousGood = (index: number) => {
    const current = formik.values.dangerousGoods ?? [];
    formik.setFieldValue('dangerousGoods', current.filter((_, i) => i !== index));
  };

  const toggleCorrectiveMeasure = (code: string, checked: boolean) => {
    const current = formik.values.correctiveMeasures ?? [];
    formik.setFieldValue(
      'correctiveMeasures',
      checked ? [...current, code] : current.filter((c) => c !== code),
    );
  };

  const setInfringement = (
    classifierValueKey: number,
    patch: Partial<AdrInfringementEntry>,
  ) => {
    const current = formik.values.infringements ?? [];
    const existing = current.find((e) => e.classifierValueKey === classifierValueKey);
    if (existing) {
      formik.setFieldValue(
        'infringements',
        current.map((e) =>
          e.classifierValueKey === classifierValueKey ? { ...e, ...patch } : e,
        ),
      );
    } else {
      formik.setFieldValue('infringements', [
        ...current,
        { classifierValueKey, checkStatus: '' as AdrInfringementCheckStatus, ...patch },
      ]);
    }
  };

  const getInfringement = (classifierValueKey: number): AdrInfringementEntry =>
    (formik.values.infringements ?? []).find(
      (e) => e.classifierValueKey === classifierValueKey,
    ) ?? { classifierValueKey, checkStatus: '' };

  return {
    formik,
    pendingCompoundFormKey,
    triggerConfirm,
    triggerPublish,
    formError,
    counties,
    setDriverAssistant,
    setLastLoadAddress,
    setNextLoadAddress,
    addDangerousGood,
    updateDangerousGood,
    removeDangerousGood,
    toggleCorrectiveMeasure,
    setInfringement,
    getInfringement,
  };
}
