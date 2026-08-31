import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { GoodReputeForm } from '../../types';
import { saveGoodReputeForm, confirmGoodReputeForm, publishGoodReputeForm } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';

export function useGoodReputeForm(
  form: GoodReputeForm | undefined,
  onSaved: (id?: string) => void,
  onConfirmed?: () => void,
  onPublished?: () => void,
) {
  const { t } = useTranslation();
  const isEdit = !!form;
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validationSchema = Yup.object({
    personalCode: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    firstName: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    lastName: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    dateOfBirth: Yup.string()
      .required(t('forms.good_repute.validation.required'))
      .test(
        'not-future',
        t('forms.good_repute.validation.api.future_date_not_allowed'),
        (value) => !value || new Date(value) <= new Date(),
      ),
    certificateNumber: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    certificateIssueDate: Yup.string()
      .required(t('forms.good_repute.validation.required'))
      .test(
        'not-future',
        t('forms.good_repute.validation.api.future_date_not_allowed'),
        (value) => !value || new Date(value) <= new Date(),
      ),
    certificateCountryCode: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    fitnessStatus: Yup.string().required(
      t('forms.good_repute.validation.required'),
    ),
    unfitFromDate: Yup.string().when('fitnessStatus', {
      is: 'unfit',
      then: (schema) => schema.required(t('forms.good_repute.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    unfitUntilDate: Yup.string().when('fitnessStatus', {
      is: 'unfit',
      then: (schema) =>
        schema
          .required(t('forms.good_repute.validation.required'))
          .test(
            'after-from-date',
            t('forms.good_repute.validation.api.must_be_after_unfit_from_date'),
            (value, ctx) =>
              !value || !ctx.parent.unfitFromDate || new Date(value) > new Date(ctx.parent.unfitFromDate),
          ),
      otherwise: (schema) => schema.optional(),
    }),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      formNumber: form?.formNumber ?? '',
      version: form?.version ?? 1,
      personalCode: form?.personalCode ?? '',
      firstName: form?.firstName ?? '',
      lastName: form?.lastName ?? '',
      dateOfBirth: form?.dateOfBirth ?? '',
      placeOfBirth: form?.placeOfBirth ?? '',
      certificateNumber: form?.certificateNumber ?? '',
      certificateIssueDate: form?.certificateIssueDate ?? '',
      certificateCountryCode: form?.certificateCountryCode ?? '',
      fitnessStatus: form?.fitnessStatus ?? 'fit',
      unfitFromDate: form?.unfitFromDate ?? '',
      unfitUntilDate: form?.unfitUntilDate ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const isConfirming = pendingConfirm.current;
        const isPublishing = pendingPublish.current;
        pendingConfirm.current = false;
        pendingPublish.current = false;
        const payload = {
          ...values,
          id: form?.id ?? '',
        } as unknown as GoodReputeForm;
        const result = isConfirming
          ? await confirmGoodReputeForm(payload)
          : form?.id && isPublishing
            ? await publishGoodReputeForm(form.id)
            : await saveGoodReputeForm(payload);
        if (isConfirming && onConfirmed) {
          onConfirmed();
        } else if (isPublishing && onPublished) {
          onPublished();
        } else {
          onSaved((result[0] as { id?: string })?.id);
        }
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`forms.good_repute.validation.api.${code}`),
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

  return {
    formik,
    isEdit,
    triggerConfirm,
    triggerPublish,
    formError,
  };
}
