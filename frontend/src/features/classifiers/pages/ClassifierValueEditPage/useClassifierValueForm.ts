import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { ClassifierValue } from '../../types.ts';
import { insertClassifierValue, updateClassifierValue } from '../../api.ts';
import { applyValidationError } from '../../../../shared/api/errors.ts';
import { toIsoDate } from '../../../../hooks/dateUtils.ts';
import { sanitizeText } from '../../../../hooks/formTextUtils';

export function useClassifierValueForm(
  classifierId: string | undefined,
  onSaved: () => void | Promise<void>,
  existingValue?: ClassifierValue | null,
) {
  const { t } = useTranslation();
  const isEdit = !!existingValue;

  const validationSchema = Yup.object({
    code: Yup.string().required(t('classifiers.validation.required')),
    name: Yup.string().required(t('classifiers.validation.required')),
    validFrom: Yup.string().required(t('classifiers.validation.required')),
    // Kehtib nii lisamisel kui muutmisel: andmebaasi piirang ck_cv_period
    // nõuab, et kehtivuse lõpp oleks rangelt hilisem kui algus.
    validUntil: Yup.string()
      .nullable()
      .test(
        'is-after-start',
        t('classifiers.validation.endBeforeStart'),
        function (value) {
          const { validFrom } = this.parent;
          if (!value || !validFrom) return true;
          return toIsoDate(value) > toIsoDate(validFrom);
        },
      ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: existingValue?.classifierValueId ?? '',
      code: existingValue?.code ?? '',
      name: existingValue?.name ?? '',
      validFrom: existingValue?.validFrom ?? '',
      validUntil: existingValue?.validUntil ?? '',
      formTypes: [...(existingValue?.formTypes ?? [])].sort(),
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        if (!classifierId) return;
        const trimmedValues = {
          ...values,
          validFrom: toIsoDate(values.validFrom),
          validUntil: toIsoDate(values.validUntil),
        };
        if (isEdit && existingValue) {
          await updateClassifierValue({
            classifierId: classifierId,
            classifierValueId: existingValue.classifierValueId,
            code: trimmedValues.code,
            name: trimmedValues.name,
            validFrom: trimmedValues.validFrom,
            validUntil: trimmedValues.validUntil,
            formTypes: trimmedValues.formTypes,
          });
        } else {
          await insertClassifierValue({
            classifierId: classifierId,
            code: sanitizeText(trimmedValues.code),
            name: sanitizeText(trimmedValues.name),
            validFrom: trimmedValues.validFrom,
            validUntil: trimmedValues.validUntil,
            formTypes: trimmedValues.formTypes,
          });
        }
        await onSaved();
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`classifiers.validation.api.${code}`),
          )
        ) {
          console.error('Save failed', e);
        }
      }
    },
  });

  return { formik };
}
