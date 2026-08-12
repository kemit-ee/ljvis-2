import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { TransportInterruptionForm } from '../../types';
import type { AddressFieldsValue } from '../../components/shared/AddressFields';
import {
  confirmTransportInterruptionForm,
  saveTransportInterruptionForm,
} from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';

const DEFAULT_TERMINATION_CONDITION =
  'KUNI VEO KATKESTAMISE ALUSE ÄRALANGEMISENI.';

const SIHTNUMBER_MAX_LENGTH = 10;

// RESQL returns JSONB columns cast via `::text`, so array fields arrive over
// the wire as a JSON-encoded string (e.g. '["autovs_51_lg3_p1"]'), not as a
// real array. Normalize defensively regardless of which shape we get.
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
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

export function useTransportInterruptionForm(
  form: TransportInterruptionForm | undefined,
  onSaved: (id?: string) => void,
  compoundFormKey?: number,
) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const pendingConfirm = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();
  const { getValue } = useClassifiers();

  const counties = useMemo(
    () =>
      getByCode('EHAK')
        .filter((e) => e.parentKey === null)
        .map((e) => ({ id: e.classifierValueKey, name: e.name })),
    [getByCode],
  );

  // LJVIS2-74 §4: "Päis" is pre-filled from the officer's PPA prefecture
  // (classifier PPA_STRUCTURE_UNIT_ADDRESS, keyed by structural unit) only
  // when creating a brand-new sub-form; left blank if no match exists.
  const defaultHeaderText = useMemo(() => {
    if (form) return form.headerText ?? '';
    const structuralUnit = authUser?.structuralunit;
    if (!structuralUnit) return '';
    return getValue('PPA_STRUCTURE_UNIT_ADDRESS', structuralUnit)?.name ?? '';
  }, [form, authUser?.structuralunit, getValue]);

  const validationSchema = Yup.object({
    residencePostalCode: Yup.string().max(
      SIHTNUMBER_MAX_LENGTH,
      t('forms.transport_interruption.validation.postalCodeMaxLength', {
        max: SIHTNUMBER_MAX_LENGTH,
      }),
    ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      compoundFormKey: form?.compoundFormKey ?? compoundFormKey,
      subFormNumber: form?.subFormNumber ?? '',
      version: form?.version ?? 1,
      status: form?.status ?? 'saved',
      headerText: defaultHeaderText,
      residenceCountry: form?.residenceCountry ?? 'EE',
      residenceRegion: form?.residenceRegion ?? '',
      residenceCity: form?.residenceCity ?? '',
      residenceAddressLine: form?.residenceAddressLine ?? '',
      residencePostalCode: form?.residencePostalCode ?? '',
      interruptionReason: form?.interruptionReason ?? '',
      legalBases: toStringArray(form?.legalBases),
      terminationCondition:
        form?.terminationCondition ?? DEFAULT_TERMINATION_CONDITION,
      personApplications: form?.personApplications ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const isConfirming = pendingConfirm.current;
        pendingConfirm.current = false;
        const payload = {
          ...values,
          id: form?.id,
          legalBases: JSON.stringify(values.legalBases ?? []),
        } as unknown as TransportInterruptionForm;
        const result = isConfirming
          ? await confirmTransportInterruptionForm(payload)
          : await saveTransportInterruptionForm(payload);
        onSaved((result[0] as { id?: string })?.id);
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`forms.transport_interruption.validation.api.${code}`),
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

  const addressValue: AddressFieldsValue = {
    countryCode: formik.values.residenceCountry,
    county: formik.values.residenceRegion,
    city: formik.values.residenceCity,
    street: formik.values.residenceAddressLine,
    postalCode: formik.values.residencePostalCode,
  };

  const setAddressValue = (value: AddressFieldsValue) => {
    formik.setFieldValue('residenceCountry', value.countryCode);
    formik.setFieldValue('residenceRegion', value.county);
    formik.setFieldValue('residenceCity', value.city);
    formik.setFieldValue('residenceAddressLine', value.street);
    formik.setFieldValue('residencePostalCode', value.postalCode);
  };

  const toggleLegalBasis = (code: string, checked: boolean) => {
    const current = formik.values.legalBases ?? [];
    formik.setFieldValue(
      'legalBases',
      checked ? [...current, code] : current.filter((c) => c !== code),
    );
  };

  return {
    formik,
    counties,
    addressValue,
    setAddressValue,
    toggleLegalBasis,
    triggerConfirm,
    formError,
  };
}
